/**
 * Claude implementation of the AnalysisModel boundary.
 *
 * Server-side only: the API key never reaches a browser bundle. Output is
 * constrained by structured outputs and then re-validated by the engine.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { modelAnalysisSchema } from "./model-output";
import { AnalysisModelError } from "./model-errors";
import type { AnalysisModel, AnalysisModelResult } from "./run";

export const DEFAULT_ANALYSIS_MODEL = "claude-opus-5";

export interface ClaudeModelOptions {
  apiKey?: string;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  client?: Anthropic;
}

export class ClaudeAnalysisModel implements AnalysisModel {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly effort: NonNullable<ClaudeModelOptions["effort"]>;

  constructor(options: ClaudeModelOptions = {}) {
    this.client = options.client ?? new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {});
    this.model = options.model ?? DEFAULT_ANALYSIS_MODEL;
    this.effort = options.effort ?? "high";
  }

  async analyze(input: { system: string; user: string; signal?: AbortSignal }): Promise<AnalysisModelResult> {
    let message;
    try {
      const stream = this.client.beta.messages.stream(
        {
          model: this.model,
          max_tokens: 64000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: this.effort, format: betaZodOutputFormat(modelAnalysisSchema) },
          system: [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: input.user }],
        },
        { signal: input.signal },
      );
      message = await stream.finalMessage();
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new AnalysisModelError("provider_error", `Model provider error ${error.status ?? ""}: ${error.message}`);
      }
      throw error;
    }

    if (message.stop_reason === "refusal") {
      throw new AnalysisModelError("refusal", "The model declined this request; no proposals were generated.");
    }
    if (message.stop_reason === "max_tokens") {
      throw new AnalysisModelError("truncated", "The model output was truncated before completion; no partial proposals are used.");
    }
    const analysis = message.parsed_output;
    if (!analysis) {
      throw new AnalysisModelError("unparseable", "The model output did not match the analysis schema.");
    }

    const servedByFallback = (message.usage.iterations ?? []).some((it) => it.type === "fallback_message");
    return {
      analysis,
      servedByFallback,
      route: {
        provider: "anthropic",
        model: message.model,
        endpointOwner: "delphi",
        retentionPolicy: "provider_default",
        trainingUse: "disabled",
      },
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadInputTokens: message.usage.cache_read_input_tokens ?? 0,
        cacheCreationInputTokens: message.usage.cache_creation_input_tokens ?? 0,
      },
    };
  }
}
