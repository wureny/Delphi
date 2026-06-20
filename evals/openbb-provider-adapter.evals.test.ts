import { describe, expect, it } from "vitest";
import {
  OpenBBFinancialDataProvider,
  OpenBBProviderError,
  type OpenBBRawClient,
  type OpenBBRawRecord,
} from "../src/providers/openbb/openbbFinancialDataProvider";

const NOW = "2026-06-20T00:00:00.000Z";

function provider(client: OpenBBRawClient) {
  return new OpenBBFinancialDataProvider(client, {
    now: () => NOW,
    staleAfterDays: 30,
    sourceUrl: "https://openbb.example.test",
  });
}

describe("openbb provider adapter evals", () => {
  it("normalizes raw provider fields without exposing OpenBB field names", async () => {
    const result = await provider(new EvalOpenBBClient()).getPriceSnapshot("NGSC");

    expect(result.data).toEqual({
      symbol: "NGSC",
      lastPrice: 142.2,
      previousClose: 149.68,
      changePercent: -5,
      volume: 12_400_000,
    });
    expect(JSON.stringify(result.data)).not.toMatch(/last_price|previous_close|ticker/i);
  });

  it("does not produce advice, price targets, conviction, or decision rationale", async () => {
    const result = await provider(new EvalOpenBBClient()).getPriceSnapshot("NGSC");
    const text = JSON.stringify(result);

    expect(text).not.toMatch(/buy|sell|price target|target price|conviction|decision rationale/i);
  });

  it("marks old fundamentals stale while preserving provider observation timestamp", async () => {
    const result = await provider(new EvalOpenBBClient()).getFundamentals("NGSC", "quarterly");

    expect(result.status).toBe("stale");
    expect(result.provenance.observedAt).toBe("2026-04-01T00:00:00.000Z");
    expect(result.data?.metrics[0].key).toBe("gross_margin");
  });

  it("maps entitlement denial to unavailable without raw error leakage", async () => {
    const result = await provider(new EntitlementDeniedClient()).getAssetProfile("NGSC");

    expect(result.status).toBe("unavailable");
    expect(result.data).toBeNull();
    expect(result.entitlement).toBe("denied");
    expect(result.errorCode).toBe("entitlement_denied");
    expect(JSON.stringify(result)).not.toMatch(/vendor stack trace|secret|token/i);
  });

  it("maps malformed raw responses to safe unavailable results", async () => {
    const result = await provider(new MalformedClient()).getPriceSnapshot("NGSC");

    expect(result.status).toBe("unavailable");
    expect(result.data).toBeNull();
    expect(result.errorCode).toBe("malformed_response");
    expect(result.message).toBe("OpenBB returned incomplete data for NGSC.");
  });
});

class EvalOpenBBClient implements OpenBBRawClient {
  async getProfile(symbol: string): Promise<OpenBBRawRecord> {
    return {
      symbol: symbol.toUpperCase(),
      company_name: "NovaGrid Semiconductors",
      exchange: "NASDAQ",
      currency: "USD",
    };
  }

  async getQuote(symbol: string): Promise<OpenBBRawRecord> {
    return {
      ticker: symbol.toUpperCase(),
      last_price: 142.2,
      previous_close: 149.68,
      change_percent: -5,
      volume: 12_400_000,
    };
  }

  async getFundamentals(): Promise<OpenBBRawRecord[]> {
    return [
      {
        metric_key: "gross_margin",
        metric_label: "Gross margin",
        value: 68.4,
        unit: "percent",
        period: "quarterly",
        fiscal_period: "2026-04-01T00:00:00.000Z",
      },
    ];
  }

  async getEvents(): Promise<OpenBBRawRecord[]> {
    return [];
  }

  async searchAssets(): Promise<OpenBBRawRecord[]> {
    return [];
  }
}

class EntitlementDeniedClient extends EvalOpenBBClient {
  async getProfile(): Promise<OpenBBRawRecord> {
    throw new OpenBBProviderError("entitlement_denied", "vendor stack trace with secret token");
  }
}

class MalformedClient extends EvalOpenBBClient {
  async getQuote(): Promise<OpenBBRawRecord> {
    return { ticker: "NGSC", last_price: 142.2 };
  }
}
