/**
 * Live analysis engine — server-side entry points.
 *
 * Nothing under `src/engine` may be imported by client components: it holds
 * provider credentials and makes network calls.
 */
export { EdgarClient, EdgarError, releaseToSourceBundle, filingToDomainEvent, sourceIdForFiling } from "./sec/edgar";
export type { EarningsFiling, EarningsRelease } from "./sec/edgar";
export { runEarningsToThesis, WORKFLOW_VERSION } from "./analysis/run";
export type { AnalysisModel, LiveRunResult, LiveAnalysisRequest, BlockedProposal } from "./analysis/run";
export { ClaudeAnalysisModel, AnalysisModelError, DEFAULT_ANALYSIS_MODEL } from "./analysis/claude-model";
