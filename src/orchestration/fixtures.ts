import { randomUUID } from "node:crypto";

import type {
  EvidenceCandidate,
  InspectableRuntimeDataAdapter,
  RawSnapshotRecord,
  RuntimeDataArtifacts,
  SnapshotArtifacts,
} from "../data-layer/contracts.ts";
import {
  defaultRefreshPolicies,
  isInspectableRuntimeDataAdapter,
} from "../data-layer/contracts.ts";
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
import type { GraphPatch } from "../research-graph/graph-patch.ts";
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
  buildEvidenceCandidatePatch,
  buildEvidenceRef,
  buildJudgeCitationPatches,
  buildFindingPatch,
  buildJudgeDecisionPatch,
  buildJudgeReportPatch,
} from "./runtime-patches.ts";
import { createRunEvent } from "./events.ts";

export class FixtureRuntimeDataAdapter
  implements RuntimeDataAdapter, InspectableRuntimeDataAdapter
{
  private readonly artifactsByRun = new Map<string, RuntimeDataArtifacts>();

  getArtifacts(runId: string): RuntimeDataArtifacts | null {
    return this.artifactsByRun.get(runId) ?? null;
  }

  async getCompanySnapshot(ticker: string, runId: string): Promise<CompanySnapshot> {
    const snapshot: CompanySnapshot = {
      ticker,
      observedAt: new Date().toISOString(),
      companyName: `${ticker} Holdings`,
      businessSummary: `${ticker} is treated as a high-quality large-cap equity in the fixture runtime.`,
      keyPoints: [
        "Revenue mix remains diversified.",
        "Recent execution has stayed within expected range.",
      ],
    };

    this.storeArtifacts(runId, "company", {
      snapshot,
      rawSnapshots: [
        createFixtureRawSnapshot(runId, ticker, "company_profile", {
          companyName: snapshot.companyName,
          businessSummary: snapshot.businessSummary,
        }),
      ],
      evidenceCandidates: [
        createFixtureEvidenceCandidate(runId, ticker, "company_profile", snapshot.observedAt, snapshot.businessSummary),
      ],
      degradedReasons: [],
      cacheStatus: "miss",
    });

    return snapshot;
  }

  async getNewsSnapshot(ticker: string, runId: string): Promise<NewsSnapshot> {
    const snapshot: NewsSnapshot = {
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

    this.storeArtifacts(runId, "news", {
      snapshot,
      rawSnapshots: [
        createFixtureRawSnapshot(runId, ticker, "company_news", snapshot.items),
      ],
      evidenceCandidates: snapshot.items.map((item) =>
        createFixtureEvidenceCandidate(
          runId,
          ticker,
          "company_news",
          item.publishedAt,
          item.summary,
          item.url ?? item.id,
        )),
      degradedReasons: [],
      cacheStatus: "miss",
    });

    return snapshot;
  }

  async getMarketSnapshot(ticker: string, runId: string): Promise<MarketSnapshot> {
    const observedAt = new Date().toISOString();
    const snapshot: MarketSnapshot = {
      ticker,
      observedAt,
      latestPrice: 187.42,
      priceChangePct: 1.8,
      volume: 1280000,
      signalSummaries: [
        "Price trend is constructive but not euphoric.",
        "Positioning looks supportive rather than crowded.",
      ],
    };

    this.storeArtifacts(runId, "market", {
      snapshot,
      rawSnapshots: [
        createFixtureRawSnapshot(runId, ticker, "market_quote", {
          latestPrice: snapshot.latestPrice,
          priceChangePct: snapshot.priceChangePct,
          volume: snapshot.volume,
        }),
        createFixtureRawSnapshot(runId, ticker, "market_historical", snapshot.signalSummaries),
      ],
      evidenceCandidates: snapshot.signalSummaries.map((summary, index) =>
        createFixtureEvidenceCandidate(
          runId,
          ticker,
          index === 0 ? "market_quote" : "market_historical",
          observedAt,
          summary,
        )),
      degradedReasons: [],
      cacheStatus: "miss",
    });

    return snapshot;
  }

  async getMacroLiquiditySnapshot(runId: string): Promise<MacroLiquiditySnapshot> {
    const observedAt = new Date().toISOString();
    const snapshot: MacroLiquiditySnapshot = {
      observedAt,
      regimeLabel: "neutral_to_supportive",
      ratesSummary: "Rates pressure is manageable and liquidity conditions are not actively tightening.",
      liquiditySignals: [
        "Liquidity backdrop is stable.",
        "Macro conditions do not obviously block multiple expansion.",
      ],
    };

    this.storeArtifacts(runId, "macro", {
      snapshot,
      rawSnapshots: [
        createFixtureRawSnapshot(runId, undefined, "macro_effr", {
          ratesSummary: snapshot.ratesSummary,
        }),
        createFixtureRawSnapshot(runId, undefined, "macro_treasury_rates", snapshot.liquiditySignals),
      ],
      evidenceCandidates: [
        createFixtureEvidenceCandidate(runId, undefined, "macro_effr", observedAt, snapshot.ratesSummary),
        ...snapshot.liquiditySignals.map((summary) =>
          createFixtureEvidenceCandidate(runId, undefined, "macro_treasury_rates", observedAt, summary)),
      ],
      degradedReasons: [],
      cacheStatus: "miss",
    });

    return snapshot;
  }

  private storeArtifacts<TSnapshot>(
    runId: string,
    kind: keyof Omit<RuntimeDataArtifacts, "runId">,
    bundle: SnapshotArtifacts<TSnapshot>,
  ): void {
    const current = this.artifactsByRun.get(runId) ?? { runId };
    this.artifactsByRun.set(runId, {
      ...current,
      [kind]: bundle,
    });
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
    const evidenceCandidates = collectEvidenceCandidates(context, ["company", "news"]);
    const evidenceRefs = evidenceCandidates.map((candidate) => buildEvidenceRef(context.run.caseId, candidate));
    const thesisRef = buildStableObjectRef("Thesis", context.run.caseId, "core");
    const riskRef = buildStableObjectRef("Risk", context.run.caseId, "execution");

    const findings = [
      createFinding(context, {
        claim: `${company.companyName} still supports a credible medium-term fundamental thesis.`,
        impact: "positive",
        confidence: 0.72,
        evidenceRefs: evidenceRefs.slice(0, 2),
        objectRefs: [thesisRef],
      }),
      createFinding(context, {
        claim: `Recent news flow on ${context.query.ticker} is constructive but not strong enough to remove execution risk.`,
        impact: "mixed",
        confidence: 0.65,
        evidenceRefs: evidenceRefs.slice(1),
        objectRefs: [thesisRef, riskRef],
      }),
    ];

    return {
      ...createEmptyAgentExecutionResult("done", "Generated thesis findings from fixture snapshots."),
      findings,
      graphPatches: [
        ...(evidenceCandidates.length > 0
          ? [
              buildEvidenceCandidatePatch(
                context.run,
                context.task.agentType,
                context.task.taskId,
                evidenceCandidates,
              ),
            ]
          : []),
        buildThesisStablePatch(context, company, findings, evidenceRefs),
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
    const evidenceCandidates = collectEvidenceCandidates(context, ["macro"]);
    const evidenceRefs = evidenceCandidates.map((candidate) => buildEvidenceRef(context.run.caseId, candidate));
    const primaryLiquiditySignal =
      snapshot.liquiditySignals[0] ??
      "Liquidity signals are incomplete, so the macro read should be treated as degraded.";
    const macroActionRef = buildStableObjectRef("MacroActorAction", context.run.caseId, "policy_rates");
    const factorRef = buildStableObjectRef("LiquidityFactor", context.run.caseId, "rates_pressure");
    const regimeRef = buildStableObjectRef("LiquidityRegime", context.run.caseId, "primary");

    const findings = [
      createFinding(context, {
        claim: `${snapshot.ratesSummary}`,
        impact: "neutral",
        confidence: 0.68,
        evidenceRefs: evidenceRefs.slice(0, 1),
        objectRefs: [macroActionRef, factorRef, regimeRef],
      }),
      createFinding(context, {
        claim: `${primaryLiquiditySignal} This does not contradict the long case for ${context.query.ticker}.`,
        impact: "positive",
        confidence: 0.63,
        evidenceRefs: evidenceRefs.slice(1),
        objectRefs: [factorRef, regimeRef],
      }),
    ];

    return {
      ...createEmptyAgentExecutionResult("done", "Generated liquidity findings from fixture macro snapshot."),
      findings,
      graphPatches: [
        ...(evidenceCandidates.length > 0
          ? [
              buildEvidenceCandidatePatch(
                context.run,
                context.task.agentType,
                context.task.taskId,
                evidenceCandidates,
              ),
            ]
          : []),
        buildLiquidityStablePatch(context, snapshot, findings, evidenceRefs),
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
    const evidenceCandidates = collectEvidenceCandidates(context, ["market"]);
    const evidenceRefs = evidenceCandidates.map((candidate) => buildEvidenceRef(context.run.caseId, candidate));
    const secondarySignal =
      snapshot.signalSummaries[1] ??
      snapshot.signalSummaries[0] ??
      `${context.query.ticker} market signal coverage is incomplete, so the positioning read is degraded.`;
    const signalRef = buildStableObjectRef("MarketSignal", context.run.caseId, "price_positioning");

    const findings = [
      createFinding(context, {
        claim: `${context.query.ticker} price action is constructive without looking fully crowded.`,
        impact: "positive",
        confidence: 0.67,
        evidenceRefs: evidenceRefs.slice(0, 1),
        objectRefs: [signalRef],
      }),
      createFinding(context, {
        claim: secondarySignal,
        impact: "neutral",
        confidence: 0.61,
        evidenceRefs: evidenceRefs.slice(1),
        objectRefs: [signalRef],
      }),
    ];

    return {
      ...createEmptyAgentExecutionResult("done", "Generated market signal findings from fixture market snapshot."),
      findings,
      graphPatches: [
        ...(evidenceCandidates.length > 0
          ? [
              buildEvidenceCandidatePatch(
                context.run,
                context.task.agentType,
                context.task.taskId,
                evidenceCandidates,
              ),
            ]
          : []),
        buildMarketSignalStablePatch(context, snapshot, findings, evidenceRefs),
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
      citationEvidenceRefs: pickCitationEvidenceRefs(context.upstreamFindings, section.sectionKey),
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
        ...buildJudgeCitationPatches(
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

function createFixtureRawSnapshot(
  runId: string,
  ticker: string | undefined,
  sourceType: RawSnapshotRecord["sourceType"],
  payload: unknown,
): RawSnapshotRecord {
  const observedAt = new Date().toISOString();

  return {
    snapshotId: `raw:${runId}:${sourceType}`,
    runId,
    provider: "fixture",
    sourceType,
    fetchedAt: observedAt,
    requestKey: `fixture:${sourceType}`,
    requestParams: {},
    cachePolicy: defaultRefreshPolicies[sourceType],
    payload,
    ...(ticker ? { ticker } : {}),
  };
}

function createFixtureEvidenceCandidate(
  runId: string,
  ticker: string | undefined,
  sourceType: EvidenceCandidate["sourceType"],
  observedAt: string,
  summary: string,
  sourceRef?: string,
): EvidenceCandidate {
  return {
    candidateId: `candidate:${runId}:${sourceType}:${summary.slice(0, 24)}`,
    runId,
    provider: "fixture",
    sourceType,
    sourceRef: sourceRef ?? `${sourceType}:${observedAt}`,
    observedAt,
    summary,
    supportedObjects:
      sourceType === "market_quote" || sourceType === "market_historical"
        ? ["MarketSignal"]
        : sourceType === "macro_effr" || sourceType === "macro_treasury_rates"
          ? ["MacroActorAction", "LiquidityFactor", "LiquidityRegime"]
          : ["Thesis", "Risk"],
    rawSnapshotRef: `raw:${runId}:${sourceType}`,
    ...(ticker ? { ticker } : {}),
  };
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
    evidenceRefs?: string[];
    objectRefs?: string[];
  },
): FindingRecord {
  return {
    findingId: `finding:${context.run.runId}:${randomUUID()}`,
    runId: context.run.runId,
    taskId: context.task.taskId,
    agentType: context.task.agentType,
    claim: input.claim,
    evidenceRefs: input.evidenceRefs ?? [],
    objectRefs: input.objectRefs ?? [context.run.caseId],
    confidence: input.confidence,
    impact: input.impact,
    timestamp: new Date().toISOString(),
  };
}

function buildThesisStablePatch(
  context: AgentExecutionContext,
  company: CompanySnapshot,
  findings: readonly FindingRecord[],
  evidenceRefs: readonly string[],
): GraphPatch {
  const thesisRef = buildStableObjectRef("Thesis", context.run.caseId, "core");
  const riskRef = buildStableObjectRef("Risk", context.run.caseId, "execution");
  const operations: GraphPatch["operations"] = [
    {
      opId: `op:${context.task.taskId}:thesis:merge`,
      type: "merge_node",
      resolvedRef: thesisRef,
      nodeType: "Thesis",
      matchKeys: {
        caseId: context.run.caseId,
        thesisId: "core",
      },
      properties: {
        thesisId: "core",
        caseId: context.run.caseId,
        stance: "bullish",
        summary: findings[0]?.claim ?? `${company.companyName} supports a constructive thesis.`,
        timeframe: context.query.timeHorizon,
        status: "active",
      },
    },
    {
      opId: `op:${context.task.taskId}:case-has-thesis`,
      type: "create_edge",
      edgeType: "HAS_THESIS",
      fromRef: context.run.caseId,
      toRef: thesisRef,
      properties: {},
    },
    {
      opId: `op:${context.task.taskId}:risk:merge`,
      type: "merge_node",
      resolvedRef: riskRef,
      nodeType: "Risk",
      matchKeys: {
        caseId: context.run.caseId,
        riskId: "execution",
      },
      properties: {
        riskId: "execution",
        caseId: context.run.caseId,
        riskType: "execution",
        statement:
          findings[1]?.claim ??
          `${context.query.ticker} still carries execution and sentiment risk.`,
        severity: "medium",
        timeframe: context.query.timeHorizon,
      },
    },
    {
      opId: `op:${context.task.taskId}:case-has-risk`,
      type: "create_edge",
      edgeType: "HAS_RISK",
      fromRef: context.run.caseId,
      toRef: riskRef,
      properties: {},
    },
  ];

  if (evidenceRefs[0]) {
    operations.push({
      opId: `op:${context.task.taskId}:thesis-supported-by`,
      type: "attach_evidence",
      targetRef: thesisRef,
      evidenceRef: evidenceRefs[0],
      relationType: "SUPPORTED_BY",
    });
  }

  if (evidenceRefs[1]) {
    operations.push(
      {
        opId: `op:${context.task.taskId}:thesis-challenged-by`,
        type: "attach_evidence",
        targetRef: thesisRef,
        evidenceRef: evidenceRefs[1],
        relationType: "CHALLENGED_BY",
      },
      {
        opId: `op:${context.task.taskId}:risk-supported-by`,
        type: "attach_evidence",
        targetRef: riskRef,
        evidenceRef: evidenceRefs[1],
        relationType: "SUPPORTED_BY",
      },
    );
  }

  return buildCaseScopePatch(context, "stable-thesis-risk", operations);
}

function buildLiquidityStablePatch(
  context: AgentExecutionContext,
  snapshot: MacroLiquiditySnapshot,
  findings: readonly FindingRecord[],
  evidenceRefs: readonly string[],
): GraphPatch {
  const macroActionRef = buildStableObjectRef("MacroActorAction", context.run.caseId, "policy_rates");
  const factorRef = buildStableObjectRef("LiquidityFactor", context.run.caseId, "rates_pressure");
  const regimeRef = buildStableObjectRef("LiquidityRegime", context.run.caseId, "primary");
  const operations: GraphPatch["operations"] = [
    {
      opId: `op:${context.task.taskId}:macro-action:merge`,
      type: "merge_node",
      resolvedRef: macroActionRef,
      nodeType: "MacroActorAction",
      matchKeys: {
        caseId: context.run.caseId,
        actionId: "policy_rates",
      },
      properties: {
        actionId: "policy_rates",
        caseId: context.run.caseId,
        actor: "Federal Reserve",
        actionType: "rate_policy",
        summary: findings[0]?.claim ?? snapshot.ratesSummary,
        effectiveDate: snapshot.observedAt,
      },
    },
    {
      opId: `op:${context.task.taskId}:liquidity-factor:merge`,
      type: "merge_node",
      resolvedRef: factorRef,
      nodeType: "LiquidityFactor",
      matchKeys: {
        caseId: context.run.caseId,
        factorId: "rates_pressure",
      },
      properties: {
        factorId: "rates_pressure",
        caseId: context.run.caseId,
        factorType: "rates_pressure",
        direction: classifyLiquidityDirection(snapshot.regimeLabel),
        summary: findings[0]?.claim ?? snapshot.ratesSummary,
        observedAt: snapshot.observedAt,
      },
    },
    {
      opId: `op:${context.task.taskId}:case-has-factor`,
      type: "create_edge",
      edgeType: "HAS_LIQUIDITY_FACTOR",
      fromRef: context.run.caseId,
      toRef: factorRef,
      properties: {},
    },
    {
      opId: `op:${context.task.taskId}:factor-derived-from-action`,
      type: "create_edge",
      edgeType: "DERIVED_FROM",
      fromRef: factorRef,
      toRef: macroActionRef,
      properties: {},
    },
    {
      opId: `op:${context.task.taskId}:liquidity-regime:merge`,
      type: "merge_node",
      resolvedRef: regimeRef,
      nodeType: "LiquidityRegime",
      matchKeys: {
        caseId: context.run.caseId,
        regimeId: "primary",
      },
      properties: {
        regimeId: "primary",
        caseId: context.run.caseId,
        label: snapshot.regimeLabel,
        timeframe: context.query.timeHorizon,
        confidence: findings[1]?.confidence ?? 0.6,
        observedAt: snapshot.observedAt,
      },
    },
    {
      opId: `op:${context.task.taskId}:case-has-regime`,
      type: "create_edge",
      edgeType: "HAS_LIQUIDITY_REGIME",
      fromRef: context.run.caseId,
      toRef: regimeRef,
      properties: {},
    },
  ];

  if (evidenceRefs[0]) {
    operations.push(
      {
        opId: `op:${context.task.taskId}:macro-action-supported-by`,
        type: "attach_evidence",
        targetRef: macroActionRef,
        evidenceRef: evidenceRefs[0],
        relationType: "SUPPORTED_BY",
      },
      {
        opId: `op:${context.task.taskId}:factor-supported-by`,
        type: "attach_evidence",
        targetRef: factorRef,
        evidenceRef: evidenceRefs[0],
        relationType: "SUPPORTED_BY",
      },
    );
  }

  if (evidenceRefs[1]) {
    operations.push({
      opId: `op:${context.task.taskId}:regime-supported-by`,
      type: "attach_evidence",
      targetRef: regimeRef,
      evidenceRef: evidenceRefs[1],
      relationType: "SUPPORTED_BY",
    });
  }

  return buildCaseScopePatch(context, "stable-liquidity", operations);
}

function buildMarketSignalStablePatch(
  context: AgentExecutionContext,
  snapshot: MarketSnapshot,
  findings: readonly FindingRecord[],
  evidenceRefs: readonly string[],
): GraphPatch {
  const signalRef = buildStableObjectRef("MarketSignal", context.run.caseId, "price_positioning");
  const operations: GraphPatch["operations"] = [
    {
      opId: `op:${context.task.taskId}:market-signal:merge`,
      type: "merge_node",
      resolvedRef: signalRef,
      nodeType: "MarketSignal",
      matchKeys: {
        caseId: context.run.caseId,
        signalId: "price_positioning",
      },
      properties: {
        signalId: "price_positioning",
        caseId: context.run.caseId,
        signalType: "price_positioning",
        timeframe: context.query.timeHorizon,
        direction: classifyMarketSignalDirection(findings),
        observedAt: snapshot.observedAt,
      },
    },
    {
      opId: `op:${context.task.taskId}:case-has-signal`,
      type: "create_edge",
      edgeType: "HAS_SIGNAL",
      fromRef: context.run.caseId,
      toRef: signalRef,
      properties: {},
    },
  ];

  for (const [index, evidenceRef] of evidenceRefs.entries()) {
    operations.push({
      opId: `op:${context.task.taskId}:signal-supported-by:${index + 1}`,
      type: "attach_evidence",
      targetRef: signalRef,
      evidenceRef,
      relationType: "SUPPORTED_BY",
    });
  }

  return buildCaseScopePatch(context, "stable-market-signal", operations);
}

function buildCaseScopePatch(
  context: AgentExecutionContext,
  suffix: string,
  operations: GraphPatch["operations"],
): GraphPatch {
  return {
    patchId: `patch:${context.run.runId}:${context.task.taskId}:${suffix}`,
    runId: context.run.runId,
    agentType: context.task.agentType,
    targetScope: "case",
    basisRefs: [context.task.taskId],
    operations,
  };
}

function buildStableObjectRef(
  nodeType: "Thesis" | "Risk" | "MacroActorAction" | "LiquidityFactor" | "LiquidityRegime" | "MarketSignal",
  caseId: string,
  localId: string,
): string {
  return `${nodeType.toLowerCase()}:${caseId}:${localId}`;
}

function classifyLiquidityDirection(regimeLabel: string): string {
  if (regimeLabel.includes("supportive")) {
    return "tailwind";
  }

  if (regimeLabel.includes("tight") || regimeLabel.includes("cautious")) {
    return "headwind";
  }

  return "neutral";
}

function classifyMarketSignalDirection(findings: readonly FindingRecord[]): string {
  const positiveCount = findings.filter((finding) => finding.impact === "positive").length;
  const negativeCount = findings.filter((finding) => finding.impact === "negative").length;

  if (positiveCount > negativeCount) {
    return "supportive";
  }

  if (negativeCount > positiveCount) {
    return "adverse";
  }

  return "neutral";
}

function collectEvidenceCandidates(
  context: AgentExecutionContext,
  kinds: Array<keyof Omit<RuntimeDataArtifacts, "runId">>,
): EvidenceCandidate[] {
  if (!isInspectableRuntimeDataAdapter(context.dataAdapter)) {
    return [];
  }

  const artifacts = context.dataAdapter.getArtifacts(context.run.runId);

  if (!artifacts) {
    return [];
  }

  const candidates = kinds.flatMap((kind) => artifacts[kind]?.evidenceCandidates ?? []);
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.candidateId)) {
      return false;
    }

    seen.add(candidate.candidateId);
    return true;
  });
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

function pickCitationEvidenceRefs(
  findings: readonly FindingRecord[],
  sectionKey: FinalReportSectionKey,
): string[] {
  switch (sectionKey) {
    case "final_judgment":
      return uniqueEvidenceRefs(findings.slice(0, 3));
    case "core_thesis":
      return uniqueEvidenceRefs(
        findings.filter((finding) => finding.agentType === "thesis"),
      );
    case "supporting_evidence":
      return uniqueEvidenceRefs(
        findings.filter((finding) => finding.impact === "positive"),
      );
    case "key_risks":
      return uniqueEvidenceRefs(
        findings.filter((finding) => finding.impact === "mixed" || finding.impact === "negative"),
      );
    case "liquidity_context":
      return uniqueEvidenceRefs(
        findings.filter((finding) => finding.agentType === "liquidity"),
      );
    case "what_changes_the_view":
      return uniqueEvidenceRefs(findings.slice(-2));
    default:
      return [];
  }
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

function uniqueEvidenceRefs(findings: readonly FindingRecord[]): string[] {
  return [...new Set(findings.flatMap((finding) => finding.evidenceRefs))];
}

export class ConsoleRuntimeEventSink {
  async publish(event: { eventType: string; title: string; agentId: string; payload: Record<string, unknown> }) {
    const payload = JSON.stringify(event.payload);
    console.log(`[${event.eventType}] ${event.agentId} ${event.title} ${payload}`);
  }
}
