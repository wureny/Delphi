import { apiFailure } from "./workspaceApiMappers";
import type { WorkspaceApiErrorCode, WorkspaceApiResult } from "./workspaceApiTypes";
import type {
  WorkspaceHttpRequest,
  WorkspaceHttpResponse,
  WorkspaceHttpTransport,
} from "./workspaceHttpApi";

export interface FetchWorkspaceTransportOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export function createFetchWorkspaceHttpTransport(
  options: FetchWorkspaceTransportOptions = {},
): WorkspaceHttpTransport {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  return async (request: WorkspaceHttpRequest): Promise<WorkspaceHttpResponse> => {
    try {
      const response = await fetchImpl(requestUrl(baseUrl, request), {
        method: request.method,
        headers: request.body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });
      const body = await safeJson(response);
      if (!isWorkspaceApiResult(body)) {
        return unavailableResponse();
      }

      return {
        status: response.status,
        body,
      };
    } catch {
      return unavailableResponse();
    }
  };
}

function requestUrl(baseUrl: string, request: WorkspaceHttpRequest): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== undefined) query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `${baseUrl}${request.path}${suffix}`;
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isWorkspaceApiResult(value: unknown): value is WorkspaceApiResult<unknown> {
  if (!value || typeof value !== "object" || !("ok" in value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.ok === true) return "data" in candidate;
  if (candidate.ok !== false || !candidate.error || typeof candidate.error !== "object") return false;

  const error = candidate.error as Record<string, unknown>;
  return isWorkspaceApiErrorCode(error.code) && typeof error.message === "string";
}

function isWorkspaceApiErrorCode(value: unknown): value is WorkspaceApiErrorCode {
  return (
    value === "not_found" ||
    value === "validation_failed" ||
    value === "provider_unavailable" ||
    value === "runtime_unavailable" ||
    value === "unknown"
  );
}

function unavailableResponse(): WorkspaceHttpResponse<never> {
  return {
    status: 503,
    body: apiFailure("runtime_unavailable", "Delphi workspace service is unavailable."),
  };
}
