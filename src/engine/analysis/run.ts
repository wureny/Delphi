/**
 * Earnings-to-Thesis live run.
 *
 * Model output is an untrusted proposal. This orchestrator assigns every
 * identifier deterministically, verifies quotes, then runs the same
 * validators the fixture path uses. Proposals that fail any error-level check
 * are blocked and reported — never silently dropped, never shown as reviewable.
 */
import type {
  DomainEvent,
  Id,
  ModelRouteReceipt,
  PatchOperation,
  RequiredReviewerRole,
  RunEvent,
  RunEventType,
  SourceBundle,
  SourceDocument,
  SourceExcerpt,
  ThesisDeltaProposal,
  ThesisSnapshot,
  ValidationMessage,
  WorkflowRunBundle,
} from "@/domain/types";
import { validateProposal, type EvidenceContext } from "@/domain/validators";
import { contentHash } from "@/domain/hash";
import type { ModelAnalysis, ModelProposal } from "./model-output";
import { buildUserPrompt, PROMPT_VERSION, SYSTEM_PROMPT, type ExcerptHandleMap } from "./prompt";
import { quoteAppearsIn } from "./quotes";
import { thesisToSourceBundle } from "./thesis-source";

export const WORKFLOW_VERSION = "0.4.0-live";

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface AnalysisModelResult {
  analysis: ModelAnalysis;
  route: ModelRouteReceipt;
  usage: ModelUsage;
  /** True when the provider served the request from a fallback model. */
  servedByFallback: boolean;
}

/** Provider boundary. The Claude implementation lives in `claude-model.ts`. */
export interface AnalysisModel {
  analyze(input: { system: string; user: string; signal?: AbortSignal }): Promise<AnalysisModelResult>;
}

export interface LiveAnalysisRequest {
  tenantId: Id;
  caseId: Id;
  companyName: string;
  ticker: string;
  thesis: ThesisSnapshot;
  event: DomainEvent;
  /** External evidence for the event (e.g. the SEC earnings release). */
  sources: SourceBundle[];
  runId?: Id;
  signal?: AbortSignal;
  now?: () => Date;
}

export interface BlockedProposal {
  proposal: ThesisDeltaProposal;
  messages: ValidationMessage[];
}

export interface LiveRunResult {
  resultVersion: 1;
  promptVersion: string;
  run: WorkflowRunBundle;
  event: DomainEvent;
  baselineThesis: ThesisSnapshot;
  /** Proposals that passed every error-level validator and may be reviewed. */
  proposals: ThesisDeltaProposal[];
  /** Proposals the validators rejected, with the reasons. */
  blockedProposals: BlockedProposal[];
  /** Warnings attached to reviewable proposals, keyed by proposalId. */
  proposalWarnings: Record<Id, ValidationMessage[]>;
  /** Verbatim quotes per proposal, keyed by proposalId then excerptId. */
  citedQuotes: Record<Id, Array<{ excerptId: Id; quote: string }>>;
  eventSummary: string;
  coverageGaps: Array<{ objectId: string; reason: string }>;
  sources: SourceBundle[];
  usage: ModelUsage;
}

function requiredRoleFor(materiality: ModelProposal["materiality"]): RequiredReviewerRole {
  return materiality === "high" || materiality === "critical" ? "pm" : "analyst";
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "item";
}

interface ConvertedProposal {
  proposal: ThesisDeltaProposal;
  quotes: Array<{ excerptId: Id; quote: string }>;
  preMessages: ValidationMessage[];
}

