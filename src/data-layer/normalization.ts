import { createHash } from "node:crypto";

import type {
  CompanySnapshot,
  MacroLiquiditySnapshot,
  MarketSnapshot,
  NewsItemSnapshot,
  NewsSnapshot,
} from "../orchestration/agent-runtime.ts";
import {
  defaultRefreshPolicies,
  ontologySupportMapping,
  type CacheStatus,
  type DataRefreshPolicy,
  type EvidenceCandidate,
  type RawSnapshotRecord,
  type RawSnapshotSourceType,
  type SnapshotArtifacts,
} from "./contracts.ts";

interface SourceRecord {
  provider: string;
  sourceType: RawSnapshotSourceType;
  requestParams: Record<string, string | number | boolean | undefined>;
  payload: unknown;
  fetchedAt: string;
}

interface NormalizeCompanyInput {
  runId: string;
  ticker: string;
  cacheStatus: CacheStatus;
  profile: SourceRecord;
  filings?: SourceRecord | null;
}

interface NormalizeNewsInput {
  runId: string;
  ticker: string;
  cacheStatus: CacheStatus;
  news: SourceRecord;
}

interface NormalizeMarketInput {
  runId: string;
  ticker: string;
  cacheStatus: CacheStatus;
  quote: SourceRecord;
  historical: SourceRecord;
}

interface NormalizeMacroInput {
  runId: string;
  cacheStatus: CacheStatus;
  effr: SourceRecord;
  treasuryRates: SourceRecord;
}

export function normalizeCompanyBundle(
  input: NormalizeCompanyInput,
): SnapshotArtifacts<CompanySnapshot> {
  const profileSnapshot = buildRawSnapshot(input.runId, input.ticker, input.profile);
  const rawSnapshots = [profileSnapshot];
  const degradedReasons: string[] = [];
  const profileRow = getFirstRecord(input.profile.payload);
  const filingRows = input.filings ? getRecordArray(input.filings.payload) : [];

  if (input.filings) {
    rawSnapshots.push(buildRawSnapshot(input.runId, input.ticker, input.filings));
  }

  const companyName =
    getString(profileRow, ["name", "company_name", "long_name", "legal_name"]) ?? input.ticker;
  const businessSummary =
    normalizeText(
      getString(profileRow, [
        "long_description",
        "longBusinessSummary",
        "business_summary",
        "description",
        "short_description",
      ]),
    ) ?? `${companyName} company profile is available, but the provider did not return a business summary.`;

  const sector = getString(profileRow, ["sector", "sector_name"]);
  const industry = getString(profileRow, ["industry", "industry_category", "industry_name"]);
  const exchange = getString(profileRow, ["exchange", "primary_exchange", "full_exchange_name"]);
  const latestFiling = filingRows[0];
  const latestFilingType = getString(latestFiling, ["form", "report_type", "type"]);
  const latestFilingDate = getString(latestFiling, ["filing_date", "date", "accepted_date"]);

  const keyPoints = [
    sector || industry
      ? `${companyName} is classified in ${joinDefined([sector, industry], " / ")}.`
      : undefined,
    exchange ? `Primary listing venue: ${exchange}.` : undefined,
    latestFilingType || latestFilingDate
      ? `Latest filing context: ${joinDefined([latestFilingType, latestFilingDate], " on ")}.`
      : undefined,
  ].filter(isNonEmptyString);

  if (!sector && !industry && !exchange) {
    degradedReasons.push("Company profile is missing sector/industry/exchange metadata.");
  }

  const observedAt = latestDefined([
    getString(profileRow, ["updated", "updated_at", "date"]),
    latestFilingDate,
    input.profile.fetchedAt,
  ]);

  const snapshot: CompanySnapshot = {
    ticker: input.ticker,
    observedAt,
    companyName,
    businessSummary,
    keyPoints,
  };

  const evidenceCandidates: EvidenceCandidate[] = [
    createEvidenceCandidate({
      runId: input.runId,
      ticker: input.ticker,
      provider: input.profile.provider,
      sourceType: "company_profile",
      sourceRef: `company_profile:${input.ticker}`,
      observedAt,
      summary: businessSummary,
      supportedObjects: ontologySupportMapping.company_profile,
      rawSnapshotRef: profileSnapshot.snapshotId,
    }),
  ];

  if (latestFilingType || latestFilingDate) {
    const filingSnapshot = rawSnapshots.find((snapshotRecord) => snapshotRecord.sourceType === "company_filings");
    if (filingSnapshot) {
      evidenceCandidates.push(
        createEvidenceCandidate({
          runId: input.runId,
          ticker: input.ticker,
          provider: input.filings?.provider ?? input.profile.provider,
          sourceType: "company_filings",
          sourceRef:
            getString(latestFiling, ["report_url", "filing_url", "url"]) ??
            `filing:${input.ticker}:${latestFilingDate ?? "latest"}`,
          observedAt: latestFilingDate ?? observedAt,
          summary: `${companyName} filed ${latestFilingType ?? "an update"}${latestFilingDate ? ` on ${latestFilingDate}` : ""}.`,
          supportedObjects: ontologySupportMapping.company_filings,
          rawSnapshotRef: filingSnapshot.snapshotId,
        }),
      );
    }
  }

  return {
    snapshot,
    rawSnapshots,
    evidenceCandidates,
    degradedReasons,
    cacheStatus: input.cacheStatus,
  };
}

