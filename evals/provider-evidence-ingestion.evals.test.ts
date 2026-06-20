import { describe, expect, it } from "vitest";
import { MockFinancialDataProvider } from "../src/data/mockFinancialDataProvider";
import { defaultMetricThresholds } from "../src/data/providerRules";
import type { FinancialDataProvider, FundamentalSnapshot, Period, ProviderResult } from "../src/domain/financialData";
import { FixtureWorkspaceRepository } from "../src/repositories/fixtureWorkspaceRepository";
import { ProviderEvidenceService } from "../src/services/providerEvidenceService";

function createService(provider: FinancialDataProvider = new MockFinancialDataProvider()) {
  const repository = new FixtureWorkspaceRepository();
  return {
    repository,
    service: new ProviderEvidenceService(repository, provider, defaultMetricThresholds),
  };
}

describe("provider evidence ingestion evals", () => {
  it("creates grounded counter-evidence from a fundamental threshold breach", async () => {
    const { service } = createService();

    const result = await service.refreshEvidence({ symbols: ["NGSC"] });
    const candidate = result.added.find((item) => item.classification.assumptionId === "a_ngsc_3");

    expect(candidate?.classification.impact).toBe("contradicts");
    expect(candidate?.citation?.label).toBe("Company fundamentals feed");
    expect(candidate?.uncertain).toBe(false);
    expect(candidate?.classification.rationale).toMatch(/not an automatic thesis change/);
  });

  it("keeps price snapshots as context instead of evidence", async () => {
    const { service } = createService();

    const result = await service.refreshEvidence({ symbols: ["NGSC"] });

    expect(result.contexts.some((context) => context.kind === "price_snapshot")).toBe(true);
    expect(result.added.every((candidate) => !("kind" in candidate))).toBe(true);
    expect(result.added.map((candidate) => candidate.headline).join(" ")).not.toMatch(/price snapshot|last traded/i);
  });

  it("marks stale provider-derived evidence uncertain with no fresh citation", async () => {
    const { service } = createService();

    const result = await service.refreshEvidence({ symbols: ["RETL"] });
    const candidate = result.added[0];

    expect(candidate.stale).toBe(true);
    expect(candidate.uncertain).toBe(true);
    expect(candidate.citation).toBeNull();
    expect(candidate.excerpt).not.toMatch(/fresh|current/i);
  });

  it("does not fabricate evidence for unavailable provider data", async () => {
    const { service } = createService();

    const result = await service.refreshEvidence({ symbols: ["BCON"] });

    expect(result.added).toHaveLength(0);
    expect(result.rejected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "unavailable",
        }),
      ]),
    );
  });

  it("rejects advice and price-target bait before it reaches the inbox", async () => {
    const { service } = createService(new AdviceBaitProvider());

    const result = await service.refreshEvidence({ symbols: ["NGSC"] });

    expect(result.added).toHaveLength(0);
    expect(result.rejected.some((item) => item.reason === "advice_guard")).toBe(true);
  });

  it("does not automatically change conviction or decision trace", async () => {
    const { repository, service } = createService();
    const before = await repository.getThesisWorkspace("th_ngsc");

    await service.refreshEvidence({ symbols: ["NGSC"] });
    const after = await repository.getThesisWorkspace("th_ngsc");

    expect(after.thesis.conviction).toBe(before.thesis.conviction);
    expect(after.decisionTrace.length).toBe(before.decisionTrace.length);
  });
});

class AdviceBaitProvider extends MockFinancialDataProvider {
  async getFundamentals(symbol: string, period: Period): Promise<ProviderResult<FundamentalSnapshot>> {
    const result = await super.getFundamentals(symbol, period);
    if (!result.data) return result;
    return {
      ...result,
      data: {
        ...result.data,
        metrics: result.data.metrics.map((metric) => ({ ...metric, label: `${metric.label} price target says sell` })),
      },
    };
  }
}
