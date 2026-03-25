import type {
  StructuredGenerationRequest,
  StructuredGenerationResult,
  StructuredModelProvider,
  StreamingCallbacks,
} from "./model-provider.ts";
import { extractCompletedSectionContents } from "./partial-json.ts";

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

interface OpenAIChatCompletionsStreamChunk {
  choices?: Array<{
    delta?: {
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
      body: JSON.stringify(buildRequestBody(this.modelName, request)),
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

  async generateObjectStream<TOutput>(
    request: StructuredGenerationRequest,
    callbacks: StreamingCallbacks,
  ): Promise<StructuredGenerationResult<TOutput>> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequestBody(this.modelName, request, true)),
    });

    if (!response.ok) {
      const payload = (await response.json()) as OpenAIChatCompletionsResponse;

      throw new Error(
        `OpenAI chat completion failed: ${payload.error?.message ?? response.statusText}`,
      );
    }

    if (!response.body) {
      return this.generateObject<TOutput>(request);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const emittedSectionKeys = new Set<string>();
    const sectionKeys = readSectionKeys(request);
    let buffer = "";
    let rawText = "";
    const consumeFrame = async (frame: string): Promise<void> => {
      const data = readSseData(frame);

      if (!data || data === "[DONE]") {
        return;
      }

      const chunk = JSON.parse(data) as OpenAIChatCompletionsStreamChunk;

      if (chunk.error?.message) {
        throw new Error(`OpenAI chat completion failed: ${chunk.error.message}`);
      }

      const deltaText = extractDeltaContent(chunk);

      if (!deltaText) {
        return;
      }

      rawText += deltaText;

      if (sectionKeys.length === 0 || !callbacks.onSectionReady) {
        return;
      }

      const completedSections = extractCompletedSectionContents(
        rawText,
        sectionKeys,
        emittedSectionKeys,
      );

      for (const section of completedSections) {
        await callbacks.onSectionReady(section.sectionKey, section.content);
      }
    };

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        await consumeFrame(frame);
      }
    }

    buffer += decoder.decode();

    if (buffer.trim().length > 0) {
      const finalFrames = buffer.split("\n\n").filter((frame) => frame.trim().length > 0);

      for (const frame of finalFrames) {
        await consumeFrame(frame);
      }
    }

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

function buildRequestBody(
  modelName: string,
  request: StructuredGenerationRequest,
  stream = false,
): Record<string, unknown> {
  return {
    model: modelName,
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
    ...(stream ? { stream: true } : {}),
  };
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

function extractDeltaContent(chunk: OpenAIChatCompletionsStreamChunk): string {
  const content = chunk.choices?.[0]?.delta?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => typeof part.text === "string" && part.text.length > 0)
      .map((part) => part.text)
      .join("");
  }

  return "";
}

function readSseData(frame: string): string | null {
  const lines = frame
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());

  if (lines.length === 0) {
    return null;
  }

  return lines.join("\n");
}

function readSectionKeys(request: StructuredGenerationRequest): string[] {
  const schemaProperties = request.schema.properties;

  if (!isRecord(schemaProperties)) {
    return [];
  }

  const sections = schemaProperties.sections;

  if (!isRecord(sections) || !isRecord(sections.properties)) {
    return [];
  }

  return Object.keys(sections.properties);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
