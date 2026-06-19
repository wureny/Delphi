import { describe, expect, it } from "vitest";
import { MockFinancialDataProvider } from "../src/data/mockFinancialDataProvider";
import type { MetricThreshold } from "../src/domain/financialData";
import {
  fundamentalSnapshotToEvidenceProposals,
  priceSnapshotToContext,
  proposalViolatesAdviceGuard,
  providerUnavailableToContext,
} from "../src/domain/researchContext";

const provider = new MockFinancialDataProvider();

describe("financial data boundary evals", () => {
  it("price movement remains market context and does not become thesis evidence", async () => {
    const result = await provider.getPriceSnapshot("NGSC");
    const context = priceSnapshotToContext(result);

    expect(context.kind).toBe("price_snapshot");
    expect(context.title).toMatch(/price snapshot/);
    expect(context.summary).not.toMatch(/buy|sell|price target|conviction/i);
    expect("thesisId" in context).toBe(false);
    expect("assumptionId" in context).toBe(false);
  });

  it("fundamental threshold crossing creates a grounded counter-evidence proposal", async () => {
    const result = await provider.getFundamentals("NGSC", "quarterly");
    const thresholds: MetricThreshold[] = [
      {
        metricKey: "gross_margin",
        label: "gross margin above 70%",
        operator: "<",
        threshold: 70,
        thesisId: "th_ngsc",
        assumptionId: "a_ngsc_3",
        impactWhenBreached: "contradicts",
      },
    ];
    const proposals = fundamentalSnapshotToEvidenceProposals(result, thresholds);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].impact).toBe("contradicts");
    expect(proposals[0].citation).not.toBeNull();
    expect(proposals[0].uncertain).toBe(false);
    expect(proposals[0].rationale).toMatch(/not an automatic thesis change/);
  });

  it("stale provider facts are uncertain and not presented as fresh evidence", async () => {
    const result = await provider.getFundamentals("RETL", "quarterly");
    const proposals = fundamentalSnapshotToEvidenceProposals(result, [
      {
        metricKey: "comparable_sales_growth",
        label: "comparable sales growth above 4%",
        operator: ">=",
        threshold: 4,
        thesisId: "th_retl",
        assumptionId: "a_retl_2",
        impactWhenBreached: "supports",
      },
    ]);

    expect(proposals[0].status).toBe("stale");
    expect(proposals[0].uncertain).toBe(true);
    expect(proposals[0].citation).toBeNull();
  });

  it("unavailable provider data does not fabricate observations or citations", async () => {
    const result = await provider.getFundamentals("NOPE", "quarterly");
    const context = providerUnavailableToContext("NOPE", result.message ?? "Unavailable.");

    expect(result.data).toBeNull();
    expect(context.status).toBe("unavailable");
    expect(context.citation).toBeNull();
    expect(context.summary).not.toMatch(/reported|increased|fell|rose/i);
  });

  it("provider-derived proposals must not contain advice leakage", async () => {
    const result = await provider.getFundamentals("NGSC", "quarterly");
    const proposal = fundamentalSnapshotToEvidenceProposals(result, [
      {
        metricKey: "gross_margin",
        label: "gross margin above 70%",
        operator: "<",
        threshold: 70,
        thesisId: "th_ngsc",
        assumptionId: "a_ngsc_3",
        impactWhenBreached: "contradicts",
      },
    ])[0];

    expect(proposalViolatesAdviceGuard(proposal)).toBe(false);
    expect(`${proposal.title} ${proposal.summary} ${proposal.rationale}`).not.toMatch(/buy|sell|price target|should own/i);
  });
});
