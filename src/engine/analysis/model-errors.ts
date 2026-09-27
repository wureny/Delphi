/** Provider-neutral failures surfaced by AnalysisModel implementations. */
export class AnalysisModelError extends Error {
  constructor(
    readonly code: "refusal" | "truncated" | "unparseable" | "provider_error",
    message: string,
  ) {
    super(message);
    this.name = "AnalysisModelError";
  }
}
