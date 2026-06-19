import { initialWorkspace } from "../data/fixtures";
import { acceptedEvidenceForThesis, evidenceForThesis, filterEvidence } from "../domain/selectors";
import type { ChangeSummary, DecisionTraceEntry, Evidence, EvidenceFilter, Thesis, WorkspaceData } from "../domain/types";
import type { EvidenceCorrectionInput, ThesisWorkspace, WorkspaceRepository } from "./workspaceRepository";

export class FixtureWorkspaceRepository implements WorkspaceRepository {
  private workspace: WorkspaceData;

  constructor(seed: WorkspaceData = initialWorkspace) {
    this.workspace = clone(seed);
  }

  async getWorkspace(): Promise<WorkspaceData> {
    return clone(this.workspace);
  }

  async listEvidence(filter: EvidenceFilter): Promise<Evidence[]> {
    return clone(filterEvidence(this.workspace.evidence, filter));
  }

  async getThesisWorkspace(thesisId: string): Promise<ThesisWorkspace> {
    const thesis = this.workspace.theses.find((candidate) => candidate.id === thesisId);
    if (!thesis) {
      throw new Error(`Thesis not found: ${thesisId}`);
    }

    return {
      thesis: clone(thesis),
      acceptedEvidence: clone(acceptedEvidenceForThesis(this.workspace, thesisId)),
      pendingEvidenceCount: evidenceForThesis(this.workspace, thesisId, "new").length,
      decisionTrace: clone(this.workspace.decisionTraces[thesisId] ?? []),
    };
  }

  async getWhatChanged(): Promise<ChangeSummary[]> {
    return clone(Object.values(this.workspace.whatChanged));
  }

  async acceptEvidence(evidenceId: string): Promise<Evidence> {
    return this.updateEvidenceStatus(evidenceId, "accepted");
  }

  async dismissEvidence(evidenceId: string): Promise<Evidence> {
    return this.updateEvidenceStatus(evidenceId, "dismissed");
  }

  async correctEvidence(input: EvidenceCorrectionInput): Promise<Evidence> {
    let updated: Evidence | null = null;
    this.workspace = {
      ...this.workspace,
      evidence: this.workspace.evidence.map((item) => {
        if (item.id !== input.evidenceId) return item;
        const thesis = this.workspace.theses.find((candidate) => candidate.id === input.thesisId);
        updated = {
          ...item,
          classification: {
            ...item.classification,
            impact: input.impact,
            thesisId: input.thesisId,
            assumptionId: input.assumptionId,
            confidence: input.confidence,
            assetId: thesis ? thesis.assetId : null,
            source: "user",
            rationale: input.rationaleSummary,
          },
        };
        return updated;
      }),
    };

    if (!updated) {
      throw new Error(`Evidence not found: ${input.evidenceId}`);
    }
    return clone(updated);
  }

  async appendDecision(thesisId: string, entry: DecisionTraceEntry): Promise<DecisionTraceEntry> {
    if (!this.workspace.theses.some((thesis) => thesis.id === thesisId)) {
      throw new Error(`Thesis not found: ${thesisId}`);
    }

    this.workspace = {
      ...this.workspace,
      decisionTraces: {
        ...this.workspace.decisionTraces,
        [thesisId]: [entry, ...(this.workspace.decisionTraces[thesisId] ?? [])],
      },
    };
    return clone(entry);
  }

  async updateThesisReview(thesisId: string, newConviction: number, reviewedAt: string): Promise<Thesis> {
    let updated: Thesis | null = null;
    this.workspace = {
      ...this.workspace,
      theses: this.workspace.theses.map((thesis) => {
        if (thesis.id !== thesisId) return thesis;
        updated = {
          ...thesis,
          conviction: newConviction,
          convictionBand: newConviction >= 67 ? "high" : newConviction >= 34 ? "medium" : "low",
          lastReviewed: reviewedAt,
          pendingChanges: 0,
        };
        return updated;
      }),
    };

    if (!updated) {
      throw new Error(`Thesis not found: ${thesisId}`);
    }
    return clone(updated);
  }

  private async updateEvidenceStatus(evidenceId: string, status: Evidence["status"]): Promise<Evidence> {
    let updated: Evidence | null = null;
    this.workspace = {
      ...this.workspace,
      evidence: this.workspace.evidence.map((item) => {
        if (item.id !== evidenceId) return item;
        updated = { ...item, status };
        return updated;
      }),
    };

    if (!updated) {
      throw new Error(`Evidence not found: ${evidenceId}`);
    }
    return clone(updated);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
