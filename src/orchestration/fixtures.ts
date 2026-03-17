import { randomUUID } from "node:crypto";

import type {
  AgentExecutionContext,
  AgentExecutionResult,
  AgentExecutor,
  AgentExecutorMap,
  CompanySnapshot,
  GraphContextReader,
  MacroLiquiditySnapshot,
  MarketSnapshot,
  NewsSnapshot,
  RuntimeDataAdapter,
} from "./agent-runtime.ts";
import type {
  DecisionRecord,
  FindingImpact,
  FindingRecord,
  FinalReportSectionKey,
  ReportSectionRecord,
  ReportSectionStatus,
} from "./contracts.ts";
import { createEmptyAgentExecutionResult } from "./agent-runtime.ts";
import { buildFinalReport, createEmptyReportSections, reportSectionTitles } from "./report.ts";
import {
  buildJudgeCitationPatch,
  buildFindingPatch,
  buildJudgeDecisionPatch,
  buildJudgeReportPatch,
} from "./runtime-patches.ts";
import { createRunEvent } from "./events.ts";

export class FixtureRuntimeDataAdapter implements RuntimeDataAdapter {
  async getCompanySnapshot(ticker: string, _runId: string): Promise<CompanySnapshot> {
    return {
      ticker,
      observedAt: new Date().toISOString(),
      companyName: `${ticker} Holdings`,
      businessSummary: `${ticker} is treated as a high-quality large-cap equity in the fixture runtime.`,
      keyPoints: [
        "Revenue mix remains diversified.",
        "Recent execution has stayed within expected range.",
      ],
    };
  }

  async getNewsSnapshot(ticker: string, _runId: string): Promise<NewsSnapshot> {
    return {
      ticker,
      observedAt: new Date().toISOString(),
      items: [
        {
          id: `news:${ticker}:1`,
          headline: `${ticker} management reiterates operating priorities`,
          summary: "Management commentary remains constructive but measured.",
          publishedAt: new Date().toISOString(),
        },
        {
          id: `news:${ticker}:2`,
          headline: `${ticker} faces mixed near-term sentiment`,
          summary: "Market participants appear constructive on fundamentals but selective on timing.",
          publishedAt: new Date().toISOString(),
        },
      ],
    };
  }

  async getMarketSnapshot(ticker: string, _runId: string): Promise<MarketSnapshot> {
    return {
      ticker,
      observedAt: new Date().toISOString(),
      latestPrice: 187.42,
      priceChangePct: 1.8,
      volume: 1280000,
      signalSummaries: [
        "Price trend is constructive but not euphoric.",
        "Positioning looks supportive rather than crowded.",
      ],
    };
  }

  async getMacroLiquiditySnapshot(_runId: string): Promise<MacroLiquiditySnapshot> {
    return {
      observedAt: new Date().toISOString(),
      regimeLabel: "neutral_to_supportive",
      ratesSummary: "Rates pressure is manageable and liquidity conditions are not actively tightening.",
      liquiditySignals: [
        "Liquidity backdrop is stable.",
        "Macro conditions do not obviously block multiple expansion.",
      ],
    };
  }
}

export class FixtureGraphContextReader implements GraphContextReader {
  async getRunContext(runId: string) {
    return {
      summary: `Runtime context for ${runId} is available through the graph gateway snapshot.`,
      refs: [],
    };
  }

  async getCaseContext(caseId: string) {
    return {
      summary: `Case context for ${caseId} is currently fixture-backed.`,
      refs: [caseId],
    };
  }
}

class FixtureThesisExecutor implements AgentExecutor {
  readonly agentType = "thesis" as const;

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const adapter = requireDataAdapter(context);
    await publishToolEvent(context, "tool_started", "Fetching company and news snapshots.");
    const [company, news] = await Promise.all([
      adapter.getCompanySnapshot(context.query.ticker, context.run.runId),
      adapter.getNewsSnapshot(context.query.ticker, context.run.runId),
    ]);
    await publishToolEvent(context, "tool_finished", "Fetched company and news snapshots.", {
      newsCount: news.items.length,
    });

    const findings = [
      createFinding(context, {
        claim: `${company.companyName} still supports a credible medium-term fundamental thesis.`,
        impact: "positive",
        confidence: 0.72,
      }),
      createFinding(context, {
        claim: `Recent news flow on ${context.query.ticker} is constructive but not strong enough to remove execution risk.`,
        impact: "mixed",
        confidence: 0.65,
      }),
    ];

