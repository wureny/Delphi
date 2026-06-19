import { describe, expect, it } from "vitest";
import { MockFinancialDataProvider } from "../data/mockFinancialDataProvider";
import {
  fundamentalSnapshotToEvidenceProposals,
  priceSnapshotToContext,
  proposalViolatesAdviceGuard,
  providerUnavailableToContext,
} from "./researchContext";
import type { MetricThreshold } from "./financialData";

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
  {
    metricKey: "revenue_growth_yoy",
    label: "revenue growth above 25%",
    operator: ">=",
    threshold: 25,
    thesisId: "th_ngsc",
    assumptionId: "a_ngsc_1",
    impactWhenBreached: "supports",
  },
];

describe("research context boundary", () => {
  it("treats price snapshots as context only", async () => {
    const provider = new MockFinancialDataProvider();
    const price = await provider.getPriceSnapshot("NGSC");
    const context = priceSnapshotToContext(price);

    expect(context.kind).toBe("price_snapshot");
    expect(context.summary).toMatch(/one-day change -5%/);
    expect("impact" in context).toBe(false);
    expect(context.citation?.label).toBe("Mock price provider");
  });

  it("creates evidence proposals only when fundamental metrics cross tracked thresholds", async () => {
    const provider = new MockFinancialDataProvider();
    const fundamentals = await provider.getFundamentals("NGSC", "quarterly");
    const proposals = fundamentalSnapshotToEvidenceProposals(fundamentals, thresholds);

    expect(proposals).toHaveLength(2);
    expect(proposals.map((proposal) => proposal.impact)).toEqual(["contradicts", "supports"]);
    expect(proposals[0].assumptionId).toBe("a_ngsc_3");
    expect(proposals[0].citation?.label).toBe("Mock fundamentals provider");
    expect(proposals[0].rationale).toMatch(/proposal, not an automatic thesis change/);
  });

  it("marks stale provider-derived proposals uncertain", async () => {
    const provider = new MockFinancialDataProvider();
    const fundamentals = await provider.getFundamentals("RETL", "quarterly");
    const proposals = fundamentalSnapshotToEvidenceProposals(fundamentals, [
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

    expect(proposals).toHaveLength(1);
    expect(proposals[0].stale).toBe(true);
    expect(proposals[0].uncertain).toBe(true);
    expect(proposals[0].citation).toBeNull();
    expect(proposals[0].confidence).toBe("low");
  });

  it("represents unavailable provider data without fabricating claims", async () => {
    const provider = new MockFinancialDataProvider();
    const missing = await provider.getFundamentals("MISSING", "quarterly");
    const proposals = fundamentalSnapshotToEvidenceProposals(missing, thresholds);
    const context = providerUnavailableToContext("MISSING", missing.message ?? "No data.");

    expect(proposals).toEqual([]);
    expect(context.status).toBe("unavailable");
    expect(context.uncertain).toBe(true);
    expect(context.citation).toBeNull();
  });

  it("detects advice language in provider-derived proposals", async () => {
    const provider = new MockFinancialDataProvider();
    const fundamentals = await provider.getFundamentals("NGSC", "quarterly");
    const proposal = fundamentalSnapshotToEvidenceProposals(fundamentals, thresholds)[0];

    expect(proposalViolatesAdviceGuard(proposal)).toBe(false);
    expect(
      proposalViolatesAdviceGuard({
        ...proposal,
        rationale: "Gross margin broke the threshold, so users should sell at a lower price target.",
      }),
    ).toBe(true);
  });
});
