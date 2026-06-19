import type {
  ChangeSummary,
  Classification,
  DecisionInput,
  DecisionTraceEntry,
  Evidence,
  WorkspaceData,
} from "./types";

const advicePattern = /\b(should i|buy|sell|price target|target price|double by|exit now|enter now)\b/i;

export function classifyEvidence(item: Evidence, data: WorkspaceData): Classification {
  if (advicePattern.test(`${item.headline} ${item.excerpt}`)) {
    return {
      assetId: item.classification.assetId,
      thesisId: null,
      assumptionId: null,
      impact: "unclear",
      confidence: "low",
      source: "ai",
      rationale: "Price-target or trade-framed content is not attached to a thesis; Delphi does not provide buy/sell advice.",
    };
  }

  const thesis = data.theses.find((candidate) => candidate.id === item.classification.thesisId);
  if (!thesis) {
    return {
      assetId: null,
      thesisId: null,
      assumptionId: null,
      impact: "unclear",
      confidence: "low",
      source: "ai",
      rationale: "No tracked thesis has a credible link to this item, so it is surfaced for review rather than attached.",
    };
  }

  return item.classification;
}

export function refusalForAdvice(prompt: string): string | null {
  if (!advicePattern.test(prompt)) return null;
  return "Delphi does not provide buy/sell recommendations or price targets. It can organise the evidence, surface counter-evidence, and help you record your own decision rationale.";
}

export function summarizeChanges(data: WorkspaceData, thesisId: string): ChangeSummary {
  return data.whatChanged[thesisId];
}

export function assembleDecisionTrace(input: DecisionInput, nowIso: string): DecisionTraceEntry {
  if (!input.rationale.trim()) {
    throw new Error("Decision rationale is required and must be written by the user.");
  }

  return {
    id: `decision-${Date.now()}`,
    at: nowIso,
    actor: input.actor,
    decision: input.decision,
    priorConviction: input.priorConviction,
    newConviction: input.newConviction,
    evidenceIds: input.evidenceIds,
    changedAssumptions: input.changedAssumptions,
    rationale: input.rationale.trim(),
    sources: input.sources,
    followUp: input.followUp.trim(),
    unresolved: input.unresolved,
  };
}