export function normalizeNewsBundle(
  input: NormalizeNewsInput,
): SnapshotArtifacts<NewsSnapshot> {
  const newsSnapshot = buildRawSnapshot(input.runId, input.ticker, input.news);
  const rawSnapshots = [newsSnapshot];
  const rows = getRecordArray(input.news.payload);
  const degradedReasons: string[] = [];
  const items: NewsItemSnapshot[] = rows
    .slice(0, 6)
    .map((row, index) => {
      const headline =
        normalizeText(getString(row, ["headline", "title"])) ??
        `${input.ticker} news item ${index + 1}`;
      const summary =
        normalizeText(
          getString(row, ["summary", "snippet", "text", "description", "body"]),
        ) ?? headline;
      const publishedAt =
        getString(row, ["published_at", "published", "date", "datetime"]) ??
        input.news.fetchedAt;
      const url = getString(row, ["url", "article_url", "link"]);

      return {
        id:
          getString(row, ["id", "uuid"]) ??
          stableId(`${input.ticker}:news:${publishedAt}:${headline}`),
        headline,
        summary,
        publishedAt,
        ...(url ? { url } : {}),
      };
    });

  if (items.length === 0) {
    degradedReasons.push("No recent company news was returned by the provider.");
  }

  const snapshot: NewsSnapshot = {
    ticker: input.ticker,
    observedAt: items[0]?.publishedAt ?? input.news.fetchedAt,
    items,
  };

  const evidenceCandidates = items.map((item) =>
    createEvidenceCandidate({
      runId: input.runId,
      ticker: input.ticker,
      provider: input.news.provider,
      sourceType: "company_news",
      sourceRef: item.url ?? item.id,
      observedAt: item.publishedAt,
      summary: item.summary,
      supportedObjects: ontologySupportMapping.company_news,
      rawSnapshotRef: newsSnapshot.snapshotId,
    }));

  return {
    snapshot,
    rawSnapshots,
    evidenceCandidates,
    degradedReasons,
    cacheStatus: input.cacheStatus,
  };
}