function convertProposal(
  raw: ModelProposal,
  index: number,
  ctx: { request: LiveAnalysisRequest; runId: Id; handles: ExcerptHandleMap; createdAt: string },
): ConvertedProposal {
  const { request, runId, handles, createdAt } = ctx;
  const preMessages: ValidationMessage[] = [];
  const quotes: Array<{ excerptId: Id; quote: string }> = [];
  const evidenceRefs: Id[] = [];

  for (const ev of raw.evidence) {
    const canonical = handles.toCanonical.get(ev.excerptId.trim());
    if (!canonical) {
      preMessages.push({
        validator: "evidence_refs",
        severity: "error",
        code: "evidence_handle_unknown",
        message: `Cited excerpt "${ev.excerptId}" was not in the provided sources.`,
      });
      continue;
    }
    if (!evidenceRefs.includes(canonical)) evidenceRefs.push(canonical);
    quotes.push({ excerptId: canonical, quote: ev.quote });
    const text = handles.textByCanonical.get(canonical) ?? "";
    if (!quoteAppearsIn(ev.quote, text)) {
      preMessages.push({
        validator: "citation",
        severity: "error",
        code: "quote_not_found",
        message: `Quoted text does not appear in excerpt ${ev.excerptId}: "${ev.quote.slice(0, 120)}"`,
        objectRefs: [canonical],
      });
    }
  }

  const proposedPatch: PatchOperation[] = [];
  for (const op of raw.patch) {
    let value: unknown;
    try {
      value = JSON.parse(op.valueJson);
    } catch {
      preMessages.push({
        validator: "semantic_patch",
        severity: "error",
        code: "patch_value_json_invalid",
        message: `Patch value for "${op.path}" is not valid JSON.`,
      });
      continue;
    }
    if (op.op === "add" && op.path === "/openQuestions/-" && value && typeof value === "object") {
      // The engine, not the model, owns ownership and provenance fields.
      const q = value as Record<string, unknown>;
      value = {
        questionId: typeof q.questionId === "string" && q.questionId ? q.questionId : `question_${slug(String(q.question ?? raw.headline))}`,
        question: q.question,
        ownerUserId: request.thesis.ownerUserId,
        status: "open",
        evidenceRefs,
      };
    }
    proposedPatch.push({ op: op.op, path: op.path, value });
  }

  const proposal: ThesisDeltaProposal = {
    proposalId: `proposal_${runId.replace(/^run_/, "")}_${String(index + 1).padStart(2, "0")}`,
    tenantId: request.tenantId,
    caseId: request.caseId,
    runId,
    fromThesisVersion: request.thesis.version,
    deltaType: raw.deltaType,
    targetObjectType: raw.targetObjectType,
    ...(raw.targetObjectId ? { targetObjectId: raw.targetObjectId } : {}),
    headline: raw.headline,
    whatChanged: raw.whatChanged,
    againstOurView: raw.againstOurView,
    whyItMatters: raw.whyItMatters,
    uncertainties: raw.uncertainties,
    recommendedFollowUp: raw.recommendedFollowUp,
    evidenceRefs,
    findingRefs: [],
    confidence: raw.confidence,
    materiality: raw.materiality,
    requiredReviewerRole: requiredRoleFor(raw.materiality),
    proposedPatch,
    status: "proposed",
    createdAt,
  };
  return { proposal, quotes, preMessages };
}

export function evidenceContextFor(bundles: SourceBundle[]): EvidenceContext {
  const index = new Map<Id, { excerpt: SourceExcerpt; document: SourceDocument }>();
  for (const b of bundles) for (const e of b.excerpts) index.set(e.excerptId, { excerpt: e, document: b.sourceDocument });
  return { resolveExcerpt: (id) => index.get(id), unavailableSourceIds: new Set() };
}

