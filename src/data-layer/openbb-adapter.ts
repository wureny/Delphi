import type {
  CompanySnapshot,
  MacroLiquiditySnapshot,
  MarketSnapshot,
  NewsSnapshot,
  RuntimeDataAdapter,
} from "../orchestration/agent-runtime.ts";
import { MemoryTtlCache } from "./cache.ts";
import type {
  CacheStatus,
  DataRefreshPolicy,
  RuntimeDataArtifacts,
  SnapshotArtifacts,
} from "./contracts.ts";
import { defaultRefreshPolicies, type InspectableRuntimeDataAdapter } from "./contracts.ts";
import { OpenBBRestClient } from "./openbb-client.ts";
import {
  FileSystemRuntimeArtifactsStore,
  NoopRuntimeArtifactsStore,
  type RuntimeArtifactsStore,
} from "./store.ts";
import {
  makeSourceRecord,
  normalizeCompanyBundle,
  normalizeMacroBundle,
  normalizeMarketBundle,
  normalizeNewsBundle,
  withStaleFallbackReason,
} from "./normalization.ts";

interface OpenBBRuntimeDataAdapterOptions {
  client?: OpenBBRestClient;
  artifactsStore?: RuntimeArtifactsStore;
}

type BundleKind = keyof Omit<RuntimeDataArtifacts, "runId">;

