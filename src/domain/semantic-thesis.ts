/**
 * Canonical projection of the governed thesis content.
 *
 * Versioning and recording metadata are intentionally excluded: a transition
 * is meaningful only when the investment content itself changes. Keep this
 * projection shared by transition validation and ledger diffing so the two
 * surfaces cannot disagree about whether a change occurred.
 */
import type { ThesisSnapshot } from "./types";
import { contentHash } from "./hash";

export interface SemanticThesisProjection {
  thesisId: ThesisSnapshot["thesisId"];
  caseId: ThesisSnapshot["caseId"];
  summary: ThesisSnapshot["summary"];
  ownerUserId: ThesisSnapshot["ownerUserId"];
  pillars: ThesisSnapshot["pillars"];
  forecasts: ThesisSnapshot["forecasts"];
  catalysts: ThesisSnapshot["catalysts"];
  risks: ThesisSnapshot["risks"];
  openQuestions: ThesisSnapshot["openQuestions"];
}

export function semanticThesisProjection(thesis: ThesisSnapshot): SemanticThesisProjection {
  return {
    thesisId: thesis.thesisId,
    caseId: thesis.caseId,
    summary: thesis.summary,
    ownerUserId: thesis.ownerUserId,
    pillars: thesis.pillars,
    forecasts: thesis.forecasts,
    catalysts: thesis.catalysts,
    risks: thesis.risks,
    openQuestions: thesis.openQuestions,
  };
}

export function semanticThesisHash(thesis: ThesisSnapshot): string {
  return contentHash(semanticThesisProjection(thesis));
}

export function hasSemanticThesisChange(before: ThesisSnapshot, after: ThesisSnapshot): boolean {
  return semanticThesisHash(before) !== semanticThesisHash(after);
}
