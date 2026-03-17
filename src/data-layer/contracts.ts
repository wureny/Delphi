import type {
  CompanySnapshot,
  MacroLiquiditySnapshot,
  MarketSnapshot,
  NewsSnapshot,
  RuntimeDataAdapter,
} from "../orchestration/agent-runtime.ts";

export const evidenceSupportedObjectTypes = [
  "Thesis",
  "Risk",
  "MacroActorAction",
  "LiquidityFactor",
  "LiquidityRegime",
  "MarketSignal",
] as const;

export type EvidenceSupportedObjectType =
  (typeof evidenceSupportedObjectTypes)[number];

export const rawSnapshotSourceTypes = [
  "company_profile",
  "company_filings",
  "company_news",
  "market_quote",
  "market_historical",
  "macro_effr",
  "macro_treasury_rates",
] as const;

export type RawSnapshotSourceType = (typeof rawSnapshotSourceTypes)[number];

export type RefreshTrigger = "query_triggered";
export type CacheClass = "short_cache" | "daily_refresh";
export type CacheStatus = "miss" | "hit" | "stale_fallback";

export interface DataRefreshPolicy {
  sourceType: RawSnapshotSourceType;
  refreshTrigger: RefreshTrigger;
  cacheClass: CacheClass;
  ttlMs: number;
  staleIfErrorTtlMs: number;
  allowStaleOnError: boolean;
}

export interface RawSnapshotRecord<TPayload = unknown> {
  snapshotId: string;
  runId: string;
  ticker?: string | undefined;
  provider: string;
  sourceType: RawSnapshotSourceType;
  fetchedAt: string;
  requestKey: string;
  requestParams: Record<string, string | number | boolean | undefined>;
  cachePolicy: DataRefreshPolicy;
  payload: TPayload;
}

export interface EvidenceCandidate {
  candidateId: string;
  runId: string;
  ticker?: string | undefined;
  provider: string;
  sourceType: RawSnapshotSourceType;
  sourceRef: string;
  observedAt: string;
  summary: string;
  supportedObjects: readonly EvidenceSupportedObjectType[];
  rawSnapshotRef: string;
}

export interface SnapshotArtifacts<TSnapshot> {
  snapshot: TSnapshot;
  rawSnapshots: RawSnapshotRecord[];
  evidenceCandidates: EvidenceCandidate[];
  degradedReasons: string[];
  cacheStatus: CacheStatus;
}

export interface RuntimeDataArtifacts {
  runId: string;
  company?: SnapshotArtifacts<CompanySnapshot>;
  news?: SnapshotArtifacts<NewsSnapshot>;
  market?: SnapshotArtifacts<MarketSnapshot>;
  macro?: SnapshotArtifacts<MacroLiquiditySnapshot>;
}

export interface InspectableRuntimeDataAdapter extends RuntimeDataAdapter {
  getArtifacts(runId: string): RuntimeDataArtifacts | null;
}

export const defaultRefreshPolicies: Record<RawSnapshotSourceType, DataRefreshPolicy> = {
  company_profile: {
    sourceType: "company_profile",
    refreshTrigger: "query_triggered",
    cacheClass: "short_cache",
    ttlMs: 6 * 60 * 60 * 1000,
    staleIfErrorTtlMs: 24 * 60 * 60 * 1000,
    allowStaleOnError: true,
  },
  company_filings: {
    sourceType: "company_filings",
    refreshTrigger: "query_triggered",
    cacheClass: "daily_refresh",
    ttlMs: 24 * 60 * 60 * 1000,
    staleIfErrorTtlMs: 3 * 24 * 60 * 60 * 1000,
    allowStaleOnError: true,
  },
  company_news: {
    sourceType: "company_news",
    refreshTrigger: "query_triggered",
    cacheClass: "short_cache",
    ttlMs: 15 * 60 * 1000,
    staleIfErrorTtlMs: 2 * 60 * 60 * 1000,
    allowStaleOnError: true,
  },
  market_quote: {
    sourceType: "market_quote",
    refreshTrigger: "query_triggered",
    cacheClass: "short_cache",
    ttlMs: 5 * 60 * 1000,
    staleIfErrorTtlMs: 30 * 60 * 1000,
    allowStaleOnError: true,
  },
  market_historical: {
    sourceType: "market_historical",
    refreshTrigger: "query_triggered",
    cacheClass: "short_cache",
    ttlMs: 30 * 60 * 1000,
    staleIfErrorTtlMs: 6 * 60 * 60 * 1000,
    allowStaleOnError: true,
  },
  macro_effr: {
    sourceType: "macro_effr",
    refreshTrigger: "query_triggered",
    cacheClass: "daily_refresh",
    ttlMs: 24 * 60 * 60 * 1000,
    staleIfErrorTtlMs: 3 * 24 * 60 * 60 * 1000,
    allowStaleOnError: true,
  },
  macro_treasury_rates: {
    sourceType: "macro_treasury_rates",
    refreshTrigger: "query_triggered",
    cacheClass: "daily_refresh",
    ttlMs: 24 * 60 * 60 * 1000,
    staleIfErrorTtlMs: 3 * 24 * 60 * 60 * 1000,
    allowStaleOnError: true,
  },
};

export const ontologySupportMapping: Record<
  RawSnapshotSourceType,
  readonly EvidenceSupportedObjectType[]
> = {
  company_profile: ["Thesis", "Risk"],
  company_filings: ["Thesis", "Risk"],
  company_news: ["Thesis", "Risk"],
  market_quote: ["MarketSignal"],
  market_historical: ["MarketSignal"],
  macro_effr: ["MacroActorAction", "LiquidityFactor", "LiquidityRegime"],
  macro_treasury_rates: ["MacroActorAction", "LiquidityFactor", "LiquidityRegime"],
};

export function isInspectableRuntimeDataAdapter(
  adapter: RuntimeDataAdapter | null,
): adapter is InspectableRuntimeDataAdapter {
  return Boolean(adapter && typeof (adapter as InspectableRuntimeDataAdapter).getArtifacts === "function");
}
