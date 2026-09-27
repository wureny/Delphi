/**
 * SEC EDGAR connector — earnings releases (8-K Item 2.02, Exhibit 99.1).
 *
 * Read-only, public, and provenance-preserving: every excerpt carries the
 * filing accession, canonical URL, retrieval time, and a content hash, so a
 * live run can be replayed and audited exactly like a frozen fixture.
 *
 * EDGAR fair-access policy requires a descriptive User-Agent with a contact
 * address and at most 10 requests/second; callers supply the User-Agent.
 */
import type { DomainEvent, SourceBundle, SourceExcerpt, NumericValue } from "@/domain/types";
import { sha256Hex } from "@/domain/hash";
import { extractNumbers } from "@/domain/validators";
import { chunkBlocks, htmlToBlocks } from "./html-to-blocks";

export interface EdgarClientOptions {
  /** e.g. "Delphi Research ops@example.com" — required by SEC fair-access policy. */
  userAgent: string;
  fetchImpl?: typeof fetch;
  tenantId?: string;
}

export interface EarningsFiling {
  cik: string;
  ticker: string;
  companyName: string;
  accessionNumber: string;
  filingDate: string;
  acceptedAt: string;
  items: string;
  indexUrl: string;
}

export interface EarningsRelease {
  filing: EarningsFiling;
  exhibitUrl: string;
  html: string;
  retrievedAt: string;
}

const SEC_WWW = "https://www.sec.gov";
const SEC_DATA = "https://data.sec.gov";

export class EdgarError extends Error {
  constructor(
    readonly code: "ticker_unknown" | "no_earnings_filing" | "exhibit_missing" | "http_error",
    message: string,
  ) {
    super(message);
    this.name = "EdgarError";
  }
}

export class EdgarClient {
  private readonly fetchImpl: typeof fetch;
  private lastRequestAt = 0;
  private tickerMap?: Map<string, { cik: string; title: string }>;

  constructor(private readonly options: EdgarClientOptions) {
    if (!/\S+@\S+/.test(options.userAgent)) {
      throw new Error("EDGAR requires a User-Agent that includes a contact email address.");
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async get(url: string): Promise<Response> {
    // Stay well under the 10 req/s fair-access ceiling.
    const wait = this.lastRequestAt + 150 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastRequestAt = Date.now();
    const res = await this.fetchImpl(url, {
      headers: { "User-Agent": this.options.userAgent, Accept: "application/json, text/html;q=0.9" },
    });
    if (!res.ok) throw new EdgarError("http_error", `EDGAR request failed (${res.status}) for ${url}`);
    return res;
  }

  async resolveTicker(ticker: string): Promise<{ cik: string; title: string }> {
    if (!this.tickerMap) {
      const res = await this.get(`${SEC_WWW}/files/company_tickers.json`);
      const json = (await res.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
      this.tickerMap = new Map(
        Object.values(json).map((row) => [row.ticker.toUpperCase(), { cik: String(row.cik_str), title: row.title }]),
      );
    }
    const hit = this.tickerMap.get(ticker.toUpperCase());
    if (!hit) throw new EdgarError("ticker_unknown", `Ticker "${ticker}" is not in the SEC company ticker list.`);
    return hit;
  }

  /** Earnings filings (8-K with Item 2.02), newest first. */
  async listEarningsFilings(ticker: string, limit = 8): Promise<EarningsFiling[]> {
    const { cik, title } = await this.resolveTicker(ticker);
    const res = await this.get(`${SEC_DATA}/submissions/CIK${cik.padStart(10, "0")}.json`);
    const json = (await res.json()) as {
      name?: string;
      filings: {
        recent: {
          form: string[];
          items: string[];
          accessionNumber: string[];
          filingDate: string[];
          acceptanceDateTime: string[];
        };
      };
    };
    const r = json.filings.recent;
    const out: EarningsFiling[] = [];
    for (let i = 0; i < r.form.length && out.length < limit; i++) {
      const form = r.form[i];
      const items = r.items[i] ?? "";
      if ((form === "8-K" || form === "8-K/A") && items.split(",").includes("2.02")) {
        const accessionNumber = r.accessionNumber[i]!;
        out.push({
          cik,
          ticker: ticker.toUpperCase(),
          companyName: json.name ?? title,
          accessionNumber,
          filingDate: r.filingDate[i]!,
          acceptedAt: r.acceptanceDateTime[i]!,
          items,
          indexUrl: `${SEC_WWW}/Archives/edgar/data/${cik}/${accessionNumber.replace(/-/g, "")}/${accessionNumber}-index.html`,
        });
      }
    }
    return out;
  }

  /** Locate and download Exhibit 99.1 (the press release) for a filing. */
  async fetchEarningsRelease(filing: EarningsFiling): Promise<EarningsRelease> {
    const indexHtml = await (await this.get(filing.indexUrl)).text();
    const exhibitPath = findExhibit991(indexHtml);
    if (!exhibitPath) {
      throw new EdgarError("exhibit_missing", `No EX-99.1 document found in ${filing.indexUrl}`);
    }
    const exhibitUrl = new URL(exhibitPath, SEC_WWW).toString();
    const html = await (await this.get(exhibitUrl)).text();
    return { filing, exhibitUrl, html, retrievedAt: new Date().toISOString() };
  }

  async latestEarningsRelease(ticker: string, accessionNumber?: string): Promise<EarningsRelease> {
    const filings = await this.listEarningsFilings(ticker, 20);
    const filing = accessionNumber
      ? filings.find((f) => f.accessionNumber === accessionNumber)
      : filings[0];
    if (!filing) {
      throw new EdgarError(
        "no_earnings_filing",
        accessionNumber
          ? `Accession ${accessionNumber} is not a recent earnings filing for ${ticker}.`
          : `No recent 8-K Item 2.02 filing found for ${ticker}.`,
      );
    }
    return this.fetchEarningsRelease(filing);
  }
}

/** Parse an EDGAR filing index page and return the EX-99.1 document href. */
export function findExhibit991(indexHtml: string): string | undefined {
  const rows = indexHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const cellTexts = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      (m[1] ?? "").replace(/<[^>]+>/g, "").trim(),
    );
    if (!cellTexts.some((c) => /^EX-99(\.0?1)?$/i.test(c))) continue;
    const href = /href="([^"]+)"/i.exec(row)?.[1];
    if (href && !/\.(pdf|jpg|gif|png)$/i.test(href)) return href;
  }
  return undefined;
}