export class OpenBBRuntimeDataAdapter
  implements RuntimeDataAdapter, InspectableRuntimeDataAdapter
{
  private readonly client: OpenBBRestClient;
  private readonly cache = new MemoryTtlCache<SnapshotArtifacts<unknown>>();
  private readonly artifactsByRun = new Map<string, RuntimeDataArtifacts>();
  private readonly artifactsStore: RuntimeArtifactsStore;

  constructor(options: OpenBBRuntimeDataAdapterOptions = {}) {
    this.client = options.client ?? OpenBBRestClient.fromEnv();
    this.artifactsStore = options.artifactsStore ?? new NoopRuntimeArtifactsStore();
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): OpenBBRuntimeDataAdapter {
    return new OpenBBRuntimeDataAdapter({
      client: OpenBBRestClient.fromEnv(env),
      artifactsStore:
        env.DELPHI_PERSIST_DATA_ARTIFACTS === "true"
          ? FileSystemRuntimeArtifactsStore.fromEnv(env)
          : new NoopRuntimeArtifactsStore(),
    });
  }

  getArtifacts(runId: string): RuntimeDataArtifacts | null {
    return this.artifactsByRun.get(runId) ?? null;
  }

  async getCompanySnapshot(ticker: string, runId: string): Promise<CompanySnapshot> {
    const bundle = await this.resolveBundle(
      "company",
      `company:${ticker.toUpperCase()}`,
      [defaultRefreshPolicies.company_profile, defaultRefreshPolicies.company_filings],
      async (cacheStatus) => {
        const fetchedAt = new Date().toISOString();
        const profileParams = {
          symbol: ticker,
          provider: this.client.providers.companyProfile,
        };
        const filingsParams = {
          symbol: ticker,
          provider: this.client.providers.companyFilings,
          limit: 3,
        };

        const [profile, filings] = await Promise.allSettled([
          this.client.query("equity/profile", profileParams),
          this.client.query("equity/fundamental/filings", filingsParams),
        ]);

        if (profile.status !== "fulfilled") {
          throw profile.reason instanceof Error
            ? profile.reason
            : new Error("Company profile request failed.");
        }

        return normalizeCompanyBundle({
          runId,
          ticker,
          cacheStatus,
          profile: makeSourceRecord(
            "company_profile",
            profile.value.provider,
            profileParams,
            profile.value.rawPayload,
            fetchedAt,
          ),
          filings:
            filings.status === "fulfilled"
              ? makeSourceRecord(
                  "company_filings",
                  filings.value.provider,
                  filingsParams,
                  filings.value.rawPayload,
                  fetchedAt,
                )
              : null,
        });
      },
      runId,
    );

    return bundle.snapshot;
  }

  async getNewsSnapshot(ticker: string, runId: string): Promise<NewsSnapshot> {
    const bundle = await this.resolveBundle(
      "news",
      `news:${ticker.toUpperCase()}`,
      [defaultRefreshPolicies.company_news],
      async (cacheStatus) => {
        const fetchedAt = new Date().toISOString();
        const params = {
          symbol: ticker,
          provider: this.client.providers.companyNews,
          limit: 6,
        };
        const news = await this.client.query("news/company", params);

        return normalizeNewsBundle({
          runId,
          ticker,
          cacheStatus,
          news: makeSourceRecord(
            "company_news",
            news.provider,
            params,
            news.rawPayload,
            fetchedAt,
          ),
        });
      },
      runId,
    );

    return bundle.snapshot;
  }

  async getMarketSnapshot(ticker: string, runId: string): Promise<MarketSnapshot> {
    const bundle = await this.resolveBundle(
      "market",
      `market:${ticker.toUpperCase()}`,
      [defaultRefreshPolicies.market_quote, defaultRefreshPolicies.market_historical],
      async (cacheStatus) => {
        const fetchedAt = new Date().toISOString();
        const quoteParams = {
          symbol: ticker,
          provider: this.client.providers.marketQuote,
        };
        const historicalParams = {
          symbol: ticker,
          provider: this.client.providers.marketHistorical,
          interval: "1d",
          limit: 30,
        };

        const [quote, historical] = await Promise.all([
          this.client.query("equity/price/quote", quoteParams),
          this.client.query("equity/price/historical", historicalParams),
        ]);

        return normalizeMarketBundle({
          runId,
          ticker,
          cacheStatus,
          quote: makeSourceRecord(
            "market_quote",
            quote.provider,
            quoteParams,
            quote.rawPayload,
            fetchedAt,
          ),
          historical: makeSourceRecord(
            "market_historical",
            historical.provider,
            historicalParams,
            historical.rawPayload,
            fetchedAt,
          ),
        });
      },
      runId,
    );

    return bundle.snapshot;
  }

  async getMacroLiquiditySnapshot(runId: string): Promise<MacroLiquiditySnapshot> {
    const bundle = await this.resolveBundle(
      "macro",
      "macro:liquidity",
      [defaultRefreshPolicies.macro_effr, defaultRefreshPolicies.macro_treasury_rates],
      async (cacheStatus) => {
        const fetchedAt = new Date().toISOString();
        const effrParams = {
          provider: this.client.providers.macroEffr,
          limit: 5,
        };
        const treasuryParams = {
          provider: this.client.providers.macroTreasuryRates,
          limit: 5,
        };

        const [effr, treasuryRates] = await Promise.all([
          this.client.query("fixedincome/rate/effr", effrParams),
          this.client.query("fixedincome/government/treasury_rates", treasuryParams),
        ]);

        return normalizeMacroBundle({
          runId,
          cacheStatus,
          effr: makeSourceRecord(
            "macro_effr",
            effr.provider,
            effrParams,
            effr.rawPayload,
            fetchedAt,
          ),
          treasuryRates: makeSourceRecord(
            "macro_treasury_rates",
            treasuryRates.provider,
            treasuryParams,
            treasuryRates.rawPayload,
            fetchedAt,
          ),
        });
      },
      runId,
    );

    return bundle.snapshot;
  }

  private async resolveBundle<TSnapshot>(
    kind: BundleKind,
    cacheKey: string,
    policies: DataRefreshPolicy[],
    loader: (cacheStatus: CacheStatus) => Promise<SnapshotArtifacts<TSnapshot>>,
    runId: string,
  ): Promise<SnapshotArtifacts<TSnapshot>> {
    const effectivePolicy = mergePolicies(policies);
    const cacheLookup = this.cache.get(cacheKey);

    if (cacheLookup.status === "fresh" && cacheLookup.value) {
      const bundle = {
        ...(cacheLookup.value as SnapshotArtifacts<TSnapshot>),
        cacheStatus: "hit" as const,
      };
      this.storeArtifacts(runId, kind, bundle);
      return bundle;
    }

    try {
      const bundle = await loader(cacheLookup.status === "fresh" ? "hit" : "miss");
      this.cache.set(
        cacheKey,
        bundle,
        effectivePolicy.ttlMs,
        effectivePolicy.staleIfErrorTtlMs,
      );
      await this.storeArtifacts(runId, kind, bundle);
      return bundle;
    } catch (error) {
      if (cacheLookup.status === "stale" && cacheLookup.value && effectivePolicy.allowStaleOnError) {
        const staleBundle = withStaleFallbackReason(
          cacheLookup.value as SnapshotArtifacts<TSnapshot>,
          `Using stale cached ${kind} snapshot because fresh provider fetch failed: ${toErrorMessage(error)}`,
        );
        await this.storeArtifacts(runId, kind, staleBundle);
        return staleBundle;
      }

      throw error;
    }
  }

  private async storeArtifacts<TSnapshot>(
    runId: string,
    kind: BundleKind,
    bundle: SnapshotArtifacts<TSnapshot>,
  ): Promise<void> {
    const current = this.artifactsByRun.get(runId) ?? { runId };
    this.artifactsByRun.set(runId, {
      ...current,
      [kind]: bundle,
    });

    await this.artifactsStore.persistBundle(runId, kind, bundle);
  }
}

function mergePolicies(policies: DataRefreshPolicy[]): DataRefreshPolicy {
  return {
    sourceType: policies[0]?.sourceType ?? "company_profile",
    refreshTrigger: "query_triggered",
    cacheClass: policies.some((policy) => policy.cacheClass === "daily_refresh")
      ? "daily_refresh"
      : "short_cache",
    ttlMs: Math.min(...policies.map((policy) => policy.ttlMs)),
    staleIfErrorTtlMs: Math.min(...policies.map((policy) => policy.staleIfErrorTtlMs)),
    allowStaleOnError: policies.every((policy) => policy.allowStaleOnError),
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
