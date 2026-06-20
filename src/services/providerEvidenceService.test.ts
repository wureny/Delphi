import { describe, expect, it } from "vitest";
import { MockFinancialDataProvider } from "../data/mockFinancialDataProvider";
import { defaultMetricThresholds } from "../data/providerRules";
import type { FinancialDataProvider, FundamentalSnapshot, Period, ProviderResult } from "../domain/financialData";
import { FixtureWorkspaceRepository } from "../repositories/fixtureWorkspaceRepository";
import { ProviderEvidenceService } from "./providerEvidenceService";

function createService(provider: FinancialDataProvider = new MockFinancialDataProvider()) {
  const repository = new FixtureWorkspaceRepository();
  return {
    repository,
    service: new ProviderEvidenceService(repository, provider, defaultMetricThresholds),
  };
}

describe("ProviderEvidenceService", () => {
  it("adds threshold-crossing provider facts as new evidence candidates", async () => {
    const { repository, service } = createService();

    const result = await service.refreshEvidence({ symbols: ["NGSC"] });
    const inbox = await repository.listEvidence("new");

    expect(result.added.map((item) => item.id)).toContain("ev_provider_ngsc_gross_margin_a_ngsc_3_fy2027-q1");
    expect(inbox.map((item) => item.id)).toContain("ev_provider_ngsc_gross_margin_a_ngsc_3_fy2027-q1");
    expect(result.added.every((item) => item.status === "new")).toBe(true);
  });

  it("keeps provider candidates grounded with exactly one citation or uncertainty marker", async () => {
    const { service } = createService();

    const result = await service.refreshEvidence({ symbols: ["NGSC"] });

    expect(result.added.length).toBeGreaterThan(0);
    expect(result.added.every((item) => Boolean(item.citation) !== item.uncertain)).toBe(true);
  });

  it("marks stale provider candidates uncertain and low confidence", async () => {
    const { service } = createService();

    const result = await service.refreshEvidence({ symbols: ["RETL"] });
    const staleCandidate = result.added.find((item) => item.id.includes("retl"));

    expect(staleCandidate?.stale).toBe(true);
    expect(staleCandidate?.uncertain).toBe(true);
    expect(staleCandidate?.citation).toBeNull();
    expect(staleCandidate?.classification.confidence).toBe("low");
  });

  it("does not fabricate evidence when provider fundamentals are unavailable", async () => {
    const { service } = createService();

    const result = await service.refreshEvidence({ symbols: ["BCON"] });

    expect(result.added).toHaveLength(0);
    expect(result.rejected.some((item) => item.reason === "unavailable")).toBe(true);
  });

  it("is idempotent across repeated refreshes", async () => {
    const { service } = createService();

    const first = await service.refreshEvidence({ symbols: ["NGSC"] });
    const second = await service.refreshEvidence({ symbols: ["NGSC"] });

    expect(first.added.length).toBeGreaterThan(0);
    expect(second.added).toHaveLength(0);
  });

  it("does not update conviction or append decision traces", async () => {
    const { repository, service } = createService();
    const before = await repository.getThesisWorkspace("th_ngsc");

    await service.refreshEvidence({ symbols: ["NGSC"] });
    const after = await repository.getThesisWorkspace("th_ngsc");

    expect(after.thesis.conviction).toBe(before.thesis.conviction);
    expect(after.decisionTrace).toHaveLength(before.decisionTrace.length);
  });

  it("blocks advice-like provider-derived candidates", async () => {
    const provider = new AdviceLikeFundamentalsProvider();
    const { service } = createService(provider);

    const result = await service.refreshEvidence({ symbols: ["NGSC"] });

    expect(result.added).toHaveLength(0);
    expect(result.rejected.some((item) => item.reason === "advice_guard")).toBe(true);
  });
});

class AdviceLikeFundamentalsProvider extends MockFinancialDataProvider {
  async getFundamentals(symbol: string, period: Period): Promise<ProviderResult<FundamentalSnapshot>> {
    const result = await super.getFundamentals(symbol, period);
    if (!result.data) return result;
    return {
      ...result,
      data: {
        ...result.data,
        metrics: result.data.metrics.map((metric) => ({ ...metric, label: `${metric.label} sell signal price target` })),
      },
    };
  }
}
