import { MockFinancialDataProvider } from "../data/mockFinancialDataProvider";
import { defaultMetricThresholds } from "../data/providerRules";
import { FixtureWorkspaceRepository } from "../repositories/fixtureWorkspaceRepository";
import { ProviderEvidenceService } from "../services/providerEvidenceService";
import { WorkspaceService } from "../services/workspaceService";
import { apiFailure, apiSuccess, normalizeRuntimeError } from "./workspaceApiMappers";
import type {
  AppendEvidenceCandidatesCommand,
  AppendDecisionCommand,
  DecisionRecordCommand,
  EvidenceCommand,
  EvidenceCorrectionCommand,
  EvidenceListQuery,
  ProviderEvidenceRefreshCommand,
  ThesisWorkspaceQuery,
  UpdateThesisReviewCommand,
  WorkspaceApiResult,
  WorkspaceApiRuntime,
} from "./workspaceApiTypes";
import type { ChangeSummary, DecisionTraceEntry, Evidence, Thesis, WorkspaceData } from "../domain/types";
import type { ProviderEvidenceRefreshResult } from "../services/providerEvidenceService";
import type { ThesisWorkspace } from "../repositories/workspaceRepository";

export class FixtureWorkspaceApiRuntime implements WorkspaceApiRuntime {
  private readonly repository: FixtureWorkspaceRepository;
  private readonly workspaceService: WorkspaceService;
  private readonly providerEvidenceService: ProviderEvidenceService;

  constructor(repository = new FixtureWorkspaceRepository()) {
    this.repository = repository;
    this.workspaceService = new WorkspaceService(this.repository);
    this.providerEvidenceService = new ProviderEvidenceService(
      this.repository,
      new MockFinancialDataProvider(),
      defaultMetricThresholds,
    );
  }

  async getWorkspace(): Promise<WorkspaceApiResult<WorkspaceData>> {
    return this.execute(() => this.workspaceService.getWorkspace());
  }

  async listEvidence(query: EvidenceListQuery): Promise<WorkspaceApiResult<Evidence[]>> {
    return this.execute(() => this.workspaceService.listEvidence(query.filter));
  }

  async getThesisWorkspace(query: ThesisWorkspaceQuery): Promise<WorkspaceApiResult<ThesisWorkspace>> {
    return this.execute(() => this.workspaceService.getThesisWorkspace(query.thesisId));
  }

  async getWhatChanged(): Promise<WorkspaceApiResult<ChangeSummary[]>> {
    return this.execute(() => this.workspaceService.getWhatChanged());
  }

  async appendEvidenceCandidates(command: AppendEvidenceCandidatesCommand): Promise<WorkspaceApiResult<Evidence[]>> {
    return this.execute(() => this.repository.appendEvidenceCandidates(command.candidates));
  }

  async acceptEvidence(command: EvidenceCommand): Promise<WorkspaceApiResult<Evidence>> {
    return this.execute(() => this.workspaceService.acceptEvidence(command.evidenceId));
  }

  async dismissEvidence(command: EvidenceCommand): Promise<WorkspaceApiResult<Evidence>> {
    return this.execute(() => this.workspaceService.dismissEvidence(command.evidenceId));
  }

  async correctEvidence(command: EvidenceCorrectionCommand): Promise<WorkspaceApiResult<Evidence>> {
    return this.execute(() =>
      this.workspaceService.correctEvidence({
        evidenceId: command.evidenceId,
        impact: command.impact,
        thesisId: command.thesisId,
        assumptionId: command.assumptionId,
        confidence: command.confidence,
        rationaleSummary: command.rationaleSummary,
      }),
    );
  }

  async appendDecision(command: AppendDecisionCommand): Promise<WorkspaceApiResult<DecisionTraceEntry>> {
    return this.execute(() => this.repository.appendDecision(command.thesisId, command.entry));
  }

  async updateThesisReview(command: UpdateThesisReviewCommand): Promise<WorkspaceApiResult<Thesis>> {
    return this.execute(() => this.repository.updateThesisReview(command.thesisId, command.newConviction, command.reviewedAt));
  }

  async recordDecision(command: DecisionRecordCommand): Promise<WorkspaceApiResult<void>> {
    return this.execute(() =>
      this.workspaceService.recordDecision({
        thesisId: command.thesisId,
        decision: command.decision,
        newConviction: command.newConviction,
        rationale: command.rationale,
        followUp: command.followUp,
      }),
    );
  }

  async refreshProviderEvidence(
    command: ProviderEvidenceRefreshCommand = { kind: "refresh_provider_evidence" },
  ): Promise<WorkspaceApiResult<ProviderEvidenceRefreshResult>> {
    return this.execute(() =>
      this.providerEvidenceService.refreshEvidence({
        period: command.period,
        symbols: command.symbols,
      }),
    );
  }

  private async execute<T>(operation: () => Promise<T>): Promise<WorkspaceApiResult<T>> {
    try {
      return apiSuccess(await operation());
    } catch (error) {
      const failure = normalizeRuntimeError(error);
      if (failure.error.code === "unknown") {
        return apiFailure("runtime_unavailable", failure.error.message);
      }
      return failure;
    }
  }
}
