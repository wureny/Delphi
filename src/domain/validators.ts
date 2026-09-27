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
 * Numbers stated in `whatChanged` must be present in the cited evidence, or be
 * deterministically derivable from it:
 *  - midpoints of cited ranges;
 *  - unit rescaling of a cited value (millions → billions, 1 decimal);
 *  - growth between two adjacent figures on the same cited line (a table row
 *    such as "Revenue | $90,007 | $76,441"), rounded to 0 or 1 decimal.
 * Dates and calendar years are period labels, not claims.
 */
export function validateNumbers(
  proposal: ThesisDeltaProposal,
  ctx: EvidenceContext,
): ValidationMessage[] {
  const stated = extractNumbers(stripPeriodLabels(proposal.whatChanged));
  if (stated.length === 0) return [];

  const evidenceValues: number[] = [];
  const derivable = new Set<number>();
  for (const ref of proposal.evidenceRefs) {
    const resolved = ctx.resolveExcerpt(ref);
    if (!resolved) continue;
    for (const nv of resolved.excerpt.numericValues ?? []) {
      evidenceValues.push(nv.value);
    }
    for (const line of resolved.excerpt.text.split("\n")) {
      const row = extractNumbers(line);
      for (let i = 0; i + 1 < row.length; i++) {
        const [a, b] = [row[i]!, row[i + 1]!];
        if (a > 0 && b > 0) {
          for (const g of [(a / b - 1) * 100, (b / a - 1) * 100]) {
            derivable.add(Math.round(Math.abs(g)));
            derivable.add(round1(Math.abs(g)));
          }
        }
      }
    }
  }
  for (const a of evidenceValues) {
    derivable.add(round1(a));
    derivable.add(round1(a / 1000));
    derivable.add(round1(a / 1_000_000));
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

const MONTHS =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

/** Remove dates ("June 30, 2026", "2026-07-29") and calendar years, which label periods rather than claim values. */
export function stripPeriodLabels(text: string): string {
  return text
    .replace(new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2}(?:,?\\s+\\d{4})?`, "g"), " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/(?<![\d.,$])\b(?:19|20)\d{2}\b(?![\d%]|[.,]\d)/g, " ");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Extract numeric claims from prose. Thousands separators are honored
 * ("35,766" is one number), and tokens glued to letters (FY2026, Q2) are
 * treated as labels, not claims. Shared with live-source ingestion so stated
 * numbers and evidence numbers are tokenized identically.
 */
export function extractNumbers(text: string): number[] {
  const out: number[] = [];
  const re = /(?<![A-Za-z0-9.,])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out.push(Number(match[1]!.replace(/,/g, "")));
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
