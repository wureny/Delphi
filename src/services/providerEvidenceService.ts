import type {
  FinancialContext,
  FinancialDataProvider,
  FinancialEvidenceProposal,
  MetricThreshold,
  Period,
} from "../domain/financialData";
import {
  fundamentalSnapshotToEvidenceProposals,
  priceSnapshotToContext,
  proposalViolatesAdviceGuard,
  providerUnavailableToContext,
} from "../domain/researchContext";
import type { Evidence, Source, Thesis, WorkspaceData } from "../domain/types";
import type { WorkspaceRepository } from "../repositories/workspaceRepository";

export interface ProviderEvidenceRefreshInput {
  period?: Period;
  symbols?: string[];
}

export interface ProviderEvidenceRefreshResult {
  added: Evidence[];
  rejected: ProviderEvidenceRejection[];
  contexts: FinancialContext[];
}

export interface ProviderEvidenceRejection {
  symbol: string;
  reason: "unavailable" | "advice_guard" | "invalid_grounding" | "untracked_asset";
  message: string;
}

export class ProviderEvidenceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly provider: FinancialDataProvider,
    private readonly thresholds: MetricThreshold[],
  ) {}

  async refreshEvidence(input: ProviderEvidenceRefreshInput = {}): Promise<ProviderEvidenceRefreshResult> {
    const workspace = await this.repository.getWorkspace();
    const symbols = input.symbols ?? symbolsWithTheses(workspace);
    const period = input.period ?? "quarterly";
    const candidates: Evidence[] = [];
    const contexts: FinancialContext[] = [];
    const rejected: ProviderEvidenceRejection[] = [];

    for (const symbol of symbols) {
      const asset = workspace.assets.find((candidate) => candidate.ticker === symbol);
      if (!asset) {
        rejected.push({
          symbol,
          reason: "untracked_asset",
          message: `${symbol} is not in the tracked workspace assets.`,
        });
        continue;
      }

      const priceResult = await this.provider.getPriceSnapshot(symbol);
      contexts.push(priceSnapshotToContext(priceResult));

      const fundamentalsResult = await this.provider.getFundamentals(symbol, period);
      if (!fundamentalsResult.data) {
        contexts.push(providerUnavailableToContext(symbol, fundamentalsResult.message ?? "Fundamental data unavailable."));
        rejected.push({
          symbol,
          reason: "unavailable",
          message: fundamentalsResult.message ?? "Fundamental data unavailable.",
        });
        continue;
      }

      const thresholdsForSymbol = thresholdsForAsset(workspace, asset.id, this.thresholds);
      const proposals = fundamentalSnapshotToEvidenceProposals(fundamentalsResult, thresholdsForSymbol);
      for (const proposal of proposals) {
        const rejection = validateProposal(proposal);
        if (rejection) {
          rejected.push({ symbol, ...rejection });
          continue;
        }
        candidates.push(proposalToEvidence(proposal, workspace));
      }
    }

    const added = await this.repository.appendEvidenceCandidates(candidates);
    return { added, rejected, contexts };
  }
}

function symbolsWithTheses(workspace: WorkspaceData): string[] {
  return workspace.theses
    .map((thesis) => workspace.assets.find((asset) => asset.id === thesis.assetId)?.ticker)
    .filter((symbol): symbol is string => Boolean(symbol));
}

function thresholdsForAsset(workspace: WorkspaceData, assetId: string, thresholds: MetricThreshold[]): MetricThreshold[] {
  const thesisIds = new Set(workspace.theses.filter((thesis) => thesis.assetId === assetId).map((thesis) => thesis.id));
  return thresholds.filter((threshold) => thesisIds.has(threshold.thesisId));
}

function validateProposal(
  proposal: FinancialEvidenceProposal,
): Omit<ProviderEvidenceRejection, "symbol"> | null {
  if (proposalViolatesAdviceGuard(proposal)) {
    return {
      reason: "advice_guard",
      message: "Provider-derived candidate contained advice-like language and was blocked.",
    };
  }

  if (Boolean(proposal.citation) === proposal.uncertain) {
    return {
      reason: "invalid_grounding",
      message: "Provider-derived candidate must have exactly one of citation or uncertainty.",
    };
  }

  return null;
}

function proposalToEvidence(proposal: FinancialEvidenceProposal, workspace: WorkspaceData): Evidence {
  const thesis = requireThesis(workspace, proposal.thesisId);
  const source = sourceFromProposal(proposal);
  return {
    id: evidenceIdForProposal(proposal),
    status: "new",
    receivedAt: proposal.receivedAt,
    headline: proposal.title,
    excerpt: proposal.summary,
    source,
    classification: {
      assetId: thesis.assetId,
      thesisId: proposal.thesisId,
      assumptionId: proposal.assumptionId,
      impact: proposal.impact,
      confidence: proposal.confidence,
      source: "ai",
      rationale: proposal.rationale,
    },
    citation: proposal.citation,
    uncertain: proposal.uncertain,
    stale: proposal.stale,
  };
}

function sourceFromProposal(proposal: FinancialEvidenceProposal): Source {
  return {
    name: proposal.citation?.label ?? "Stale financial data",
    quality: proposal.confidence,
    url: proposal.citation?.url ?? "#stale-financial-data",
    publishedAt: proposal.observedAt,
  };
}

function evidenceIdForProposal(proposal: FinancialEvidenceProposal): string {
  const period = proposal.metric.fiscalPeriod.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `ev_provider_${proposal.symbol.toLowerCase()}_${proposal.metric.key}_${proposal.assumptionId}_${period}`;
}

function requireThesis(workspace: WorkspaceData, thesisId: string): Thesis {
  const thesis = workspace.theses.find((candidate) => candidate.id === thesisId);
  if (!thesis) {
    throw new Error(`Thesis not found for provider proposal: ${thesisId}`);
  }
  return thesis;
}
