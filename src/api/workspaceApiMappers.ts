import type { WorkspaceApiError, WorkspaceApiErrorCode, WorkspaceApiFailure, WorkspaceApiResult, WorkspaceApiSuccess } from "./workspaceApiTypes";

const forbiddenRuntimeTerms = [
  /\bneo4j\b/i,
  /\bcypher\b/i,
  /\bnode\b/i,
  /\bedge\b/i,
  /\bopenbb raw\b/i,
  /\blast_price\b/i,
  /\bprevious_close\b/i,
  /\b(model|system|user|raw)[-_ ]?prompt\b/i,
  /\bprompt[-_ ]?tokens\b/i,
  /\btoken\b/i,
  /\bchain[-_ ]?of[-_ ]?thought\b/i,
  /\bprivate reasoning\b/i,
  /\bsecret\b/i,
];

export function apiSuccess<T>(data: T): WorkspaceApiSuccess<T> {
  return {
    ok: true,
    data: cloneApiPayload(data),
  };
}

export function apiFailure(code: WorkspaceApiErrorCode, message: string): WorkspaceApiFailure {
  return {
    ok: false,
    error: {
      code,
      message: safeErrorMessage(message),
    },
  };
}

export function unwrapApiResult<T>(result: WorkspaceApiResult<T>): T {
  if (result.ok) return cloneApiPayload(result.data);
  throw new WorkspaceApiClientError(result.error);
}

export function assertProductSafePayload(value: unknown): void {
  const text = JSON.stringify(value);
  if (!text) return;
  for (const pattern of forbiddenRuntimeTerms) {
    if (pattern.test(text)) {
      throw new Error("Runtime API payload contains implementation vocabulary.");
    }
  }
}

export class WorkspaceApiClientError extends Error {
  constructor(readonly apiError: WorkspaceApiError) {
    super(apiError.message);
    this.name = "WorkspaceApiClientError";
  }
}

export function normalizeRuntimeError(error: unknown): WorkspaceApiFailure {
  const message = error instanceof Error ? error.message : "Runtime request failed.";
  const lower = message.toLowerCase();
  if (lower.includes("not found")) return apiFailure("not_found", message);
  if (lower.includes("human rationale") || lower.includes("validation")) return apiFailure("validation_failed", message);
  if (lower.includes("provider") || lower.includes("unavailable")) return apiFailure("provider_unavailable", message);
  return apiFailure("unknown", "Runtime request failed.");
}

export function cloneApiPayload<T>(value: T): T {
  if (value === undefined) return value;
  const cloned = JSON.parse(JSON.stringify(value)) as T;
  assertProductSafePayload(cloned);
  return cloned;
}

function safeErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("stack") ||
    lower.includes("cypher") ||
    lower.includes("neo4j") ||
    lower.includes("openbb raw") ||
    lower.includes("prompt") ||
    lower.includes("token") ||
    lower.includes("secret") ||
    lower.includes("chain-of-thought")
  ) {
    return "Runtime request failed safely without exposing implementation details.";
  }
  return message;
}
