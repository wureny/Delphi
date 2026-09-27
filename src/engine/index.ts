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
export { ClaudeAnalysisModel, DEFAULT_ANALYSIS_MODEL } from "./analysis/claude-model";
export { OpenAIAnalysisModel, DEFAULT_OPENAI_MODEL } from "./analysis/openai-model";
export { AnalysisModelError } from "./analysis/model-errors";
export { createAnalysisModel, resolveModelSelection } from "./analysis/select-model";
export type { AnalysisProvider, ModelSelection } from "./analysis/select-model";
