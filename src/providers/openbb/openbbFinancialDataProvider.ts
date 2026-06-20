import type {
  AssetProfile,
  FinancialDataProvider,
  FundamentalMetric,
  FundamentalSnapshot,
  MarketEvent,
  Period,
  PriceSnapshot,
  ProviderErrorCode,
  ProviderProvenance,
  ProviderResult,
} from "../../domain/financialData";

export type OpenBBRawRecord = Record<string, unknown>;

export interface OpenBBRawClient {
  getProfile(symbol: string): Promise<OpenBBRawRecord | null>;
  getQuote(symbol: string): Promise<OpenBBRawRecord | null>;
  getFundamentals(symbol: string, period: Period): Promise<OpenBBRawRecord[] | null>;
  getEvents(symbol: string): Promise<OpenBBRawRecord[] | null>;
  searchAssets(query: string): Promise<OpenBBRawRecord[] | null>;
}

export interface OpenBBFinancialDataProviderOptions {
  now?: () => string;
  staleAfterDays?: number;
  sourceUrl?: string;
}

export class OpenBBProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OpenBBProviderError";
  }
}

const DEFAULT_STALE_AFTER_DAYS = 90;

export class OpenBBFinancialDataProvider implements FinancialDataProvider {
  readonly name = "openbb" as const;
  private readonly now: () => string;
  private readonly staleAfterDays: number;
  private readonly sourceUrl: string;

  constructor(
    private readonly client: OpenBBRawClient,
    options: OpenBBFinancialDataProviderOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.staleAfterDays = options.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
    this.sourceUrl = options.sourceUrl ?? "https://openbb.co";
  }

  async getAssetProfile(symbol: string): Promise<ProviderResult<AssetProfile>> {
    return this.request("OpenBB company profile", symbol, async () => {
      const raw = await this.client.getProfile(symbol);
      if (!raw) throw new OpenBBProviderError("not_found", `No OpenBB profile available for ${normalizeSymbol(symbol)}.`);
      return normalizeProfile(raw, symbol);
    });
  }

  async getPriceSnapshot(symbol: string): Promise<ProviderResult<PriceSnapshot>> {
    return this.request("OpenBB market quote", symbol, async () => {
      const raw = await this.client.getQuote(symbol);
      if (!raw) throw new OpenBBProviderError("not_found", `No OpenBB quote available for ${normalizeSymbol(symbol)}.`);
      return normalizeQuote(raw, symbol);
    });
  }

  async getFundamentals(symbol: string, period: Period): Promise<ProviderResult<FundamentalSnapshot>> {
    return this.request("OpenBB fundamentals", symbol, async () => {
      const raw = await this.client.getFundamentals(symbol, period);
      if (!raw) throw new OpenBBProviderError("not_found", `No OpenBB fundamentals available for ${normalizeSymbol(symbol)}.`);
      const metrics = raw.map((row) => normalizeFundamentalMetric(row, period));
      return {
        symbol: normalizeSymbol(symbol),
        metrics,
      };
    });
  }

  async getEvents(symbol: string): Promise<ProviderResult<MarketEvent[]>> {
    return this.request("OpenBB events", symbol, async () => {
      const raw = await this.client.getEvents(symbol);
      if (!raw) return [];
      return raw.map((row, index) => normalizeEvent(row, symbol, index));
    });
  }

  async searchAssets(query: string): Promise<ProviderResult<AssetProfile[]>> {
    return this.request("OpenBB asset search", query, async () => {
      const raw = await this.client.searchAssets(query);
      if (!raw) return [];
      return raw.map((row) => normalizeProfile(row, stringValue(row, ["symbol", "ticker"]) ?? query));
    });
  }

