/**
 * Re-verify a saved live run before it can be reviewed.
 *
 * A run file (from the CLI, the eval, or another browser) is untrusted input:
 * someone could edit a quote, a number, or a patch. Importing re-runs every
 * deterministic check against the run's own stored sources; any failure
 * rejects the whole file. Pure and network-free, so it is safe in the browser.
 */
import { z } from "zod";
import { domainEventSchema, proposalSchema, runBundleSchema, sourceBundleSchema, thesisSnapshotSchema } from "@/domain/schemas";
import { validateProposal } from "@/domain/validators";
import { sha256Hex } from "@/domain/hash";
import { quoteAppearsIn } from "./quotes";
import { evidenceContextFor, type LiveRunResult } from "./run";

const liveRunResultSchema = z.object({
  resultVersion: z.literal(1),
  promptVersion: z.string(),
  run: runBundleSchema,
  event: domainEventSchema,
  baselineThesis: thesisSnapshotSchema,
  proposals: z.array(proposalSchema),
  blockedProposals: z.array(z.object({ proposal: proposalSchema, messages: z.array(z.unknown()) })),
  proposalWarnings: z.record(z.string(), z.array(z.unknown())),
  citedQuotes: z.record(z.string(), z.array(z.object({ excerptId: z.string(), quote: z.string() }))),
  eventSummary: z.string(),
  coverageGaps: z.array(z.object({ objectId: z.string(), reason: z.string() })),
  sources: z.array(sourceBundleSchema),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheReadInputTokens: z.number(),
    cacheCreationInputTokens: z.number(),
  }),
});

export type VerifyOutcome = { ok: true; result: LiveRunResult } | { ok: false; errors: string[] };

export function verifyLiveRunResult(raw: unknown): VerifyOutcome {
  const parsed = liveRunResultSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const result = parsed.data as unknown as LiveRunResult;
  const errors: string[] = [];

  for (const bundle of result.sources) {
    for (const ex of bundle.excerpts) {
      if (ex.contentHash !== contentHashOfText(ex.text)) errors.push(`Excerpt ${ex.excerptId} text does not match its hash.`);
    }
  }

  const ctx = evidenceContextFor(result.sources);
  const textById = new Map(result.sources.flatMap((b) => b.excerpts.map((e) => [e.excerptId, e.text] as const)));
  const proposalIds = new Set(result.proposals.map((p) => p.proposalId));

  for (const p of result.proposals) {
    if (p.fromThesisVersion !== result.baselineThesis.version || p.caseId !== result.baselineThesis.caseId) {
      errors.push(`${p.proposalId}: not generated against the stored baseline thesis.`);
    }
    const quotes = result.citedQuotes[p.proposalId] ?? [];
    if (quotes.length === 0) errors.push(`${p.proposalId}: no verified quotes.`);
    for (const q of quotes) {
      if (!p.evidenceRefs.includes(q.excerptId) || !quoteAppearsIn(q.quote, textById.get(q.excerptId) ?? "")) {
        errors.push(`${p.proposalId}: quote not found in cited excerpt ${q.excerptId}.`);
      }
    }
    for (const m of validateProposal(p, result.baselineThesis, [], ctx)) {
      if (m.severity === "error") errors.push(`${p.proposalId}: ${m.code} — ${m.message}`);
    }
  }

  const declared = result.run.workflowRun.outputProposalIds;
  if (declared.length !== proposalIds.size || declared.some((id) => !proposalIds.has(id))) {
    errors.push("Run output proposal IDs do not match the reviewable proposals.");
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, result };
}

function contentHashOfText(text: string): string {
  return `sha256:${sha256Hex(text)}`;
}
