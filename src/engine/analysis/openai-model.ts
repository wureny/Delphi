/**
 * OpenAI implementation of the AnalysisModel boundary (Responses API).
 *
 * Same contract as the Claude adapter: strict structured output, then the
 * engine re-validates everything. `store: false` keeps prompts and outputs
 * out of provider-side response storage.
 */
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { modelAnalysisSchema } from "./model-output";
import { AnalysisModelError } from "./model-errors";
import type { AnalysisModel, AnalysisModelResult } from "./run";

export const DEFAULT_OPENAI_MODEL = "gpt-5.5";

export interface OpenAIModelOptions {
  apiKey?: string;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh";
  client?: OpenAI;
}

export class OpenAIAnalysisModel implements AnalysisModel {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly effort: NonNullable<OpenAIModelOptions["effort"]>;

  constructor(options: OpenAIModelOptions = {}) {
    this.client = options.client ?? new OpenAI(options.apiKey ? { apiKey: options.apiKey } : {});
    this.model = options.model ?? DEFAULT_OPENAI_MODEL;
    this.effort = options.effort ?? "high";
  }

  async analyze(input: { system: string; user: string; signal?: AbortSignal }): Promise<AnalysisModelResult> {
    let response;
    try {
      response = await this.client.responses.parse(
        {
          model: this.model,
          instructions: input.system,
          input: input.user,
          reasoning: { effort: this.effort },
          text: { format: zodTextFormat(modelAnalysisSchema, "earnings_to_thesis_analysis") },
          store: false,
        },
        { signal: input.signal, timeout: 15 * 60 * 1000 },
      );
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new AnalysisModelError("provider_error", `Model provider error ${error.status ?? ""}: ${error.message}`);
      }
      throw error;
    }

    const refused = response.output.some(
      (item) => item.type === "message" && item.content.some((c) => c.type === "refusal"),
    );
    if (refused) {
      throw new AnalysisModelError("refusal", "The model declined this request; no proposals were generated.");
    }
    if (response.status === "incomplete") {
      throw new AnalysisModelError(
        "truncated",
        `The model output was incomplete (${response.incomplete_details?.reason ?? "unknown"}); no partial proposals are used.`,
      );
    }
    const analysis = response.output_parsed;
    if (!analysis) {
      throw new AnalysisModelError("unparseable", "The model output did not match the analysis schema.");
    }

    return {
      analysis,
      servedByFallback: false,
      route: {
        provider: "openai",
        model: response.model,
        endpointOwner: "delphi",
        retentionPolicy: "store_disabled",
        trainingUse: "disabled",
      },
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        cacheReadInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
        cacheCreationInputTokens: 0,
      },
    };
  }
}