export function normalizeMarketBundle(
  input: NormalizeMarketInput,
): SnapshotArtifacts<MarketSnapshot> {
  const quoteSnapshot = buildRawSnapshot(input.runId, input.ticker, input.quote);
  const historicalSnapshot = buildRawSnapshot(input.runId, input.ticker, input.historical);
  const rawSnapshots = [quoteSnapshot, historicalSnapshot];
  const quoteRow = getFirstRecord(input.quote.payload);
  const historicalRows = getRecordArray(input.historical.payload)
    .sort(compareByDate)
    .slice(-30);
  const degradedReasons: string[] = [];

  const latestBar = historicalRows.at(-1);
  const previousBar = historicalRows.at(-2);
  const latestPrice =
    getNumber(quoteRow, ["last_price", "price", "last", "close"]) ??
    getNumber(latestBar, ["close", "adj_close"]);
  const previousClose =
    getNumber(quoteRow, ["prev_close", "previous_close", "previousClose"]) ??
    getNumber(previousBar, ["close", "adj_close"]);
  const priceChangePct =
    getNumber(quoteRow, ["change_percent", "percent_change", "changePercent"]) ??
    computePercentChange(latestPrice, previousClose);
  const volume =
    getNumber(quoteRow, ["volume", "share_volume"]) ??
    getNumber(latestBar, ["volume"]);

  const closes = historicalRows
    .map((row) => getNumber(row, ["close", "adj_close"]))
    .filter(isDefinedNumber);
  const volumes = historicalRows
    .map((row) => getNumber(row, ["volume"]))
    .filter(isDefinedNumber);
  const movingAverage20 = average(closes.slice(-20));
  const averageVolume20 = average(volumes.slice(-20));
  const signalSummaries = [
    latestPrice !== undefined && movingAverage20 !== undefined
      ? `Price is ${describeDistanceFromAverage(latestPrice, movingAverage20)} the 20-day average.`
      : undefined,
    priceChangePct !== undefined
      ? `One-day move is ${formatSignedPercent(priceChangePct)} versus the previous close.`
      : undefined,
    volume !== undefined && averageVolume20 !== undefined
      ? `Volume is ${describeDistanceFromAverage(volume, averageVolume20)} the 20-day average.`
      : undefined,
  ].filter(isNonEmptyString);

  if (signalSummaries.length === 0) {
    degradedReasons.push("Market snapshot is missing enough quote/history data to derive signal summaries.");
  }

  if (latestPrice === undefined) {
    degradedReasons.push("Latest price is unavailable from both quote and historical sources.");
  }

  const snapshot: MarketSnapshot = {
    ticker: input.ticker,
    observedAt:
      getString(quoteRow, ["updated", "updated_at", "date"]) ??
      getString(latestBar, ["date", "datetime"]) ??
      input.quote.fetchedAt,
    signalSummaries,
    ...(latestPrice !== undefined ? { latestPrice } : {}),
    ...(priceChangePct !== undefined ? { priceChangePct } : {}),
    ...(volume !== undefined ? { volume } : {}),
  };

  const evidenceCandidates = signalSummaries.map((summary, index) =>
    createEvidenceCandidate({
      runId: input.runId,
      ticker: input.ticker,
      provider: index === 1 ? input.quote.provider : input.historical.provider,
      sourceType: index === 1 ? "market_quote" : "market_historical",
      sourceRef: `${input.ticker}:market_signal:${index + 1}`,
      observedAt: snapshot.observedAt,
      summary,
      supportedObjects: ontologySupportMapping[index === 1 ? "market_quote" : "market_historical"],
      rawSnapshotRef: index === 1 ? quoteSnapshot.snapshotId : historicalSnapshot.snapshotId,
    }));

  return {
    snapshot,
    rawSnapshots,
    evidenceCandidates,
    degradedReasons,
    cacheStatus: input.cacheStatus,
  };
}

