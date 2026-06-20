import type {
  ChangeSummary,
  Confidence,
  DecisionTraceEntry,
  Evidence,
  EvidenceFilter,
  Impact,
  Thesis,
  WorkspaceData,
} from "../domain/types";

export interface EvidenceCorrectionInput {
  evidenceId: string;
  impact: Impact;
  thesisId: string | null;
  assumptionId: string | null;
  confidence: Confidence;
  rationaleSummary: string;
}

export interface DecisionRecordInput {
  thesisId: string;
  decision: string;
  newConviction: number;
  rationale: string;
  followUp: string;
}

export interface ThesisWorkspace {
  thesis: Thesis;
  acceptedEvidence: Evidence[];
  pendingEvidenceCount: number;
  decisionTrace: DecisionTraceEntry[];
}

export interface WorkspaceRepository {
  getWorkspace(): Promise<WorkspaceData>;
  listEvidence(filter: EvidenceFilter): Promise<Evidence[]>;
  getThesisWorkspace(thesisId: string): Promise<ThesisWorkspace>;
  getWhatChanged(): Promise<ChangeSummary[]>;
  appendEvidenceCandidates(candidates: Evidence[]): Promise<Evidence[]>;
  acceptEvidence(evidenceId: string): Promise<Evidence>;
  dismissEvidence(evidenceId: string): Promise<Evidence>;
  correctEvidence(input: EvidenceCorrectionInput): Promise<Evidence>;
  appendDecision(thesisId: string, entry: DecisionTraceEntry): Promise<DecisionTraceEntry>;
  updateThesisReview(thesisId: string, newConviction: number, reviewedAt: string): Promise<Thesis>;
}
