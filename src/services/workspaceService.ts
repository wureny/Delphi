import { assembleDecisionTrace } from "../domain/aiBehaviors";
import type { ChangeSummary, Evidence, EvidenceFilter, WorkspaceData } from "../domain/types";
import type {
  DecisionRecordInput,
  EvidenceCorrectionInput,
  ThesisWorkspace,
  WorkspaceRepository,
} from "../repositories/workspaceRepository";

export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async getWorkspace(): Promise<WorkspaceData> {
    return this.repository.getWorkspace();
  }

  async listEvidence(filter: EvidenceFilter): Promise<Evidence[]> {
    return this.repository.listEvidence(filter);
  }

  async getThesisWorkspace(thesisId: string): Promise<ThesisWorkspace> {
    return this.repository.getThesisWorkspace(thesisId);
  }

  async getWhatChanged(): Promise<ChangeSummary[]> {
    return this.repository.getWhatChanged();
  }

  async acceptEvidence(evidenceId: string): Promise<Evidence> {
    return this.repository.acceptEvidence(evidenceId);
  }

  async dismissEvidence(evidenceId: string): Promise<Evidence> {
    return this.repository.dismissEvidence(evidenceId);
  }

  async correctEvidence(input: EvidenceCorrectionInput): Promise<Evidence> {
    const workspace = await this.repository.getWorkspace();
    const current = workspace.evidence.find((item) => item.id === input.evidenceId);
    if (!current) {
      throw new Error(`Evidence not found: ${input.evidenceId}`);
    }

    const rationaleSummary = input.rationaleSummary.trim() || `${current.classification.rationale} Reclassified by the user.`;
    return this.repository.correctEvidence({
      ...input,
      rationaleSummary,
    });
  }

  async recordDecision(input: DecisionRecordInput): Promise<void> {
    if (!input.rationale.trim()) {
      throw new Error("Delphi will not record a decision without a human rationale.");
    }

    const workspace = await this.repository.getWorkspace();
    const thesis = workspace.theses.find((candidate) => candidate.id === input.thesisId);
    if (!thesis) {
      throw new Error(`Thesis not found: ${input.thesisId}`);
    }

    const linkedEvidence = workspace.evidence.filter(
      (item) => item.status === "accepted" && item.classification.thesisId === input.thesisId,
    );
    const trace = assembleDecisionTrace(
      {
        actor: workspace.user.name,
        decision: input.decision,
        priorConviction: thesis.conviction,
        newConviction: input.newConviction,
        evidenceIds: linkedEvidence.map((item) => item.id),
        changedAssumptions: thesis.assumptions.filter((assumption) => assumption.status !== "holding").map((assumption) => assumption.id),
        rationale: input.rationale,
        sources: linkedEvidence.flatMap((item) => (item.citation ? [item.citation.label] : [])),
        followUp: input.followUp,
        unresolved: [],
      },
      workspace.now,
    );

    await this.repository.appendDecision(input.thesisId, trace);
    await this.repository.updateThesisReview(input.thesisId, input.newConviction, workspace.now);
  }
}
