/**
 * Plain-language explanations of validator outcomes, shared by the Guide
 * and by in-context help on the Live Desk. Keep in sync with the codes
 * emitted by src/domain/validators.ts, src/domain/patch.ts and the engine.
 */

export interface ReasonHelp {
  title: string;
  meaning: string;
  whatToDo: string;
}

export const BLOCK_REASON_HELP: Record<string, ReasonHelp> = {
  quote_not_found: {
    title: "Quote not in the filing",
    meaning: "The model cited text that does not appear word-for-word in the excerpt it pointed to.",
    whatToDo: "Nothing — the claim was discarded. If the underlying point matters, check the filing yourself or re-run.",
  },
  number_unsupported: {
    title: "Number not supported by the evidence",
    meaning:
      "A figure in “What changed” is not in the cited evidence and cannot be derived from it (by millions→billions rescaling or year-over-year growth on one table row).",
    whatToDo: "Treat the claim as unverified. Re-run, or compute it yourself from the filing.",
  },
  evidence_handle_unknown: {
    title: "Cited a source that was not provided",
    meaning: "The model referenced an excerpt that was not part of this run.",
    whatToDo: "Nothing — the proposal was discarded.",
  },
  evidence_missing: {
    title: "Evidence could not be resolved",
    meaning: "A citation points to an excerpt that no longer exists in the run's sources.",
    whatToDo: "Re-run the analysis.",
  },
  no_evidence: {
    title: "No evidence cited",
    meaning: "Every proposal must cite at least one excerpt; this one cited none.",
    whatToDo: "Nothing — unsupported proposals never reach review.",
  },
  patch_not_allowlisted: {
    title: "Change type not allowed",
    meaning: "The proposal tried to edit a thesis field that Delphi does not let the model change (for example a pillar title).",
    whatToDo: "If the change is warranted, make it through your normal thesis process.",
  },
  patch_noop: {
    title: "Change would do nothing",
    meaning: "The proposed value equals the thesis's current value.",
    whatToDo: "Nothing — no-op changes are rejected so versions only record real changes.",
  },
  patch_target_missing: {
    title: "Target not in the thesis",
    meaning: "The proposal referenced a pillar, forecast, risk or question ID that does not exist in the approved thesis.",
    whatToDo: "Nothing — the proposal was discarded.",
  },
  target_unknown: {
    title: "Target not in the thesis",
    meaning: "The proposal is about an object that does not exist in the approved thesis version.",
    whatToDo: "Nothing — the proposal was discarded.",
  },
  patch_value_invalid: {
    title: "Invalid value",
    meaning: "The new value is not allowed for that field (for example an unknown status).",
    whatToDo: "Nothing — the proposal was discarded.",
  },
  patch_value_json_invalid: {
    title: "Malformed change",
    meaning: "The model's proposed value could not be read.",
    whatToDo: "Nothing — the proposal was discarded.",
  },
  stale_version: {
    title: "Thesis has moved on",
    meaning: "The proposal was generated against an older approved thesis version.",
    whatToDo: "Re-run the analysis against the current thesis.",
  },
  schema_invalid: {
    title: "Malformed proposal",
    meaning: "The proposal was missing required fields.",
    whatToDo: "Nothing — the proposal was discarded.",
  },
};

export function reasonHelp(code: string): ReasonHelp | undefined {
  return BLOCK_REASON_HELP[code];
}
