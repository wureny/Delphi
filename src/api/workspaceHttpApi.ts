import { apiFailure } from "./workspaceApiMappers";
import type {
  AppendDecisionCommand,
  AppendEvidenceCandidatesCommand,
  DecisionRecordCommand,
  EvidenceCorrectionCommand,
  EvidenceCommand,
  EvidenceListQuery,
  ProviderEvidenceRefreshCommand,
  ThesisWorkspaceQuery,
  UpdateThesisReviewCommand,
  WorkspaceApiErrorCode,
  WorkspaceApiResult,
  WorkspaceApiRuntime,
} from "./workspaceApiTypes";
import type { ChangeSummary, DecisionTraceEntry, Evidence, EvidenceFilter, Thesis, WorkspaceData } from "../domain/types";
import type { ProviderEvidenceRefreshResult } from "../services/providerEvidenceService";
import type { ThesisWorkspace } from "../repositories/workspaceRepository";

export type WorkspaceHttpMethod = "GET" | "POST";

export interface WorkspaceHttpRequest<TBody = unknown> {
  method: WorkspaceHttpMethod;
  path: string;
  query?: Record<string, string | undefined>;
  body?: TBody;
}

export interface WorkspaceHttpResponse<T = unknown> {
  status: number;
  body: WorkspaceApiResult<T>;
}

export type WorkspaceHttpHandler = (request: WorkspaceHttpRequest) => Promise<WorkspaceHttpResponse>;

export type WorkspaceHttpTransport = WorkspaceHttpHandler;

export function createWorkspaceHttpHandler(runtime: WorkspaceApiRuntime): WorkspaceHttpHandler {
  return async (request: WorkspaceHttpRequest) => {
    const route = normalizePath(request.path);

    if (request.method === "GET" && route === "/api/workspace") {
      return httpOk(await runtime.getWorkspace());
    }

    if (request.method === "GET" && route === "/api/evidence") {
      const filter = evidenceFilterValue(request.query?.filter);
      if (!filter) return httpFailure(400, "validation_failed", "Evidence filter is invalid.");
      return httpOk(await runtime.listEvidence({ kind: "list_evidence", filter }));
    }

    if (request.method === "GET" && route.startsWith("/api/theses/")) {
      const thesisId = route.split("/")[3];
      if (!thesisId) return httpFailure(400, "validation_failed", "Thesis id is required.");
      return httpOk(await runtime.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId }));
    }

    if (request.method === "GET" && route === "/api/what-changed") {
      return httpOk(await runtime.getWhatChanged());
    }

    if (request.method === "POST" && route.match(/^\/api\/evidence\/[^/]+\/accept$/)) {
      const evidenceId = route.split("/")[3];
      return httpOk(await runtime.acceptEvidence({ kind: "accept_evidence", evidenceId }));
    }

    if (request.method === "POST" && route.match(/^\/api\/evidence\/[^/]+\/dismiss$/)) {
      const evidenceId = route.split("/")[3];
      return httpOk(await runtime.dismissEvidence({ kind: "dismiss_evidence", evidenceId }));
    }

    if (request.method === "POST" && route === "/api/evidence/correct") {
      const body = commandBody<EvidenceCorrectionCommand>(request.body, "correct_evidence");
      if (!body.ok) return httpFailure(400, "validation_failed", body.message);
      return httpOk(await runtime.correctEvidence(body.command));
    }

    if (request.method === "POST" && route === "/api/decisions") {
      const body = commandBody<DecisionRecordCommand>(request.body, "record_decision");
      if (!body.ok) return httpFailure(400, "validation_failed", body.message);
      return httpOk(await runtime.recordDecision(body.command));
    }

    if (request.method === "POST" && route === "/api/provider-evidence/refresh") {
      const command = commandBody<ProviderEvidenceRefreshCommand>(request.body, "refresh_provider_evidence", true);
      if (!command.ok) return httpFailure(400, "validation_failed", command.message);
      return httpOk(await runtime.refreshProviderEvidence(command.command));
    }

    if (request.method === "POST" && route === "/api/internal/evidence-candidates") {
      const body = commandBody<AppendEvidenceCandidatesCommand>(request.body, "append_evidence_candidates");
      if (!body.ok) return httpFailure(400, "validation_failed", body.message);
      return httpOk(await runtime.appendEvidenceCandidates(body.command));
    }

    if (request.method === "POST" && route === "/api/internal/decision-traces") {
      const body = commandBody<AppendDecisionCommand>(request.body, "append_decision");
      if (!body.ok) return httpFailure(400, "validation_failed", body.message);
      return httpOk(await runtime.appendDecision(body.command));
    }

    if (request.method === "POST" && route === "/api/internal/thesis-review") {
      const body = commandBody<UpdateThesisReviewCommand>(request.body, "update_thesis_review");
      if (!body.ok) return httpFailure(400, "validation_failed", body.message);
      return httpOk(await runtime.updateThesisReview(body.command));
    }

    if (knownPath(route)) {
      return httpFailure(405, "validation_failed", "HTTP method is not allowed for this workspace route.");
    }

    return httpFailure(404, "not_found", "Workspace route was not found.");
  };
}