export function normalizeMacroBundle(
  input: NormalizeMacroInput,
): SnapshotArtifacts<MacroLiquiditySnapshot> {
  const effrSnapshot = buildRawSnapshot(input.runId, undefined, input.effr);
  const treasurySnapshot = buildRawSnapshot(input.runId, undefined, input.treasuryRates);
  const rawSnapshots = [effrSnapshot, treasurySnapshot];
  const effrRows = getRecordArray(input.effr.payload).sort(compareByDate);
  const treasuryRows = getRecordArray(input.treasuryRates.payload).sort(compareByDate);
  const latestEffr = effrRows.at(-1);
  const previousEffr = effrRows.at(-2);
  const latestTreasury = treasuryRows.at(-1);
  const degradedReasons: string[] = [];

  const effrRate = getNumber(latestEffr, ["rate", "value", "effr"]);
  const previousEffrRate = getNumber(previousEffr, ["rate", "value", "effr"]);
  const treasury2y = getNumber(latestTreasury, ["year_2", "2y", "y2"]);
  const treasury10y = getNumber(latestTreasury, ["year_10", "10y", "y10"]);
  const slope10y2y =
    treasury10y !== undefined && treasury2y !== undefined
      ? treasury10y - treasury2y
      : undefined;
  const regimeLabel = classifyLiquidityRegime(effrRate, slope10y2y);
  const ratesSummary = buildRatesSummary(effrRate, treasury2y, treasury10y, slope10y2y);

  if (effrRate === undefined) {
    degradedReasons.push("EFFR data is unavailable.");
  }

  if (treasury2y === undefined || treasury10y === undefined) {
    degradedReasons.push("Treasury curve data is incomplete.");
  }

  const liquiditySignals = [
    describeRateDirection(effrRate, previousEffrRate),
    describeCurveSignal(slope10y2y),
    ratesSummary,
  ].filter(isNonEmptyString);

  const observedAt = latestDefined([
    getString(latestEffr, ["date", "effective_date"]),
    getString(latestTreasury, ["date"]),
    input.effr.fetchedAt,
  ]);

  const snapshot: MacroLiquiditySnapshot = {
    observedAt,
    regimeLabel,
    ratesSummary,
    liquiditySignals,
  };

  const evidenceCandidates: EvidenceCandidate[] = [
    createEvidenceCandidate({
      runId: input.runId,
      provider: input.effr.provider,
      sourceType: "macro_effr",
      sourceRef: `macro_effr:${observedAt}`,
      observedAt,
      summary: describeRateDirection(effrRate, previousEffrRate) ?? ratesSummary,
      supportedObjects: ontologySupportMapping.macro_effr,
      rawSnapshotRef: effrSnapshot.snapshotId,
    }),
    createEvidenceCandidate({
      runId: input.runId,
      provider: input.treasuryRates.provider,
      sourceType: "macro_treasury_rates",
      sourceRef: `macro_treasury_rates:${observedAt}`,
      observedAt,
      summary: describeCurveSignal(slope10y2y) ?? ratesSummary,
      supportedObjects: ontologySupportMapping.macro_treasury_rates,
      rawSnapshotRef: treasurySnapshot.snapshotId,
    }),
  ].filter((candidate) => candidate.summary.length > 0);

  return {
    snapshot,
    rawSnapshots,
    evidenceCandidates,
    degradedReasons,
    cacheStatus: input.cacheStatus,
  };
}

export function withStaleFallbackReason<TSnapshot>(
  bundle: SnapshotArtifacts<TSnapshot>,
  reason: string,
): SnapshotArtifacts<TSnapshot> {
  return {
    ...bundle,
    degradedReasons: [...bundle.degradedReasons, reason],
    cacheStatus: "stale_fallback",
  };
}

function buildRawSnapshot(
  runId: string,
  ticker: string | undefined,
  source: SourceRecord,
): RawSnapshotRecord {
  const cachePolicy = defaultRefreshPolicies[source.sourceType];
  const requestKey = stableId(`${source.sourceType}:${JSON.stringify(source.requestParams)}`);

  return {
    snapshotId: stableId(`${runId}:${source.sourceType}:${source.fetchedAt}:${requestKey}`),
    runId,
    provider: source.provider,
    sourceType: source.sourceType,
    fetchedAt: source.fetchedAt,
    requestKey,
    requestParams: source.requestParams,
    cachePolicy,
    payload: source.payload,
    ...(ticker ? { ticker } : {}),
  };
}

export function makeSourceRecord(
  sourceType: RawSnapshotSourceType,
  provider: string,
  requestParams: Record<string, string | number | boolean | undefined>,
  payload: unknown,
  fetchedAt: string = new Date().toISOString(),
): SourceRecord {
  return {
    sourceType,
    provider,
    requestParams,
    payload,
    fetchedAt,
  };
}

function createEvidenceCandidate(
  candidate: Omit<EvidenceCandidate, "candidateId">,
): EvidenceCandidate {
  return {
    ...candidate,
    candidateId: stableId(
      `${candidate.runId}:${candidate.sourceType}:${candidate.sourceRef}:${candidate.observedAt}:${candidate.summary}`,
    ),
  };
}

function classifyLiquidityRegime(
  effrRate: number | undefined,
  slope10y2y: number | undefined,
): string {
  if (effrRate !== undefined && slope10y2y !== undefined) {
    if (effrRate >= 5 && slope10y2y <= 0) {
      return "tightening_pressure";
    }

    if (effrRate <= 3 && slope10y2y >= 0.5) {
      return "supportive";
    }

    if (slope10y2y < 0) {
      return "cautious";
    }
  }

  return "neutral_to_supportive";
}