  private async request<T>(sourceName: string, symbolOrQuery: string, load: () => Promise<T>): Promise<ProviderResult<T>> {
    const started = Date.now();
    const receivedAt = this.now();
    try {
      const data = await load();
      const observedAt = observedAtFromData(data) ?? receivedAt;
      return {
        status: isStale(receivedAt, observedAt, this.staleAfterDays) ? "stale" : "available",
        data,
        provenance: this.provenance(sourceName, observedAt, receivedAt),
        entitlement: "allowed",
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      const normalized = normalizeProviderError(error);
      return {
        status: "unavailable",
        data: null,
        provenance: this.provenance(sourceName, receivedAt, receivedAt),
        entitlement: normalized.code === "entitlement_denied" ? "denied" : "unknown",
        latencyMs: Date.now() - started,
        errorCode: normalized.code,
        message: safeProviderMessage(normalizeSymbol(symbolOrQuery), normalized.code),
      };
    }
  }

  private provenance(sourceName: string, observedAt: string, receivedAt: string): ProviderProvenance {
    return {
      provider: "openbb",
      sourceName,
      sourceUrl: this.sourceUrl,
      observedAt,
      receivedAt,
    };
  }
}

function normalizeProfile(raw: OpenBBRawRecord, fallbackSymbol: string): AssetProfile {
  const symbol = stringValue(raw, ["symbol", "ticker"]) ?? normalizeSymbol(fallbackSymbol);
  const name = stringValue(raw, ["name", "company_name", "long_name"]);
  const exchange = stringValue(raw, ["exchange", "exchange_name"]);
  const currency = stringValue(raw, ["currency", "currency_code"]) ?? "USD";

  if (!name || !exchange) {
    throw new OpenBBProviderError("malformed_response", "OpenBB profile response missing required fields.");
  }

  return {
    symbol: normalizeSymbol(symbol),
    name,
    exchange,
    sector: stringValue(raw, ["sector"]) ?? undefined,
    industry: stringValue(raw, ["industry"]) ?? undefined,
    currency,
    marketCap: numberValue(raw, ["market_cap", "marketCap"]) ?? undefined,
  };
}

function normalizeQuote(raw: OpenBBRawRecord, fallbackSymbol: string): PriceSnapshot {
  const symbol = stringValue(raw, ["symbol", "ticker"]) ?? normalizeSymbol(fallbackSymbol);
  const lastPrice = numberValue(raw, ["last_price", "lastPrice", "last", "price", "close"]);
  const previousClose = numberValue(raw, ["previous_close", "previousClose", "prev_close"]);
  const volume = numberValue(raw, ["volume"]);
  const changePercent =
    numberValue(raw, ["change_percent", "changePercent"]) ??
    (lastPrice !== null && previousClose !== null && previousClose !== 0
      ? Number((((lastPrice - previousClose) / previousClose) * 100).toFixed(2))
      : null);

  if (lastPrice === null || previousClose === null || changePercent === null || volume === null) {
    throw new OpenBBProviderError("malformed_response", "OpenBB quote response missing required fields.");
  }

  return {
    symbol: normalizeSymbol(symbol),
    lastPrice,
    previousClose,
    changePercent,
    volume,
  };
}

function normalizeFundamentalMetric(raw: OpenBBRawRecord, fallbackPeriod: Period): FundamentalMetric {
  const key = stringValue(raw, ["key", "metric", "metric_key"]);
  const label = stringValue(raw, ["label", "name", "metric_label"]) ?? key;
  const value = numberValue(raw, ["value"]);
  const unit = stringValue(raw, ["unit"]);
  const period = periodValue(raw, ["period"]) ?? fallbackPeriod;
  const fiscalPeriod = stringValue(raw, ["fiscal_period", "fiscalPeriod", "date", "period_ending"]);

  if (!key || !label || value === null || !isMetricUnit(unit) || !fiscalPeriod) {
    throw new OpenBBProviderError("malformed_response", "OpenBB fundamentals response missing required fields.");
  }

  return {
    key,
    label,
    value,
    unit,
    period,
    fiscalPeriod,
  };
}

function normalizeEvent(raw: OpenBBRawRecord, fallbackSymbol: string, index: number): MarketEvent {
  const symbol = stringValue(raw, ["symbol", "ticker"]) ?? normalizeSymbol(fallbackSymbol);
  const title = stringValue(raw, ["title", "event", "name"]);
  const date = stringValue(raw, ["date", "datetime", "start"]);
  const source = stringValue(raw, ["source", "provider"]) ?? "OpenBB events";

  if (!title || !date) {
    throw new OpenBBProviderError("malformed_response", "OpenBB event response missing required fields.");
  }

  return {
    id: stringValue(raw, ["id"]) ?? `openbb-event-${normalizeSymbol(symbol).toLowerCase()}-${index}`,
    symbol: normalizeSymbol(symbol),
    title,
    date,
    kind: eventKindValue(raw, ["kind", "type"]),
    source,
  };
}

function normalizeProviderError(error: unknown): { code: ProviderErrorCode } {
  if (error instanceof OpenBBProviderError) return { code: error.code };
  if (error instanceof Error) {
    const text = `${error.name} ${error.message}`.toLowerCase();
    if (text.includes("entitlement") || text.includes("unauthorized") || text.includes("forbidden")) return { code: "entitlement_denied" };
    if (text.includes("timeout") || text.includes("timed out")) return { code: "timeout" };
    if (text.includes("rate")) return { code: "rate_limited" };
    if (text.includes("not found")) return { code: "not_found" };
    if (text.includes("unavailable")) return { code: "provider_unavailable" };
  }
  return { code: "unknown" };
}

function safeProviderMessage(symbol: string, code: ProviderErrorCode): string {
  switch (code) {
    case "entitlement_denied":
      return `OpenBB data access is not entitled for ${symbol}.`;
    case "timeout":
      return `OpenBB request timed out for ${symbol}.`;
    case "rate_limited":
      return `OpenBB request was rate limited for ${symbol}.`;
    case "not_found":
      return `OpenBB data was not found for ${symbol}.`;
    case "malformed_response":
      return `OpenBB returned incomplete data for ${symbol}.`;
    case "provider_unavailable":
      return `OpenBB data is unavailable for ${symbol}.`;
    case "unknown":
      return `OpenBB data request failed for ${symbol}.`;
  }
}

function observedAtFromData(data: unknown): string | null {
  if (Array.isArray(data)) {
    const dates = data.map((item) => observedAtFromData(item)).filter((item): item is string => Boolean(item));
    return dates[0] ?? null;
  }
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const direct = stringValue(record, ["observed_at", "observedAt", "date", "as_of", "period_ending", "fiscalPeriod"]);
  if (direct) return direct;
  const metrics = record.metrics;
  if (Array.isArray(metrics)) {
    const dates = metrics.map((item) => observedAtFromData(item)).filter((item): item is string => Boolean(item));
    return dates[0] ?? null;
  }
  return null;
}

function isStale(receivedAt: string, observedAt: string, staleAfterDays: number): boolean {
  const received = new Date(receivedAt).getTime();
  const observed = new Date(observedAt).getTime();
  if (Number.isNaN(received) || Number.isNaN(observed)) return false;
  return received - observed > staleAfterDays * 86_400_000;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function stringValue(record: OpenBBRawRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numberValue(record: OpenBBRawRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function periodValue(record: OpenBBRawRecord, keys: string[]): Period | null {
  const value = stringValue(record, keys);
  if (value === "annual" || value === "quarterly" || value === "ttm") return value;
  return null;
}

function isMetricUnit(value: string | null): value is FundamentalMetric["unit"] {
  return value === "percent" || value === "ratio" || value === "currency" || value === "count";
}

function eventKindValue(raw: OpenBBRawRecord, keys: string[]): MarketEvent["kind"] {
  const value = stringValue(raw, keys);
  if (
    value === "earnings" ||
    value === "filing" ||
    value === "investor_day" ||
    value === "product" ||
    value === "regulatory" ||
    value === "other"
  ) {
    return value;
  }
  return "other";
}
