import type {
  StructuredGenerationRequest,
  StructuredGenerationResult,
  StructuredModelProvider,
} from "./model-provider.ts";

interface OpenAIChatCompletionsResponse {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export interface OpenAIChatCompletionsProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export class OpenAIChatCompletionsProvider implements StructuredModelProvider {
  readonly providerName = "openai";
  readonly modelName: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: OpenAIChatCompletionsProviderOptions) {
    this.apiKey = options.apiKey;
    this.modelName = options.model;
    this.baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): OpenAIChatCompletionsProvider {
    const apiKey = env.OPENAI_API_KEY;
    const model = env.OPENAI_MODEL;
    const baseUrl = env.OPENAI_BASE_URL;

    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY.");
    }

    if (!model) {
      throw new Error("Missing OPENAI_MODEL.");
    }

    return new OpenAIChatCompletionsProvider({
      apiKey,
      model,
      ...(baseUrl ? { baseUrl } : {}),
    });
  }

  async generateObject<TOutput>(
    request: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult<TOutput>> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          {
            role: "developer",
            content: request.developerPrompt,
          },
          {
            role: "user",
            content: request.userPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            description: request.schemaDescription,
            strict: true,
            schema: request.schema,
          },
        },
        ...(typeof request.temperature === "number"
          ? {
              temperature: request.temperature,
            }
          : {}),
      }),
    });

    const payload = (await response.json()) as OpenAIChatCompletionsResponse;

    if (!response.ok) {
      throw new Error(
        `OpenAI chat completion failed: ${payload.error?.message ?? response.statusText}`,
      );
    }

    const rawText = extractMessageContent(payload);

    try {
      return {
        output: JSON.parse(rawText) as TOutput,
        provider: this.providerName,
        model: this.modelName,
        rawText,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown JSON parse failure.";
      throw new Error(`OpenAI returned non-JSON structured output: ${message}`);
    }
  }
}

function extractMessageContent(response: OpenAIChatCompletionsResponse): string {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .filter((part) => typeof part.text === "string" && part.text.length > 0)
      .map((part) => part.text)
      .join("");

    if (text.length > 0) {
      return text;
    }
  }

  throw new Error("OpenAI response did not include assistant message content.");
}
