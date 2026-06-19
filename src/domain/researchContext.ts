import type {
  FinancialContext,
  FinancialEvidenceProposal,
  FundamentalMetric,
  FundamentalSnapshot,
  MetricThreshold,
  PriceSnapshot,
  ProviderResult,
} from "./financialData";

export function priceSnapshotToContext(result: ProviderResult<PriceSnapshot>): FinancialContext {
  if (!result.data) {
    return unavailableContext("price_snapshot", "UNKNOWN", result.message ?? "Price data unavailable.");
  }

  const price = result.data;
  return {
    id: `context-price-${price.symbol}`,
    kind: "price_snapshot",
    symbol: price.symbol,
    title: `${price.symbol} price snapshot`,
    summary: `${price.symbol} last traded at ${price.lastPrice}; one-day change ${price.changePercent}%.`,
    status: result.status,
    stale: result.status === "stale",
    citation: {
      label: result.provenance.sourceName,
      url: result.provenance.sourceUrl ?? "#",
    },
    uncertain: false,
  };
}

export function fundamentalSnapshotToEvidenceProposals(
  result: ProviderResult<FundamentalSnapshot>,
  thresholds: MetricThreshold[],
): FinancialEvidenceProposal[] {
  if (!result.data) return [];

  const proposals: FinancialEvidenceProposal[] = [];
  for (const metric of result.data.metrics) {
    const matchingThresholds = thresholds.filter((threshold) => threshold.metricKey === metric.key);
    for (const threshold of matchingThresholds) {
      if (!crossesThreshold(metric.value, threshold.operator, threshold.threshold)) continue;
      const stale = result.status === "stale";
      proposals.push({
        id: `proposal-${result.data.symbol}-${metric.key}-${threshold.assumptionId}`,
        kind: "fundamental_snapshot",
        symbol: result.data.symbol,
        title: `${metric.label} crossed ${threshold.label}`,
        summary: `${metric.label} was ${formatMetric(metric)}, crossing the tracked threshold ${threshold.operator} ${threshold.threshold}.`,
        status: result.status,
        stale,
        citation: stale
          ? null
          : {
              label: result.provenance.sourceName,
              url: result.provenance.sourceUrl ?? "#",
            },
        uncertain: stale,
        thesisId: threshold.thesisId,
        assumptionId: threshold.assumptionId,
        impact: threshold.impactWhenBreached,
        confidence: stale ? "low" : "medium",
        metric,
        rationale: `${metric.label} crossed the tracked assumption threshold; provider data creates a review proposal, not an automatic thesis change.`,
      });
    }
  }
  return proposals;
}

export function providerUnavailableToContext(symbol: string, message: string): FinancialContext {
  return unavailableContext("fundamental_snapshot", symbol, message);
}

export function containsAdviceLanguage(text: string): boolean {
  return /\b(buy|sell|price target|target price|enter|exit|double by|should own|should short)\b/i.test(text);
}

export function proposalViolatesAdviceGuard(proposal: FinancialEvidenceProposal): boolean {
  return containsAdviceLanguage(`${proposal.title} ${proposal.summary} ${proposal.rationale}`);
}

function crossesThreshold(value: number, operator: MetricThreshold["operator"], threshold: number): boolean {
  switch (operator) {
    case ">":
      return value > threshold;
    case ">=":
      return value >= threshold;
    case "<":
      return value < threshold;
    case "<=":
      return value <= threshold;
  }
}

function formatMetric(metric: FundamentalMetric): string {
  if (metric.unit === "percent") return `${metric.value}%`;
  return String(metric.value);
}

function unavailableContext(kind: FinancialContext["kind"], symbol: string, message: string): FinancialContext {
  return {
    id: `context-unavailable-${kind}-${symbol}`,
    kind,
    symbol,
    title: "Provider data unavailable",
    summary: message,
    status: "unavailable",
    stale: false,
    citation: null,
    uncertain: true,
  };
}
