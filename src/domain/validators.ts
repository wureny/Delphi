/**
 * Deterministic proposal validators.
 *
 * Model (or fixture) output is untrusted until it passes these checks. Each
 * validator returns typed messages; the transition gateway aggregates them
 * and fails closed on any error.
 */
import type {
  Id,
  SourceDocument,
  SourceExcerpt,
  StateTransition,
  ThesisDeltaProposal,
  ThesisSnapshot,
  ValidationMessage,
} from "./types";
import { validateSemanticPatch } from "./patch";
import { proposalSchema } from "./schemas";

export interface EvidenceContext {
  resolveExcerpt: (excerptId: Id) => { excerpt: SourceExcerpt; document: SourceDocument } | undefined;
  /** Source IDs currently unavailable (e.g. transcript in the degraded case). */
  unavailableSourceIds: ReadonlySet<Id>;
}

const msg = (
  validator: ValidationMessage["validator"],
  severity: ValidationMessage["severity"],
  code: string,
  message: string,
  objectRefs?: Id[],
): ValidationMessage => ({ validator, severity, code, message, objectRefs });

/** Schema validation — fixture and model output both pass through Zod. */
export function validateSchema(proposal: unknown): ValidationMessage[] {
  const parsed = proposalSchema.safeParse(proposal);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) =>
    msg("schema", "error", "schema_invalid", `${issue.path.join(".")}: ${issue.message}`),
  );
}

/** Every factual proposal must cite at least one evidence excerpt. */
export function validateCitationCoverage(proposal: ThesisDeltaProposal): ValidationMessage[] {
  if (proposal.evidenceRefs.length === 0) {
    return [msg("citation", "error", "no_evidence", "Proposal cites no evidence and cannot be reviewed.")];
  }
  return [];
}

/** All evidence refs must resolve, and their sources must be available. */
export function validateEvidenceRefs(
  proposal: ThesisDeltaProposal,
  ctx: EvidenceContext,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  for (const ref of proposal.evidenceRefs) {
    const resolved = ctx.resolveExcerpt(ref);
    if (!resolved) {
      messages.push(
        msg("evidence_refs", "error", "evidence_missing", `Evidence reference "${ref}" does not resolve to a known excerpt.`, [ref]),
      );
      continue;
    }
    if (ctx.unavailableSourceIds.has(resolved.document.sourceId)) {
      messages.push(
        msg(
          "evidence_refs",
          "error",
          "evidence_unavailable",
          `Evidence "${ref}" belongs to unavailable source "${resolved.document.title}". The claim fails closed.`,
          [ref, resolved.document.sourceId],
        ),
      );
    }
  }
  return messages;
}

/**
 * Numbers stated in `whatChanged` must be present in the cited evidence's
 * extracted numeric values (or be a derivable midpoint of a cited range).
 * Period tokens like FY2026 / Q2 are not treated as claims.
 */
export function validateNumbers(
  proposal: ThesisDeltaProposal,
  ctx: EvidenceContext,
): ValidationMessage[] {
  const stated = extractNumbers(proposal.whatChanged);
  if (stated.length === 0) return [];

  const evidenceValues: number[] = [];
  for (const ref of proposal.evidenceRefs) {
    const resolved = ctx.resolveExcerpt(ref);
    for (const nv of resolved?.excerpt.numericValues ?? []) {
      evidenceValues.push(nv.value);
    }
  }
  const derivable = new Set<number>(evidenceValues);
  for (const a of evidenceValues) {
    for (const b of evidenceValues) {
      derivable.add(round1((a + b) / 2)); // midpoints of cited ranges
    }
  }

  return stated
    .filter((n) => !derivable.has(round1(n)))
    .map((n) =>
      msg(
        "numeric",
        "error",
        "number_unsupported",
        `The value ${n} in "what changed" is not present in (or derivable from) the cited evidence.`,
      ),
    );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function extractNumbers(text: string): number[] {
  const out: number[] = [];
  const re = /(?<![A-Za-z0-9])(\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out.push(Number(match[1]));
  }
  return out;
}

/** The proposal must target objects that exist in the approved snapshot. */
export function validateReferenceScope(
  proposal: ThesisDeltaProposal,
  thesis: ThesisSnapshot,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  if (proposal.caseId !== thesis.caseId) {
    messages.push(
      msg("reference_scope", "error", "case_mismatch", `Proposal case "${proposal.caseId}" does not match thesis case "${thesis.caseId}".`),
    );
  }
  if (proposal.targetObjectId) {
    const known = [
      ...thesis.pillars.map((p) => p.pillarId),
      ...thesis.forecasts.map((f) => f.forecastId),
      ...thesis.risks.map((r) => r.riskId),
      ...thesis.openQuestions.map((q) => q.questionId),
      ...thesis.catalysts.map((c) => c.catalystId),
    ];
    if (!known.includes(proposal.targetObjectId)) {
      messages.push(
        msg(
          "reference_scope",
          "error",
          "target_unknown",
          `Target object "${proposal.targetObjectId}" does not exist in thesis v${thesis.version}.`,
          [proposal.targetObjectId],
        ),
      );
    }
  }
  return messages;
}

/** The proposal must reference the currently approved thesis version. */
export function validateCurrentVersion(
  proposal: ThesisDeltaProposal,
  thesis: ThesisSnapshot,
): ValidationMessage[] {
  if (proposal.fromThesisVersion !== thesis.version) {
    return [
      msg(
        "current_version",
        "error",
        "stale_version",
        `Proposal was generated against thesis v${proposal.fromThesisVersion}, but v${thesis.version} is now approved. Re-run the analysis.`,
      ),
    ];
  }
  return [];
}

/** A proposal already applied by a transition must not apply twice. */
export function validateIdempotency(
  proposal: ThesisDeltaProposal,
  transitions: StateTransition[],
): ValidationMessage[] {
  const applied = transitions.some(
    (t) => t.status === "applied" && t.proposalIds.includes(proposal.proposalId),
  );
  if (applied) {
    return [
      msg(
        "idempotency",
        "info",
        "already_applied",
        `Proposal "${proposal.proposalId}" was already applied. Duplicate approval is a no-op.`,
        [proposal.proposalId],
      ),
    ];
  }
  return [];
}

/** Allowed-semantic-patch validation, re-exported for the gateway. */
export function validateAllowedSemanticPatch(
  thesis: ThesisSnapshot,
  proposal: ThesisDeltaProposal,
): ValidationMessage[] {
  const result = validateSemanticPatch(thesis, proposal.proposedPatch);
  return result.messages;
}

/**
 * Full pre-review validation of a proposal against the current state.
 * Used by the Run Observatory (validation events) and by the gateway.
 */
export function validateProposal(
  proposal: ThesisDeltaProposal,
  thesis: ThesisSnapshot,
  transitions: StateTransition[],
  ctx: EvidenceContext,
): ValidationMessage[] {
  return [
    ...validateSchema(proposal),
    ...validateCitationCoverage(proposal),
    ...validateEvidenceRefs(proposal, ctx),
    ...validateNumbers(proposal, ctx),
    ...validateReferenceScope(proposal, thesis),
    ...validateCurrentVersion(proposal, thesis),
    ...validateIdempotency(proposal, transitions),
    ...validateAllowedSemanticPatch(thesis, proposal),
  ];
}