    return {
      ...createEmptyAgentExecutionResult("done", "Generated thesis findings from fixture snapshots."),
      findings,
      graphPatches: [
        buildFindingPatch(
          context.run,
          context.task.agentType,
          context.task.taskId,
          `skill:${context.run.runId}:thesis_analysis`,
          findings,
        ),
      ],
    };
  }
}

class FixtureLiquidityExecutor implements AgentExecutor {
  readonly agentType = "liquidity" as const;

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const adapter = requireDataAdapter(context);
    await publishToolEvent(context, "tool_started", "Fetching macro and liquidity snapshot.");
    const snapshot = await adapter.getMacroLiquiditySnapshot(context.run.runId);
    await publishToolEvent(context, "tool_finished", "Fetched macro and liquidity snapshot.", {
      regimeLabel: snapshot.regimeLabel,
    });

    const findings = [
      createFinding(context, {
        claim: `${snapshot.ratesSummary}`,
        impact: "neutral",
        confidence: 0.68,
      }),
      createFinding(context, {
        claim: `${snapshot.liquiditySignals[0]} This does not contradict the long case for ${context.query.ticker}.`,
        impact: "positive",
        confidence: 0.63,
      }),
    ];

    return {
      ...createEmptyAgentExecutionResult("done", "Generated liquidity findings from fixture macro snapshot."),
      findings,
      graphPatches: [
        buildFindingPatch(
          context.run,
          context.task.agentType,
          context.task.taskId,
          `skill:${context.run.runId}:liquidity_analysis`,
          findings,
        ),
      ],
    };
  }
}

class FixtureMarketSignalExecutor implements AgentExecutor {
  readonly agentType = "market_signal" as const;

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const adapter = requireDataAdapter(context);
    await publishToolEvent(context, "tool_started", "Fetching market snapshot.");
    const snapshot = await adapter.getMarketSnapshot(context.query.ticker, context.run.runId);
    await publishToolEvent(context, "tool_finished", "Fetched market snapshot.", {
      latestPrice: snapshot.latestPrice ?? null,
    });

    const findings = [
      createFinding(context, {
        claim: `${context.query.ticker} price action is constructive without looking fully crowded.`,
        impact: "positive",
        confidence: 0.67,
      }),
      createFinding(context, {
        claim: `${snapshot.signalSummaries[1]}`,
        impact: "neutral",
        confidence: 0.61,
      }),
    ];

    return {
      ...createEmptyAgentExecutionResult("done", "Generated market signal findings from fixture market snapshot."),
      findings,
      graphPatches: [
        buildFindingPatch(
          context.run,
          context.task.agentType,
          context.task.taskId,
          `skill:${context.run.runId}:market_signal_analysis`,
          findings,
        ),
      ],
    };
  }
}

class FixtureJudgeExecutor implements AgentExecutor {
  readonly agentType = "judge" as const;

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const basisFindingRefs = context.upstreamFindings.map((finding) => finding.findingId);
    const positiveCount = context.upstreamFindings.filter((finding) => finding.impact === "positive").length;
    const mixedCount = context.upstreamFindings.filter((finding) => finding.impact === "mixed").length;

    const decision: DecisionRecord = {
      decisionId: `decision:${context.run.runId}:primary`,
      runId: context.run.runId,
      decisionType: "investment_view",
      summary:
        positiveCount >= 3
          ? `${context.query.ticker} looks investable on the fixture path, but entry timing still depends on execution and sentiment staying stable.`
          : `${context.query.ticker} has a workable case, but the evidence base is not strong enough for a high-conviction call.`,
      confidenceBand: mixedCount > 0 ? "medium" : "medium_high",
      basisFindingRefs,
    };

    const sectionContents = buildSectionContents(context.upstreamFindings, decision.summary);
    const reportSections = createEmptyReportSections(context.run.runId).map((section) => ({
      ...section,
      content: sectionContents[section.sectionKey],
      citationFindingRefs: pickCitationFindingRefs(context.upstreamFindings, section.sectionKey),
      status: (sectionContents[section.sectionKey] ? "ready" : "empty") as ReportSectionStatus,
    }));

    const finalReport = buildFinalReport({
      runId: context.run.runId,
      caseId: context.run.caseId,
      sections: reportSections,
    });

