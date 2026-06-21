import { unwrapApiResult } from "../api/workspaceApiMappers";
import type { WorkspaceApiRuntime } from "../api/workspaceApiTypes";
import type { ChangeSummary, DecisionTraceEntry, Evidence, EvidenceFilter, Thesis, WorkspaceData } from "../domain/types";
import type { EvidenceCorrectionInput, ThesisWorkspace, WorkspaceRepository } from "./workspaceRepository";

export class ApiWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly runtime: WorkspaceApiRuntime) {}

  async getWorkspace(): Promise<WorkspaceData> {
    return unwrapApiResult(await this.runtime.getWorkspace({ kind: "get_workspace" }));
  }

  async listEvidence(filter: EvidenceFilter): Promise<Evidence[]> {
    return unwrapApiResult(await this.runtime.listEvidence({ kind: "list_evidence", filter }));
  }

  async getThesisWorkspace(thesisId: string): Promise<ThesisWorkspace> {
    return unwrapApiResult(await this.runtime.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId }));
  }

  async getWhatChanged(): Promise<ChangeSummary[]> {
    return unwrapApiResult(await this.runtime.getWhatChanged({ kind: "get_what_changed" }));
  }

  async appendEvidenceCandidates(candidates: Evidence[]): Promise<Evidence[]> {
    return unwrapApiResult(await this.runtime.appendEvidenceCandidates({ kind: "append_evidence_candidates", candidates }));
  }

  async acceptEvidence(evidenceId: string): Promise<Evidence> {
    return unwrapApiResult(await this.runtime.acceptEvidence({ kind: "accept_evidence", evidenceId }));
  }

  async dismissEvidence(evidenceId: string): Promise<Evidence> {
    return unwrapApiResult(await this.runtime.dismissEvidence({ kind: "dismiss_evidence", evidenceId }));
  }

  async correctEvidence(input: EvidenceCorrectionInput): Promise<Evidence> {
    return unwrapApiResult(await this.runtime.correctEvidence({ kind: "correct_evidence", ...input }));
  }

  async appendDecision(thesisId: string, entry: DecisionTraceEntry): Promise<DecisionTraceEntry> {
    return unwrapApiResult(await this.runtime.appendDecision({ kind: "append_decision", thesisId, entry }));
  }

  async updateThesisReview(thesisId: string, newConviction: number, reviewedAt: string): Promise<Thesis> {
    return unwrapApiResult(await this.runtime.updateThesisReview({ kind: "update_thesis_review", thesisId, newConviction, reviewedAt }));
  }
}
