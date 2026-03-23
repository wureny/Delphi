export interface OpenBBClientConfig {
  baseUrl: string;
  authToken?: string | undefined;
  username?: string | undefined;
  password?: string | undefined;
  providers?: Partial<OpenBBProviderConfig> | undefined;
}

export interface OpenBBProviderConfig {
  companyProfile: string;
  companyNews: string;
  companyFilings: string;
  marketQuote: string;
  marketHistorical: string;
  macroEffr: string;
  macroTreasuryRates: string;
}

export interface OpenBBQueryResponse<T = unknown> {
  results: T[];
  provider: string;
  warnings: string[];
  rawPayload: unknown;
}

export const defaultOpenBBProviders: OpenBBProviderConfig = {
  companyProfile: "yfinance",
  companyNews: "yfinance",
  companyFilings: "sec",
  marketQuote: "yfinance",
  marketHistorical: "yfinance",
  macroEffr: "federal_reserve",
  macroTreasuryRates: "federal_reserve",
};

export class OpenBBRestClient {
  readonly providers: OpenBBProviderConfig;
  private readonly baseUrl: string;
  private readonly authToken: string | undefined;
  private readonly username: string | undefined;
  private readonly password: string | undefined;

  constructor(config: OpenBBClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.authToken = config.authToken;
    this.username = config.username;
    this.password = config.password;
    this.providers = {
      ...defaultOpenBBProviders,
      ...config.providers,
    };
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): OpenBBRestClient {
    const baseUrl = env.OPENBB_BASE_URL;

    if (!baseUrl) {
      throw new Error("OPENBB_BASE_URL is required to use OpenBBRuntimeDataAdapter.");
    }

    return new OpenBBRestClient({
      baseUrl,
      authToken: env.OPENBB_AUTH_TOKEN,
      username: env.OPENBB_USERNAME,
      password: env.OPENBB_PASSWORD,
      providers: pickDefinedProviders({
        companyProfile: env.OPENBB_PROVIDER_COMPANY_PROFILE,
        companyNews: env.OPENBB_PROVIDER_COMPANY_NEWS,
        companyFilings: env.OPENBB_PROVIDER_COMPANY_FILINGS,
        marketQuote: env.OPENBB_PROVIDER_MARKET_QUOTE,
        marketHistorical: env.OPENBB_PROVIDER_MARKET_HISTORICAL,
        macroEffr: env.OPENBB_PROVIDER_MACRO_EFFR,
        macroTreasuryRates: env.OPENBB_PROVIDER_MACRO_TREASURY,
      }),
    });
  }

  async query<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined>,
  ): Promise<OpenBBQueryResponse<T>> {
    const url = new URL(`${this.baseUrl}/api/v1/${path}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    let response: Response;

    try {
      response = await fetch(url, {
        headers: this.buildHeaders(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown fetch failure.";
      throw new Error(
        `OpenBB request failed for ${path} at ${url.toString()}: ${message}`,
      );
    }

    if (!response.ok) {
      throw new Error(`OpenBB request failed for ${path} with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      results?: T[] | T;
      provider?: string;
      warnings?: Array<string | { message?: string }>;
    };

    return {
      results: asArray(payload.results),
      provider: payload.provider ?? String(params.provider ?? "openbb"),
      warnings: normalizeWarnings(payload.warnings),
      rawPayload: payload,
    };
  }

  private buildHeaders(): HeadersInit {
    if (this.authToken) {
      return {
        Authorization: `Bearer ${this.authToken}`,
      };
    }

    if (this.username && this.password) {
      const encoded = Buffer.from(`${this.username}:${this.password}`).toString("base64");
      return {
        Authorization: `Basic ${encoded}`,
      };
    }

    return {};
  }
}

function asArray<T>(value: T[] | T | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeWarnings(
  warnings: Array<string | { message?: string }> | undefined,
): string[] {
  if (!warnings) {
    return [];
  }

  return warnings
    .map((warning) => {
      if (typeof warning === "string") {
        return warning;
      }

      return warning.message ?? "";
    })
    .filter((warning) => warning.length > 0);
}

function pickDefinedProviders(
  providers: Record<keyof OpenBBProviderConfig, string | undefined>,
): Partial<OpenBBProviderConfig> {
  const entries = Object.entries(providers).filter((entry): entry is [keyof OpenBBProviderConfig, string] =>
    entry[1] !== undefined,
  );

  return Object.fromEntries(entries) as Partial<OpenBBProviderConfig>;
}