function buildRatesSummary(
  effrRate: number | undefined,
  treasury2y: number | undefined,
  treasury10y: number | undefined,
  slope10y2y: number | undefined,
): string {
  const parts = [
    effrRate !== undefined ? `EFFR is ${formatPercent(effrRate)}` : undefined,
    treasury2y !== undefined ? `2Y Treasury is ${formatPercent(treasury2y)}` : undefined,
    treasury10y !== undefined ? `10Y Treasury is ${formatPercent(treasury10y)}` : undefined,
    slope10y2y !== undefined ? `10Y-2Y slope is ${formatBps(slope10y2y)}` : undefined,
  ].filter(isNonEmptyString);

  return parts.length > 0
    ? `${parts.join(", ")}.`
    : "Macro rates data is incomplete, so the liquidity read is low-confidence.";
}

function describeRateDirection(
  current: number | undefined,
  previous: number | undefined,
): string | undefined {
  if (current === undefined) {
    return undefined;
  }

  if (previous === undefined) {
    return `Policy-sensitive short rates are currently around ${formatPercent(current)}.`;
  }

  const delta = current - previous;
  if (Math.abs(delta) < 0.02) {
    return `Policy-sensitive short rates are broadly stable near ${formatPercent(current)}.`;
  }

  return `Policy-sensitive short rates are ${delta > 0 ? "rising" : "falling"} to ${formatPercent(current)}.`;
}

function describeCurveSignal(slope10y2y: number | undefined): string | undefined {
  if (slope10y2y === undefined) {
    return undefined;
  }

  if (slope10y2y < 0) {
    return `The 10Y-2Y Treasury curve remains inverted at ${formatBps(slope10y2y)}, which points to tighter liquidity conditions.`;
  }

  if (slope10y2y > 0.5) {
    return `The 10Y-2Y Treasury curve is positively sloped at ${formatBps(slope10y2y)}, which is more supportive for liquidity-sensitive assets.`;
  }

  return `The 10Y-2Y Treasury curve is only modestly positive at ${formatBps(slope10y2y)}, which suggests a neutral liquidity backdrop.`;
}

function compareByDate(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): number {
  const leftDate = getString(left, ["date", "datetime", "published_at"]) ?? "";
  const rightDate = getString(right, ["date", "datetime", "published_at"]) ?? "";
  return leftDate.localeCompare(rightDate);
}

function getFirstRecord(payload: unknown): Record<string, unknown> | undefined {
  return getRecordArray(payload)[0];
}

function getRecordArray(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const maybeResults = (payload as { results?: unknown }).results;
  if (Array.isArray(maybeResults)) {
    return maybeResults.filter(isRecord);
  }

  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  return isRecord(payload) ? [payload] : [];
}

function getString(
  row: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (!row) {
    return undefined;
  }

  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function getNumber(
  row: Record<string, unknown> | undefined,
  keys: string[],
): number | undefined {
  if (!row) {
    return undefined;
  }

  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function normalizeText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 320);
}

function stableId(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function latestDefined(values: Array<string | undefined>): string {
  for (const value of values) {
    if (value) {
      return value;
    }
  }

  return new Date().toISOString();
}

function joinDefined(values: Array<string | undefined>, separator: string): string {
  return values.filter(isNonEmptyString).join(separator);
}

function average(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computePercentChange(
  latest: number | undefined,
  previous: number | undefined,
): number | undefined {
  if (latest === undefined || previous === undefined || previous === 0) {
    return undefined;
  }

  return ((latest - previous) / previous) * 100;
}

function describeDistanceFromAverage(
  current: number,
  averageValue: number,
): string {
  if (averageValue === 0) {
    return "near";
  }

  const deltaPct = ((current - averageValue) / averageValue) * 100;
  if (Math.abs(deltaPct) < 1) {
    return "near";
  }

  return `${deltaPct > 0 ? "above" : "below"} by ${Math.abs(deltaPct).toFixed(1)}%`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatBps(value: number): string {
  return `${(value * 100).toFixed(0)} bps`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isDefinedNumber(value: number | undefined): value is number {
  return value !== undefined;
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value && value.length > 0);
}
