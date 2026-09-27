/**
 * Provider selection from configuration. Raw environment values enter only
 * here; callers receive an AnalysisModel and never see credentials.
 */
import { ClaudeAnalysisModel, DEFAULT_ANALYSIS_MODEL } from "./claude-model";
import { DEFAULT_OPENAI_MODEL, OpenAIAnalysisModel } from "./openai-model";
import type { AnalysisModel } from "./run";

export type AnalysisProvider = "openai" | "anthropic";
export type AnalysisEffort = "low" | "medium" | "high" | "xhigh";

export interface ModelSelection {
  provider: AnalysisProvider;
  model: string;
  effort: AnalysisEffort;
}

export function resolveModelSelection(
  env: Record<string, string | undefined>,
  overrides: Partial<ModelSelection> = {},
): ModelSelection {
  const requested = (overrides.provider ?? env.DELPHI_LIVE_MODEL_PROVIDER)?.trim().toLowerCase();
  const provider: AnalysisProvider =
    requested === "anthropic" || requested === "openai"
      ? requested
      : env.OPENAI_API_KEY
        ? "openai"
        : "anthropic";
  const model =
    overrides.model ?? env.DELPHI_LIVE_MODEL_NAME?.trim() ?? (provider === "openai" ? DEFAULT_OPENAI_MODEL : DEFAULT_ANALYSIS_MODEL);
  const effort = overrides.effort ?? (env.DELPHI_LIVE_MODEL_EFFORT?.trim() as AnalysisEffort | undefined) ?? "high";
  return { provider, model, effort };
}

export function createAnalysisModel(selection: ModelSelection): AnalysisModel {
  return selection.provider === "openai"
    ? new OpenAIAnalysisModel({ model: selection.model, effort: selection.effort })
    : new ClaudeAnalysisModel({ model: selection.model, effort: selection.effort });
}