export async function runEarningsToThesis(
  request: LiveAnalysisRequest,
  model: AnalysisModel,
  onEvent?: (event: RunEvent) => void,
): Promise<LiveRunResult> {
  const now = request.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const runId = request.runId ?? `run_live_${request.ticker.toLowerCase()}_${startedAt.replace(/\D/g, "").slice(0, 14)}`;
  const events: RunEvent[] = [];
  const emit = (eventType: RunEventType, publicMessage: string, objectRefs: Id[] = [], actorType: RunEvent["actorType"] = "system") => {
    const event: RunEvent = {
      runEventId: `${runId}_ev_${String(events.length + 1).padStart(3, "0")}`,
      runId,
      eventType,
      occurredAt: now().toISOString(),
      actorType,
      actorId: actorType === "agent" ? "agent_earnings_to_thesis" : "system",
      publicMessage,
      objectRefs,
    };
    events.push(event);
    onEvent?.(event);
  };

  const thesisBundle = thesisToSourceBundle(request.thesis);
  const allBundles = [thesisBundle, ...request.sources];

  emit("run_created", `Live Earnings-to-Thesis run created for ${request.companyName} against approved thesis v${request.thesis.version}.`);
  for (const bundle of request.sources) {
    emit("source_loaded", `Loaded ${bundle.sourceDocument.title} (${bundle.excerpts.length} citable excerpts).`, [bundle.sourceDocument.sourceId]);
  }
  const hasTranscript = request.sources.some((b) => b.sourceDocument.sourceType === "transcript");

  const { text: userPrompt, handles } = buildUserPrompt(request.thesis, thesisBundle, request.sources, {
    companyName: request.companyName,
    ticker: request.ticker,
    eventTitle: request.event.title,
  });

  emit("agent_started", "Analysis model started: reconcile reported results against the approved thesis.", [], "agent");
  const result = await model.analyze({ system: SYSTEM_PROMPT, user: userPrompt, signal: request.signal });
  const createdAt = now().toISOString();

  const ctx = evidenceContextFor(allBundles);
  const proposals: ThesisDeltaProposal[] = [];
  const blockedProposals: BlockedProposal[] = [];
  const proposalWarnings: Record<Id, ValidationMessage[]> = {};
  const citedQuotes: Record<Id, Array<{ excerptId: Id; quote: string }>> = {};

  result.analysis.proposals.forEach((raw, i) => {
    const { proposal, quotes, preMessages } = convertProposal(raw, i, { request, runId, handles, createdAt });
    citedQuotes[proposal.proposalId] = quotes;
    const messages = [...preMessages, ...validateProposal(proposal, request.thesis, [], ctx)];
    const errors = messages.filter((m) => m.severity === "error");
    if (errors.length > 0) {
      blockedProposals.push({ proposal: { ...proposal, status: "rejected" }, messages });
      emit(
        "validation_failed",
        `Blocked "${proposal.headline}": ${errors.map((e) => e.code).join(", ")}.`,
        [proposal.proposalId],
      );
      return;
    }
    proposals.push(proposal);
    const warnings = messages.filter((m) => m.severity !== "error");
    if (warnings.length > 0) proposalWarnings[proposal.proposalId] = warnings;
    emit("proposal_created", `Proposal ready for review: ${proposal.headline}.`, [proposal.proposalId], "agent");
  });

  emit(
    "validation_passed",
    `${proposals.length} of ${result.analysis.proposals.length} proposals passed schema, quote, evidence, numeric, scope, version, and patch validation.`,
    proposals.map((p) => p.proposalId),
  );

  const degradedReasons = [];
  if (!hasTranscript) {
    degradedReasons.push({
      code: "transcript_not_ingested",
      message: "Earnings call transcript was not part of this run; management commentary and Q&A are not reflected.",
      affectedObjectRefs: result.analysis.coverageGaps.map((g) => g.objectId),
      recoverable: true,
    });
    emit("degraded_mode_entered", "Transcript not ingested: claims requiring management commentary are listed as coverage gaps, not guessed.");
  }
  if (proposals.length > 0) {
    emit("review_required", `${proposals.length} proposals await human review.`, proposals.map((p) => p.proposalId));
  }
  const completedAt = now().toISOString();
  emit("run_completed", `Run completed with ${proposals.length} reviewable and ${blockedProposals.length} blocked proposals.`);

  const run: WorkflowRunBundle = {
    fixtureVersion: "live",
    schemaVersion: "0.3.0",
    synthetic: false,
    workflowRun: {
      runId,
      tenantId: request.tenantId,
      caseId: request.caseId,
      domainEventId: request.event.domainEventId,
      workflowId: "earnings_to_thesis",
      workflowVersion: WORKFLOW_VERSION,
      status: degradedReasons.length > 0 ? "degraded" : "completed",
      mode: "live",
      startedAt,
      completedAt,
      modelRoutes: [result.route],
      skillVersions: { earnings_to_thesis: PROMPT_VERSION, validators: WORKFLOW_VERSION },
      sourceRefs: allBundles.map((b) => b.sourceDocument.sourceId),
      degradedReasons,
      outputProposalIds: proposals.map((p) => p.proposalId),
      contextSetHash: contentHash(allBundles.map((b) => b.sourceDocument.contentHash)),
    },
    events,
  };

  return {
    resultVersion: 1,
    promptVersion: PROMPT_VERSION,
    run,
    event: request.event,
    baselineThesis: request.thesis,
    proposals,
    blockedProposals,
    proposalWarnings,
    citedQuotes,
    eventSummary: result.analysis.eventSummary,
    coverageGaps: result.analysis.coverageGaps,
    sources: allBundles,
    usage: result.usage,
  };
}
