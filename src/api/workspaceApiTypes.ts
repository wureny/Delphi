import type { ProviderEvidenceRefreshInput, ProviderEvidenceRefreshResult } from "../services/providerEvidenceService";
import type { ChangeSummary, DecisionTraceEntry, Evidence, EvidenceFilter, Thesis, WorkspaceData } from "../domain/types";
import type { DecisionRecordInput, EvidenceCorrectionInput, ThesisWorkspace } from "../repositories/workspaceRepository";

export type WorkspaceApiErrorCode =
  | "not_found"
  | "validation_failed"
  | "provider_unavailable"
  | "runtime_unavailable"
  | "unknown";

export interface WorkspaceApiError {
  code: WorkspaceApiErrorCode;
  message: string;
}

export type WorkspaceApiResult<T> = WorkspaceApiSuccess<T> | WorkspaceApiFailure;

export interface WorkspaceApiSuccess<T> {
  ok: true;
  data: T;
}

export interface WorkspaceApiFailure {
  ok: false;
  error: WorkspaceApiError;
}

export interface WorkspaceQuery {
  kind: "get_workspace";
}

export interface EvidenceListQuery {
  kind: "list_evidence";
  filter: EvidenceFilter;
}

export interface ThesisWorkspaceQuery {
  kind: "get_thesis_workspace";
  thesisId: string;
}

export interface WhatChangedQuery {
  kind: "get_what_changed";
}

export interface EvidenceCommand {
  kind: "accept_evidence" | "dismiss_evidence";
  evidenceId: string;
}

export interface AppendEvidenceCandidatesCommand {
  kind: "append_evidence_candidates";
  candidates: Evidence[];
}

export interface EvidenceCorrectionCommand extends EvidenceCorrectionInput {
  kind: "correct_evidence";
}

export interface DecisionRecordCommand extends DecisionRecordInput {
  kind: "record_decision";
}

export interface AppendDecisionCommand {
  kind: "append_decision";
  thesisId: string;
  entry: DecisionTraceEntry;
}

export interface UpdateThesisReviewCommand {
  kind: "update_thesis_review";
  thesisId: string;
  newConviction: number;
  reviewedAt: string;
}

export interface ProviderEvidenceRefreshCommand extends ProviderEvidenceRefreshInput {
  kind: "refresh_provider_evidence";
}

export interface WorkspaceApiRuntime {
  getWorkspace(query?: WorkspaceQuery): Promise<WorkspaceApiResult<WorkspaceData>>;
  listEvidence(query: EvidenceListQuery): Promise<WorkspaceApiResult<Evidence[]>>;
  getThesisWorkspace(query: ThesisWorkspaceQuery): Promise<WorkspaceApiResult<ThesisWorkspace>>;
  getWhatChanged(query?: WhatChangedQuery): Promise<WorkspaceApiResult<ChangeSummary[]>>;
  appendEvidenceCandidates(command: AppendEvidenceCandidatesCommand): Promise<WorkspaceApiResult<Evidence[]>>;
  acceptEvidence(command: EvidenceCommand): Promise<WorkspaceApiResult<Evidence>>;
  dismissEvidence(command: EvidenceCommand): Promise<WorkspaceApiResult<Evidence>>;
  correctEvidence(command: EvidenceCorrectionCommand): Promise<WorkspaceApiResult<Evidence>>;
  appendDecision(command: AppendDecisionCommand): Promise<WorkspaceApiResult<DecisionTraceEntry>>;
  updateThesisReview(command: UpdateThesisReviewCommand): Promise<WorkspaceApiResult<Thesis>>;
  recordDecision(command: DecisionRecordCommand): Promise<WorkspaceApiResult<void>>;
  refreshProviderEvidence(command?: ProviderEvidenceRefreshCommand): Promise<WorkspaceApiResult<ProviderEvidenceRefreshResult>>;
}
