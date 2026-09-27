/**
 * Earnings-to-Thesis eval runner.
 *
 *   npm run eval                        # all cases, provider from env
 *   npm run eval -- --only nvda,cost    # subset
 *   npm run eval -- --effort medium --label "effort sweep"
 *
 * Each case pins an SEC accession; the exhibit HTML is cached under
 * evals/cache so repeated runs score the model, not EDGAR drift.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { thesisSnapshotSchema } from "@/domain/schemas";
import type { ThesisSnapshot } from "@/domain/types";
import {
  createAnalysisModel,
  EdgarClient,
  filingToDomainEvent,
  releaseToSourceBundle,
  resolveModelSelection,
  runEarningsToThesis,
  type AnalysisProvider,
  type LiveRunResult,
} from "@/engine";
import type { EarningsRelease } from "@/engine/sec/edgar";
import { scoreCase, type CaseLabels, type CaseScore } from "@/engine/eval/score";

const { values } = parseArgs({
  options: {
    only: { type: "string" },
    provider: { type: "string" },
    model: { type: "string" },
    effort: { type: "string" },
    label: { type: "string", default: "" },
    concurrency: { type: "string", default: "3" },
  },
});

const CASES_DIR = "evals/cases";
const CACHE_DIR = "evals/cache";
const REPORTS_DIR = "evals/reports";

async function loadRelease(edgar: EdgarClient, ticker: string, accession: string): Promise<EarningsRelease> {
  const cacheFile = path.join(CACHE_DIR, `${accession}.json`);
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, "utf8")) as EarningsRelease;
  const filings = await edgar.listEarningsFilings(ticker, 20);
  const filing = filings.find((f) => f.accessionNumber === accession);
  if (!filing) throw new Error(`${ticker}: accession ${accession} not found`);
  const release = await edgar.fetchEarningsRelease(filing);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(release));
  return release;
}

interface CaseOutcome {
  ticker: string;
  score?: CaseScore;
  error?: string;
  seconds: number;
  reviewable: number;
  blocked: number;
  blockCodes: string[];
  usage?: LiveRunResult["usage"];
  runFile?: string;
}

async function main() {
  const selection = resolveModelSelection(process.env, {
    ...(values.provider ? { provider: values.provider as AnalysisProvider } : {}),
    ...(values.model ? { model: values.model } : {}),
    ...(values.effort ? { effort: values.effort as "low" | "medium" | "high" | "xhigh" } : {}),
  });
  const only = values.only?.toLowerCase().split(",");
  const caseIds = readdirSync(CASES_DIR).filter((d) => !only || only.includes(d)).sort();
  const edgar = new EdgarClient({ userAgent: process.env.DELPHI_SEC_USER_AGENT ?? "Delphi Eval eval@example.com" });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = path.join(REPORTS_DIR, `runs-${stamp}`);
  mkdirSync(runDir, { recursive: true });

  console.error(`eval: ${caseIds.length} cases · ${selection.provider}/${selection.model} · effort ${selection.effort}`);

  const runCase = async (id: string): Promise<CaseOutcome> => {
    const thesis = thesisSnapshotSchema.parse(JSON.parse(readFileSync(path.join(CASES_DIR, id, "thesis.json"), "utf8"))) as ThesisSnapshot;
    const labels = JSON.parse(readFileSync(path.join(CASES_DIR, id, "labels.json"), "utf8")) as CaseLabels;
    const started = Date.now();
    try {
      const release = await loadRelease(edgar, labels.ticker, labels.accessionNumber);
      const result = await runEarningsToThesis(
        {
          tenantId: "tenant_delphi_eval",
          caseId: thesis.caseId,
          companyName: release.filing.companyName,
          ticker: labels.ticker,
          thesis,
          event: filingToDomainEvent(release.filing, release.retrievedAt),
          sources: [releaseToSourceBundle(release)],
          runId: `run_eval_${id}_${stamp.replace(/\D/g, "").slice(0, 12)}`,
        },
        createAnalysisModel(selection),
      );
      const runFile = path.join(runDir, `${id}.json`);
      writeFileSync(runFile, JSON.stringify(result, null, 2));
      const score = scoreCase(labels, result.proposals, thesis);
      const outcome: CaseOutcome = {
        ticker: labels.ticker,
        score,
        seconds: (Date.now() - started) / 1000,
        reviewable: result.proposals.length,
        blocked: result.blockedProposals.length,
        blockCodes: result.blockedProposals.flatMap((b) => b.messages.filter((m) => m.severity === "error").map((m) => m.code)),
        usage: result.usage,
        runFile,
      };
      console.error(`  ${labels.ticker}: must ${score.mustHit}/${score.mustTotal}, should ${score.shouldHit}/${score.shouldTotal}, contradictions ${score.contradictions.length}, blocked ${outcome.blocked}, ${outcome.seconds.toFixed(0)}s`);
      return outcome;
    } catch (error) {
      console.error(`  ${labels.ticker}: ERROR ${(error as Error).message}`);
      return { ticker: labels.ticker, error: (error as Error).message, seconds: (Date.now() - started) / 1000, reviewable: 0, blocked: 0, blockCodes: [] };
    }
  };

  const outcomes: CaseOutcome[] = [];
  const queue = [...caseIds];
  await Promise.all(
    Array.from({ length: Number(values.concurrency) }, async () => {
      for (let id = queue.shift(); id; id = queue.shift()) outcomes.push(await runCase(id));
    }),
  );
  outcomes.sort((a, b) => a.ticker.localeCompare(b.ticker));

  const scored = outcomes.filter((o) => o.score);
  const sum = (f: (o: CaseOutcome) => number) => scored.reduce((a, o) => a + f(o), 0);
  const totals = {
    mustRecall: sum((o) => o.score!.mustHit) / Math.max(1, sum((o) => o.score!.mustTotal)),
    shouldRecall: sum((o) => o.score!.shouldHit) / Math.max(1, sum((o) => o.score!.shouldTotal)),
    contradictions: sum((o) => o.score!.contradictions.length),
    reviewable: sum((o) => o.reviewable),
    blocked: sum((o) => o.blocked),
    unlabeled: sum((o) => o.score!.unlabeledProposals.length),
    forecastOverwrites: sum((o) => o.score!.forecastOverwrites.length),
    errors: outcomes.length - scored.length,
    medianSeconds: [...scored.map((o) => o.seconds)].sort((a, b) => a - b)[Math.floor(scored.length / 2)] ?? 0,
    inputTokens: sum((o) => o.usage?.inputTokens ?? 0),
    outputTokens: sum((o) => o.usage?.outputTokens ?? 0),
  };

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const md: string[] = [
    `# Eval report ${stamp}${values.label ? ` — ${values.label}` : ""}`,
    "",
    `Model: \`${selection.provider}/${selection.model}\` · effort \`${selection.effort}\` · ${outcomes.length} cases · labels: draft, pending analyst review`,
    "",
    `| Metric | Value |`,
    `|---|---|`,
    `| Must-catch recall | **${pct(totals.mustRecall)}** |`,
    `| Should-catch recall | ${pct(totals.shouldRecall)} |`,
    `| Contradictions (wrong direction) | ${totals.contradictions} |`,
    `| Forecast overwrites (history destroyed) | ${totals.forecastOverwrites} |`,
    `| Reviewable / blocked proposals | ${totals.reviewable} / ${totals.blocked} |`,
    `| Unlabeled proposals (need human judgment) | ${totals.unlabeled} |`,
    `| Errors | ${totals.errors} |`,
    `| Median latency | ${totals.medianSeconds.toFixed(0)}s |`,
    `| Tokens in / out | ${totals.inputTokens} / ${totals.outputTokens} |`,
    "",
    `| Case | Must | Should | Contra. | Reviewable | Blocked | Latency |`,
    `|---|---|---|---|---|---|---|`,
    ...outcomes.map((o) =>
      o.score
        ? `| ${o.ticker} | ${o.score.mustHit}/${o.score.mustTotal} | ${o.score.shouldHit}/${o.score.shouldTotal} | ${o.score.contradictions.length} | ${o.reviewable} | ${o.blocked} | ${o.seconds.toFixed(0)}s |`
        : `| ${o.ticker} | error: ${o.error} | | | | | |`,
    ),
    "",
    "## Misses and flags",
    "",
    ...outcomes.flatMap((o) => [
      ...(o.score?.missed ?? []).map((m) => `- **${o.ticker}** missed (${m.importance}) \`${m.objectId}\` ${m.direction}: ${m.note}`),
      ...(o.score?.contradictions ?? []).map((c) => `- **${o.ticker}** CONTRADICTION \`${c.objectId}\` ${c.direction} (${c.proposalId})`),
      ...(o.blockCodes.length ? [`- **${o.ticker}** blocked codes: ${o.blockCodes.join(", ")}`] : []),
      ...(o.score?.unlabeledProposals ?? []).map((u) => `- **${o.ticker}** unlabeled: ${u.headline}`),
    ]),
    "",
  ];
  const mdFile = path.join(REPORTS_DIR, `${stamp}-${selection.provider}-${selection.model}${values.label ? `-${values.label.replace(/\W+/g, "-")}` : ""}.md`);
  writeFileSync(mdFile, md.join("\n"));
  writeFileSync(path.join(runDir, "summary.json"), JSON.stringify({ selection, totals, outcomes }, null, 2));
  console.log(md.join("\n"));
  console.error(`report: ${mdFile}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
