import type {
  AssetProfile,
  FinancialDataProvider,
  FundamentalSnapshot,
  MarketEvent,
  Period,
  PriceSnapshot,
  ProviderProvenance,
  ProviderResult,
} from "../domain/financialData";

const NOW = "2026-06-19T09:00:00.000Z";

function daysAgo(days: number): string {
  return new Date(new Date(NOW).getTime() - days * 86_400_000).toISOString();
}

function provenance(sourceName: string, observedAt = daysAgo(1)): ProviderProvenance {
  return {
    provider: "mock",
    sourceName,
    sourceUrl: "#mock-financial-provider",
    observedAt,
    receivedAt: NOW,
  };
}

const profiles: Record<string, AssetProfile> = {
  NGSC: {
    symbol: "NGSC",
    name: "NovaGrid Semiconductors",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Semiconductors",
    currency: "USD",
    marketCap: 480_000_000_000,
  },
  RETL: {
    symbol: "RETL",
    name: "RetailCo",
    exchange: "NYSE",
    sector: "Consumer Discretionary",
    industry: "Specialty Retail",
    currency: "USD",
    marketCap: 42_000_000_000,
  },
};

const prices: Record<string, PriceSnapshot> = {
  NGSC: {
    symbol: "NGSC",
    lastPrice: 142.2,
    previousClose: 149.68,
    changePercent: -5,
    volume: 12_400_000,
  },
  RETL: {
    symbol: "RETL",
    lastPrice: 38.4,
    previousClose: 38.02,
    changePercent: 1,
    volume: 4_200_000,
  },
};

const fundamentals: Record<string, FundamentalSnapshot> = {
  NGSC: {
    symbol: "NGSC",
    metrics: [
      {
        key: "gross_margin",
        label: "Gross margin",
        value: 68.4,
        unit: "percent",
        period: "quarterly",
        fiscalPeriod: "FY2027 Q1",
      },
      {
        key: "revenue_growth_yoy",
        label: "Revenue growth YoY",
        value: 31.2,
        unit: "percent",
        period: "quarterly",
        fiscalPeriod: "FY2027 Q1",
      },
    ],
  },
  RETL: {
    symbol: "RETL",
    metrics: [
      {
        key: "comparable_sales_growth",
        label: "Comparable sales growth",
        value: 5.2,
        unit: "percent",
        period: "quarterly",
        fiscalPeriod: "FY2026 Q2",
      },
    ],
  },
};

const events: Record<string, MarketEvent[]> = {
  NGSC: [
    {
      id: "event-ngsc-earnings",
      symbol: "NGSC",
      title: "Q2 earnings",
      date: "2026-07-10T13:00:00.000Z",
      kind: "earnings",
      source: "Mock financial calendar",
    },
  ],
  RETL: [
    {
      id: "event-retl-investor-day",
      symbol: "RETL",
      title: "Automation rollout update",
      date: "2026-07-19T13:00:00.000Z",
      kind: "investor_day",
      source: "Mock company calendar",
    },
  ],
};

export class MockFinancialDataProvider implements FinancialDataProvider {
  readonly name = "mock" as const;

  async getAssetProfile(symbol: string): Promise<ProviderResult<AssetProfile>> {
    const normalized = symbol.toUpperCase();
    const profile = profiles[normalized];
    if (!profile) {
      return unavailable("Mock profile provider", `No asset profile available for ${normalized}.`);
    }
    return { status: "available", data: profile, provenance: provenance("Mock profile provider") };
  }

  async getPriceSnapshot(symbol: string): Promise<ProviderResult<PriceSnapshot>> {
    const normalized = symbol.toUpperCase();
    const price = prices[normalized];
    if (!price) {
      return unavailable("Mock price provider", `No price snapshot available for ${normalized}.`);
    }
    return { status: "available", data: price, provenance: provenance("Mock price provider") };
  }

  async getFundamentals(symbol: string, period: Period): Promise<ProviderResult<FundamentalSnapshot>> {
    const normalized = symbol.toUpperCase();
    const snapshot = fundamentals[normalized];
    if (!snapshot) {
      return unavailable("Mock fundamentals provider", `No fundamentals available for ${normalized}.`);
    }
    return {
      status: normalized === "NGSC" ? "available" : "stale",
      data: {
        ...snapshot,
        metrics: snapshot.metrics.filter((metric) => metric.period === period),
      },
      provenance: provenance("Mock fundamentals provider", normalized === "NGSC" ? daysAgo(2) : daysAgo(120)),
    };
  }

  async getEvents(symbol: string): Promise<ProviderResult<MarketEvent[]>> {
    const normalized = symbol.toUpperCase();
    return {
      status: "available",
      data: events[normalized] ?? [],
      provenance: provenance("Mock event provider"),
    };
  }

  async searchAssets(query: string): Promise<ProviderResult<AssetProfile[]>> {
    const normalized = query.toUpperCase();
    const matches = Object.values(profiles).filter(
      (profile) => profile.symbol.includes(normalized) || profile.name.toUpperCase().includes(normalized),
    );
    return {
      status: "available",
      data: matches,
      provenance: provenance("Mock asset search provider"),
    };
  }
}

function unavailable<T>(sourceName: string, message: string): ProviderResult<T> {
  return {
    status: "unavailable",
    data: null,
    provenance: provenance(sourceName),
    message,
  };
}
