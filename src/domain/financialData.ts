import type { Citation, Confidence, Impact } from "./types";

export type FinancialProviderName = "mock" | "openbb";
export type FinancialDataKind = "asset_profile" | "price_snapshot" | "fundamental_snapshot" | "market_event";
export type ProviderDataStatus = "available" | "unavailable" | "stale";
export type ProviderEntitlement = "allowed" | "denied" | "unknown";
export type ProviderErrorCode =
  | "entitlement_denied"
  | "timeout"
  | "rate_limited"
  | "not_found"
  | "malformed_response"
  | "provider_unavailable"
  | "unknown";
export type Period = "annual" | "quarterly" | "ttm";

export interface ProviderProvenance {
  provider: FinancialProviderName;
  sourceName: string;
  sourceUrl?: string;
  observedAt: string;
  receivedAt: string;
}

export interface ProviderResult<T> {
  status: ProviderDataStatus;
  data: T | null;
  provenance: ProviderProvenance;
  entitlement?: ProviderEntitlement;
  latencyMs?: number;
  errorCode?: ProviderErrorCode;
  message?: string;
}

export interface AssetProfile {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  industry?: string;
  currency: string;
  marketCap?: number;
}

export interface PriceSnapshot {
  symbol: string;
  lastPrice: number;
  previousClose: number;
  changePercent: number;
  volume: number;
}

export interface FundamentalMetric {
  key: string;
  label: string;
  value: number;
  unit: "percent" | "ratio" | "currency" | "count";
  period: Period;
  fiscalPeriod: string;
}

export interface FundamentalSnapshot {
  symbol: string;
  metrics: FundamentalMetric[];
}

export interface MarketEvent {
  id: string;
  symbol: string;
  title: string;
  date: string;
  kind: "earnings" | "filing" | "investor_day" | "product" | "regulatory" | "other";
  source: string;
}

export interface MetricThreshold {
  metricKey: string;
  label: string;
  operator: ">" | ">=" | "<" | "<=";
  threshold: number;
  assumptionId: string;
  thesisId: string;
  impactWhenBreached: Extract<Impact, "supports" | "contradicts">;
}

export interface FinancialContext {
  id: string;
  kind: FinancialDataKind;
  symbol: string;
  title: string;
  summary: string;
  status: ProviderDataStatus;
  stale: boolean;
  observedAt: string;
  receivedAt: string;
  citation: Citation | null;
  uncertain: boolean;
}

export interface FinancialEvidenceProposal extends FinancialContext {
  kind: "fundamental_snapshot";
  thesisId: string;
  assumptionId: string;
  impact: Extract<Impact, "supports" | "contradicts">;
  confidence: Confidence;
  metric: FundamentalMetric;
  rationale: string;
}

export interface FinancialDataProvider {
  readonly name: FinancialProviderName;
  getAssetProfile(symbol: string): Promise<ProviderResult<AssetProfile>>;
  getPriceSnapshot(symbol: string): Promise<ProviderResult<PriceSnapshot>>;
  getFundamentals(symbol: string, period: Period): Promise<ProviderResult<FundamentalSnapshot>>;
  getEvents(symbol: string): Promise<ProviderResult<MarketEvent[]>>;
  searchAssets(query: string): Promise<ProviderResult<AssetProfile[]>>;
}
