export interface StructuredGenerationRequest {
  schemaName: string;
  schemaDescription: string;
  schema: Record<string, unknown>;
  developerPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface StructuredGenerationResult<TOutput> {
  output: TOutput;
  provider: string;
  model: string;
  rawText: string;
}

export interface StructuredModelProvider {
  readonly providerName: string;
  readonly modelName: string;
  generateObject<TOutput>(
    request: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult<TOutput>>;
}