export function sourceIdForFiling(filing: EarningsFiling): string {
  return `source_sec_${filing.ticker.toLowerCase()}_${filing.accessionNumber.replace(/-/g, "")}_ex991`;
}

/**
 * Normalize a downloaded release into a schema-valid SourceBundle whose
 * excerpts are stable, hashable, and citable. Every number in an excerpt is
 * indexed so the existing numeric validator can check model claims against
 * what the filing actually says.
 */
export function releaseToSourceBundle(release: EarningsRelease, tenantId = "tenant_delphi_live"): SourceBundle {
  const { filing } = release;
  const sourceId = sourceIdForFiling(filing);
  const chunks = chunkBlocks(htmlToBlocks(release.html));
  const documentHash = `sha256:${sha256Hex(release.html)}`;

  const excerpts: SourceExcerpt[] = chunks.map((chunk, i) => {
    const excerptId = `${sourceId}_${String(i + 1).padStart(3, "0")}`;
    const numericValues: NumericValue[] = extractNumbers(chunk.text).map((value) => ({
      label: "stated",
      value,
      unit: "as_stated",
      basis: "text_extraction",
      sourceExcerptId: excerptId,
    }));
    return {
      excerptId,
      sourceId,
      locator: { section: chunk.kind === "table" ? "table" : "text", paragraph: chunk.blockIndex },
      text: chunk.text,
      numericValues,
      classification: "public",
      contentHash: `sha256:${sha256Hex(chunk.text)}`,
    };
  });

  return {
    fixtureVersion: "live",
    schemaVersion: "0.3.0",
    synthetic: false,
    sourceDocument: {
      sourceId,
      tenantId,
      title: `${filing.companyName} earnings release (8-K Ex. 99.1, filed ${filing.filingDate})`,
      sourceType: "earnings_release",
      issuerEntityId: `entity_${filing.ticker.toLowerCase()}`,
      uri: release.exhibitUrl,
      canonicalUri: release.exhibitUrl,
      publishedAt: filing.acceptedAt,
      observedAt: release.retrievedAt,
      retrievedAt: release.retrievedAt,
      classification: "public",
      contentHash: documentHash,
      version: 1,
      accessPolicyId: "policy_public_official",
      status: "available",
      originKind: "real_public",
      publisherKind: "regulator",
      publisherName: "SEC EDGAR",
      rightsNote: "Public SEC filing; excerpts retained for citation and audit.",
    },
    excerpts,
  };
}

/** The earnings filing as a Delphi domain event (point-in-time: SEC acceptance time). */
export function filingToDomainEvent(filing: EarningsFiling, observedAt: string, tenantId = "tenant_delphi_live"): DomainEvent {
  return {
    fixtureVersion: "live",
    schemaVersion: "0.3.0",
    synthetic: false,
    domainEventId: `event_sec_${filing.ticker.toLowerCase()}_${filing.accessionNumber.replace(/-/g, "")}`,
    tenantId,
    entityId: `entity_${filing.ticker.toLowerCase()}`,
    eventType: "earnings",
    title: `${filing.companyName} earnings release (8-K Item 2.02, filed ${filing.filingDate})`,
    occurredAt: filing.acceptedAt,
    publishedAt: filing.acceptedAt,
    observedAt,
    sourceRefs: [sourceIdForFiling(filing)],
    clusterId: `cluster_${filing.ticker.toLowerCase()}_earnings`,
    status: "ready",
  };
}