export class HttpWorkspaceApiClient implements WorkspaceApiRuntime {
  constructor(private readonly transport: WorkspaceHttpTransport) {}

  async getWorkspace(): Promise<WorkspaceApiResult<WorkspaceData>> {
    return this.request({ method: "GET", path: "/api/workspace" });
  }

  async listEvidence(query: EvidenceListQuery): Promise<WorkspaceApiResult<Evidence[]>> {
    return this.request({ method: "GET", path: "/api/evidence", query: { filter: query.filter } });
  }

  async getThesisWorkspace(query: ThesisWorkspaceQuery): Promise<WorkspaceApiResult<ThesisWorkspace>> {
    return this.request({ method: "GET", path: `/api/theses/${encodeURIComponent(query.thesisId)}` });
  }

  async getWhatChanged(): Promise<WorkspaceApiResult<ChangeSummary[]>> {
    return this.request({ method: "GET", path: "/api/what-changed" });
  }

  async appendEvidenceCandidates(command: AppendEvidenceCandidatesCommand): Promise<WorkspaceApiResult<Evidence[]>> {
    return this.request({ method: "POST", path: "/api/internal/evidence-candidates", body: command });
  }

  async acceptEvidence(command: EvidenceCommand): Promise<WorkspaceApiResult<Evidence>> {
    return this.request({ method: "POST", path: `/api/evidence/${encodeURIComponent(command.evidenceId)}/accept` });
  }

  async dismissEvidence(command: EvidenceCommand): Promise<WorkspaceApiResult<Evidence>> {
    return this.request({ method: "POST", path: `/api/evidence/${encodeURIComponent(command.evidenceId)}/dismiss` });
  }

  async correctEvidence(command: EvidenceCorrectionCommand): Promise<WorkspaceApiResult<Evidence>> {
    return this.request({ method: "POST", path: "/api/evidence/correct", body: command });
  }

  async appendDecision(command: AppendDecisionCommand): Promise<WorkspaceApiResult<DecisionTraceEntry>> {
    return this.request({ method: "POST", path: "/api/internal/decision-traces", body: command });
  }

  async updateThesisReview(command: UpdateThesisReviewCommand): Promise<WorkspaceApiResult<Thesis>> {
    return this.request({ method: "POST", path: "/api/internal/thesis-review", body: command });
  }

  async recordDecision(command: DecisionRecordCommand): Promise<WorkspaceApiResult<void>> {
    return this.request({ method: "POST", path: "/api/decisions", body: command });
  }

  async refreshProviderEvidence(command: ProviderEvidenceRefreshCommand = { kind: "refresh_provider_evidence" }): Promise<WorkspaceApiResult<ProviderEvidenceRefreshResult>> {
    return this.request({ method: "POST", path: "/api/provider-evidence/refresh", body: command });
  }

  private async request<T>(request: WorkspaceHttpRequest): Promise<WorkspaceApiResult<T>> {
    const response = await this.transport(request);
    return response.body as WorkspaceApiResult<T>;
  }
}

function httpOk<T>(result: WorkspaceApiResult<T>): WorkspaceHttpResponse<T> {
  return {
    status: result.ok ? 200 : statusForFailure(result.error.code),
    body: result,
  };
}

function httpFailure(status: number, code: "not_found" | "validation_failed", message: string): WorkspaceHttpResponse<never> {
  return {
    status,
    body: apiFailure(code, message),
  };
}

function normalizePath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? path;
  return withoutQuery.endsWith("/") && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery;
}

function evidenceFilterValue(value: string | undefined): EvidenceFilter | null {
  if (value === "new" || value === "contradicts" || value === "uncertain" || value === "accepted" || value === "all") {
    return value;
  }
  return null;
}

function commandBody<T extends { kind: string }>(
  body: unknown,
  kind: T["kind"],
  optional = false,
): { ok: true; command: T } | { ok: false; message: string } {
  if (!body && optional) return { ok: true, command: { kind } as T };
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Request body is required." };
  }
  const command = body as T;
  if (command.kind !== kind) {
    return { ok: false, message: "Request body command kind is invalid." };
  }
  return { ok: true, command };
}

function knownPath(path: string): boolean {
  return (
    path === "/api/workspace" ||
    path === "/api/evidence" ||
    path.startsWith("/api/theses/") ||
    path === "/api/what-changed" ||
    path === "/api/evidence/correct" ||
    path === "/api/decisions" ||
    path === "/api/provider-evidence/refresh" ||
    path === "/api/internal/evidence-candidates" ||
    path === "/api/internal/decision-traces" ||
    path === "/api/internal/thesis-review" ||
    path.match(/^\/api\/evidence\/[^/]+\/(accept|dismiss)$/) !== null
  );
}

function statusForFailure(code: WorkspaceApiErrorCode): number {
  switch (code) {
    case "not_found":
      return 404;
    case "validation_failed":
      return 400;
    case "provider_unavailable":
    case "runtime_unavailable":
      return 503;
    case "unknown":
      return 500;
    default:
      return 500;
  }
}