    return {
      ...createEmptyAgentExecutionResult("done", "Synthesized fixture findings into one decision and six report sections."),
      decision,
      reportSections,
      finalReport,
      graphPatches: [
        buildJudgeDecisionPatch(
          context.run,
          context.task.taskId,
          decision,
        ),
        buildJudgeReportPatch(
          context.run,
          context.task.taskId,
          decision,
          reportSections,
        ),
        buildJudgeCitationPatch(
          context.run,
          context.task.taskId,
          decision,
          reportSections,
        ),
      ],
    };
  }
}

export function createFixtureExecutors(): AgentExecutorMap {
  return {
    thesis: new FixtureThesisExecutor(),
    liquidity: new FixtureLiquidityExecutor(),
    market_signal: new FixtureMarketSignalExecutor(),
    judge: new FixtureJudgeExecutor(),
  };
}

function requireDataAdapter(context: AgentExecutionContext): RuntimeDataAdapter {
  if (!context.dataAdapter) {
    throw new Error("Fixture executor requires a data adapter.");
  }

  return context.dataAdapter;
}

async function publishToolEvent(
  context: AgentExecutionContext,
  eventType: "tool_started" | "tool_finished",
  title: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await context.eventSink.publish(
    createRunEvent({
      runId: context.run.runId,
      agentId: `agent:${context.run.runId}:${context.task.agentType}`,
      eventType,
      title,
      payload: {
        taskId: context.task.taskId,
        capability: `${context.task.agentType}_analysis`,
        ...payload,
      },
    }),
  );
}

function createFinding(
  context: AgentExecutionContext,
  input: {
    claim: string;
    impact: FindingImpact;
    confidence: number;
  },
): FindingRecord {
  return {
    findingId: `finding:${context.run.runId}:${randomUUID()}`,
    runId: context.run.runId,
    taskId: context.task.taskId,
    agentType: context.task.agentType,
    claim: input.claim,
    evidenceRefs: [],
    objectRefs: [context.run.caseId],
    confidence: input.confidence,
    impact: input.impact,
    timestamp: new Date().toISOString(),
  };
}

function buildSectionContents(
  findings: readonly FindingRecord[],
  decisionSummary: string,
): Record<FinalReportSectionKey, string> {
  return {
    final_judgment: decisionSummary,
    core_thesis: summarizeByAgent(findings, "thesis"),
    supporting_evidence: summarizeByImpact(findings, "positive"),
    key_risks: summarizeByImpact(findings, "mixed"),
    liquidity_context: summarizeByAgent(findings, "liquidity"),
    what_changes_the_view:
      "The view would weaken if execution deteriorates, liquidity turns restrictive, or market positioning becomes obviously crowded.",
  };
}

function summarizeByAgent(
  findings: readonly FindingRecord[],
  agentType: FindingRecord["agentType"],
): string {
  return findings
    .filter((finding) => finding.agentType === agentType)
    .map((finding) => finding.claim)
    .join(" ");
}

function summarizeByImpact(
  findings: readonly FindingRecord[],
  impact: FindingImpact,
): string {
  return findings
    .filter((finding) => finding.impact === impact)
    .map((finding) => finding.claim)
    .join(" ");
}

function pickCitationFindingRefs(
  findings: readonly FindingRecord[],
  sectionKey: FinalReportSectionKey,
): string[] {
  switch (sectionKey) {
    case "final_judgment":
      return findings.slice(0, 3).map((finding) => finding.findingId);
    case "core_thesis":
      return findings
        .filter((finding) => finding.agentType === "thesis")
        .map((finding) => finding.findingId);
    case "supporting_evidence":
      return findings
        .filter((finding) => finding.impact === "positive")
        .map((finding) => finding.findingId);
    case "key_risks":
      return findings
        .filter((finding) => finding.impact === "mixed" || finding.impact === "negative")
        .map((finding) => finding.findingId);
    case "liquidity_context":
      return findings
        .filter((finding) => finding.agentType === "liquidity")
        .map((finding) => finding.findingId);
    case "what_changes_the_view":
      return findings.slice(-2).map((finding) => finding.findingId);
    default:
      return [];
  }
}

export class ConsoleRuntimeEventSink {
  async publish(event: { eventType: string; title: string; agentId: string; payload: Record<string, unknown> }) {
    const payload = JSON.stringify(event.payload);
    console.log(`[${event.eventType}] ${event.agentId} ${event.title} ${payload}`);
  }
}
