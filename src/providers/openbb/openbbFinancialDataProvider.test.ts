import { describe, expect, it } from "vitest";
import {
  OpenBBFinancialDataProvider,
  OpenBBProviderError,
  type OpenBBRawClient,
  type OpenBBRawRecord,
} from "./openbbFinancialDataProvider";

const NOW = "2026-06-20T00:00:00.000Z";

function createProvider(client: OpenBBRawClient = new FakeOpenBBClient()) {
  return new OpenBBFinancialDataProvider(client, {
    now: () => NOW,
    staleAfterDays: 30,
    sourceUrl: "https://openbb.example.test",
  });
}

function fakeClientWith(overrides: Partial<OpenBBRawClient>): OpenBBRawClient {
  const base = new FakeOpenBBClient();
  return {
    getProfile: overrides.getProfile ?? base.getProfile.bind(base),
    getQuote: overrides.getQuote ?? base.getQuote.bind(base),
    getFundamentals: overrides.getFundamentals ?? base.getFundamentals.bind(base),
    getEvents: overrides.getEvents ?? base.getEvents.bind(base),
    searchAssets: overrides.searchAssets ?? base.searchAssets.bind(base),
  };
}

describe("OpenBBFinancialDataProvider", () => {
  it("normalizes raw profile responses to asset profiles", async () => {
    const provider = createProvider();

    const result = await provider.getAssetProfile("ngsc");

    expect(result.status).toBe("available");
    expect(result.data).toEqual({
      symbol: "NGSC",
      name: "NovaGrid Semiconductors",
      exchange: "NASDAQ",
      sector: "Technology",
      industry: "Semiconductors",
      currency: "USD",
      marketCap: 480_000_000_000,
    });
    expect(result.provenance.provider).toBe("openbb");
    expect(result.entitlement).toBe("allowed");
    expect(result.latencyMs).toEqual(expect.any(Number));
  });

  it("normalizes quote field variants without leaking raw keys", async () => {
    const provider = createProvider();

    const result = await provider.getPriceSnapshot("NGSC");

    expect(result.data).toEqual({
      symbol: "NGSC",
      lastPrice: 142.2,
      previousClose: 149.68,
      changePercent: -5,
      volume: 12_400_000,
    });
    expect(JSON.stringify(result.data)).not.toMatch(/last_price|previous_close|raw/i);
  });

  it("normalizes fundamentals and marks old provider observations stale", async () => {
    const provider = createProvider();

    const result = await provider.getFundamentals("NGSC", "quarterly");

    expect(result.status).toBe("stale");
    expect(result.data?.metrics.map((metric) => metric.key)).toEqual(["gross_margin", "revenue_growth_yoy"]);
    expect(result.provenance.observedAt).toBe("2026-04-01T00:00:00.000Z");
  });

  it("normalizes events and search results", async () => {
    const provider = createProvider();

    const events = await provider.getEvents("NGSC");
    const search = await provider.searchAssets("nova");

    expect(events.data?.[0]).toEqual({
      id: "openbb-event-ngsc-0",
      symbol: "NGSC",
      title: "Q2 earnings",
      date: "2026-07-10T13:00:00.000Z",
      kind: "earnings",
      source: "OpenBB calendar",
    });
    expect(search.data?.[0]?.symbol).toBe("NGSC");
  });

  it("maps entitlement failures to unavailable results without fabricated data", async () => {
    const provider = createProvider(fakeClientWith({
      getQuote: async () => {
        throw new OpenBBProviderError("entitlement_denied", "forbidden raw vendor payload");
      },
    }));

    const result = await provider.getPriceSnapshot("NGSC");

    expect(result.status).toBe("unavailable");
    expect(result.data).toBeNull();
    expect(result.errorCode).toBe("entitlement_denied");
    expect(result.entitlement).toBe("denied");
    expect(result.message).toBe("OpenBB data access is not entitled for NGSC.");
    expect(JSON.stringify(result)).not.toMatch(/forbidden raw vendor payload/);
  });

  it("maps malformed responses to safe unavailable results", async () => {
    const provider = createProvider(fakeClientWith({
      getProfile: async () => ({ symbol: "NGSC" }),
    }));

    const result = await provider.getAssetProfile("NGSC");

    expect(result.status).toBe("unavailable");
    expect(result.data).toBeNull();
    expect(result.errorCode).toBe("malformed_response");
    expect(result.message).toBe("OpenBB returned incomplete data for NGSC.");
  });
});

class FakeOpenBBClient implements OpenBBRawClient {
  async getProfile(symbol: string): Promise<OpenBBRawRecord> {
    return {
      symbol: symbol.toUpperCase(),
      company_name: "NovaGrid Semiconductors",
      exchange: "NASDAQ",
      sector: "Technology",
      industry: "Semiconductors",
      currency: "USD",
      market_cap: 480_000_000_000,
    };
  }

  async getQuote(symbol: string): Promise<OpenBBRawRecord> {
    return {
      ticker: symbol.toUpperCase(),
      last_price: 142.2,
      previous_close: 149.68,
      change_percent: -5,
      volume: 12_400_000,
      observed_at: "2026-06-19T20:00:00.000Z",
    };
  }

  async getFundamentals(symbol: string): Promise<OpenBBRawRecord[]> {
    return [
      {
        symbol: symbol.toUpperCase(),
        metric_key: "gross_margin",
        metric_label: "Gross margin",
        value: 68.4,
        unit: "percent",
        period: "quarterly",
        fiscal_period: "2026-04-01T00:00:00.000Z",
      },
      {
        symbol: symbol.toUpperCase(),
        metric_key: "revenue_growth_yoy",
        metric_label: "Revenue growth YoY",
        value: 31.2,
        unit: "percent",
        period: "quarterly",
        fiscal_period: "2026-04-01T00:00:00.000Z",
      },
    ];
  }

  async getEvents(symbol: string): Promise<OpenBBRawRecord[]> {
    return [
      {
        ticker: symbol.toUpperCase(),
        title: "Q2 earnings",
        date: "2026-07-10T13:00:00.000Z",
        type: "earnings",
        source: "OpenBB calendar",
      },
    ];
  }

  async searchAssets(): Promise<OpenBBRawRecord[]> {
    return [
      {
        symbol: "NGSC",
        name: "NovaGrid Semiconductors",
        exchange: "NASDAQ",
        currency: "USD",
      },
    ];
  }
}
