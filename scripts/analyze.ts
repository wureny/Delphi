/**
 * Live Earnings-to-Thesis from the command line.
 *
 *   npm run analyze -- --ticker MSFT
 *   npm run analyze -- --ticker NVDA --thesis path/to/thesis.json
 *   npm run analyze -- --ticker MSFT --dry-run      # fetch + build prompt, no model call
 *
 * Requires ANTHROPIC_API_KEY (unless --dry-run) and DELPHI_SEC_USER_AGENT
 * ("Your Name you@example.com", per SEC fair-access policy).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { thesisSnapshotSchema } from "@/domain/schemas";
import type { ThesisSnapshot } from "@/domain/types";
import {
  ClaudeAnalysisModel,
  DEFAULT_ANALYSIS_MODEL,
  EdgarClient,
  filingToDomainEvent,
  releaseToSourceBundle,
  runEarningsToThesis,
} from "@/engine";
import { buildUserPrompt, SYSTEM_PROMPT } from "@/engine/analysis/prompt";
import { thesisToSourceBundle } from "@/engine/analysis/thesis-source";

const DEFAULT_THESES: Record<string, string> = {
  MSFT: "src/fixtures/data/real/msft-fy25q4/thesis.msft.v12.json",
};

const { values } = parseArgs({
  options: {
    ticker: { type: "string" },
    accession: { type: "string" },
    thesis: { type: "string" },
    "case-id": { type: "string" },
    model: { type: "string" },
    effort: { type: "string" },
    out: { type: "string", default: "data/live-runs" },
    "dry-run": { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function main() {
  const ticker = values.ticker?.toUpperCase() ?? fail("--ticker is required");
  const thesisPath = values.thesis ?? DEFAULT_THESES[ticker] ?? fail(`no default thesis for ${ticker}; pass --thesis`);
  const thesis = thesisSnapshotSchema.parse(JSON.parse(readFileSync(thesisPath, "utf8"))) as ThesisSnapshot;
  const userAgent = process.env.DELPHI_SEC_USER_AGENT ?? fail("set DELPHI_SEC_USER_AGENT to \"Name email@domain\" (SEC policy)");

  const edgar = new EdgarClient({ userAgent });
  console.error(`→ fetching latest earnings release for ${ticker} from SEC EDGAR…`);
  const release = await edgar.latestEarningsRelease(ticker, values.accession);
  const source = releaseToSourceBundle(release);
  const event = filingToDomainEvent(release.filing, release.retrievedAt);
  console.error(`  ${event.title}\n  ${release.exhibitUrl}\n  ${source.excerpts.length} citable excerpts`);

  if (values["dry-run"]) {
    const { text } = buildUserPrompt(thesis, thesisToSourceBundle(thesis), [source], {
      companyName: release.filing.companyName,
      ticker,
      eventTitle: event.title,
    });
    console.log(`${SYSTEM_PROMPT}\n\n=====\n\n${text}`);
    console.error(`→ dry run: prompt is ~${Math.round((SYSTEM_PROMPT.length + text.length) / 4)} tokens (chars/4 estimate)`);
    return;
  }

  const model = new ClaudeAnalysisModel({
    model: values.model ?? process.env.DELPHI_LIVE_MODEL_NAME ?? DEFAULT_ANALYSIS_MODEL,
    effort: (values.effort as "low" | "medium" | "high" | "xhigh" | "max" | undefined) ?? "high",
  });
  console.error(`→ analyzing against thesis v${thesis.version} (${thesis.thesisId})…`);
  const started = Date.now();
  const result = await runEarningsToThesis(
    {
      tenantId: "tenant_delphi_live",
      caseId: values["case-id"] ?? thesis.caseId,
      companyName: release.filing.companyName,
      ticker,
      thesis,
      event,
      sources: [source],
    },
    model,
    (ev) => console.error(`  [${ev.eventType}] ${ev.publicMessage}`),
  );

  mkdirSync(values.out!, { recursive: true });
  const file = path.join(values.out!, `${result.run.workflowRun.runId}.json`);
  writeFileSync(file, JSON.stringify(result, null, 2));

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${result.eventSummary}\n`);
  for (const p of result.proposals) {
    console.log(`✓ [${p.materiality}/${p.requiredReviewerRole}] ${p.headline}\n    ${p.whatChanged}`);
  }
  for (const b of result.blockedProposals) {
    console.log(`✗ BLOCKED ${b.proposal.headline}\n    ${b.messages.filter((m) => m.severity === "error").map((m) => m.message).join("\n    ")}`);
  }
  for (const g of result.coverageGaps) console.log(`… gap ${g.objectId}: ${g.reason}`);
  const u = result.usage;
  console.log(`\n${secs}s · ${result.run.workflowRun.modelRoutes[0]?.model} · in ${u.inputTokens} (+${u.cacheReadInputTokens} cached) / out ${u.outputTokens} tokens`);
  console.log(`saved ${file}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `error: ${error.message}` : error);
  process.exit(1);
});
