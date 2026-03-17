import { OpenBBRuntimeDataAdapter } from "../src/data-layer/index.ts";

async function main(): Promise<void> {
  const ticker = process.env.OPENBB_SMOKE_TICKER ?? "AAPL";
  const runId = `smoke:${ticker.toUpperCase()}:${Date.now()}`;
  const adapter = OpenBBRuntimeDataAdapter.fromEnv();

  const [company, news, market, macro] = await Promise.all([
    adapter.getCompanySnapshot(ticker, runId),
    adapter.getNewsSnapshot(ticker, runId),
    adapter.getMarketSnapshot(ticker, runId),
    adapter.getMacroLiquiditySnapshot(runId),
  ]);

  const artifacts = adapter.getArtifacts(runId);

  console.log(JSON.stringify(
    {
      runId,
      ticker,
      company: {
        observedAt: company.observedAt,
        companyName: company.companyName,
        keyPoints: company.keyPoints,
      },
      news: {
        observedAt: news.observedAt,
        count: news.items.length,
        headlines: news.items.slice(0, 3).map((item) => item.headline),
      },
      market: {
        observedAt: market.observedAt,
        latestPrice: market.latestPrice ?? null,
        priceChangePct: market.priceChangePct ?? null,
        volume: market.volume ?? null,
        signalSummaries: market.signalSummaries,
      },
      macro: {
        observedAt: macro.observedAt,
        regimeLabel: macro.regimeLabel,
        ratesSummary: macro.ratesSummary,
        liquiditySignals: macro.liquiditySignals,
      },
      evidenceCandidateCount:
        (artifacts?.company?.evidenceCandidates.length ?? 0) +
        (artifacts?.news?.evidenceCandidates.length ?? 0) +
        (artifacts?.market?.evidenceCandidates.length ?? 0) +
        (artifacts?.macro?.evidenceCandidates.length ?? 0),
      degradedReasons: [
        ...(artifacts?.company?.degradedReasons ?? []),
        ...(artifacts?.news?.degradedReasons ?? []),
        ...(artifacts?.market?.degradedReasons ?? []),
        ...(artifacts?.macro?.degradedReasons ?? []),
      ],
    },
    null,
    2,
  ));
}

await main();
