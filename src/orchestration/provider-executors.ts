import type { EvidenceCandidate } from "../data-layer/contracts.ts";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  AgentExecutor,
  AgentExecutorMap,
} from "./agent-runtime.ts";
import { createEmptyAgentExecutionResult } from "./agent-runtime.ts";
import type {
  DecisionRecord,
  FinalReportSectionKey,
  FindingImpact,
  FindingRecord,
  ReportSectionRecord,
  ReportSectionStatus,
} from "./contracts.ts";
import { createEmptyReportSections, buildFinalReport } from "./report.ts";
import type { StructuredModelProvider } from "./model-provider.ts";
import {
  buildEvidenceCandidatePatch,
  buildEvidenceRef,
  buildFindingPatch,
  buildJudgeCitationPatches,
  buildJudgeDecisionPatch,
  buildJudgeReportPatch,
} from "./runtime-patches.ts";
import {
  buildLiquidityStablePatch,
  buildMarketSignalStablePatch,
  buildStableObjectRef,
  buildThesisStablePatch,
  collectEvidenceCandidates,
  createFinding,
  publishToolEvent,
  requireDataAdapter,
} from "./fixtures.ts";

type ThesisObjectKey = "thesis_core" | "risk_execution";
type LiquidityObjectKey =
  | "macro_action_policy_rates"
  | "liquidity_factor_rates_pressure"
  | "liquidity_regime_primary";
type MarketObjectKey = "market_signal_price_positioning";

interface ProviderFindingPlan<TObjectKey extends string> {
  summary: string;
  findings: Array<{
    claim: string;
    impact: FindingImpact;
    confidence: number;
    evidenceIndexes: number[];
    objectKeys: TObjectKey[];
  }>;
}

interface ProviderJudgePlan {
  summary: string;
  confidenceBand: string;
  sections: {
    [K in FinalReportSectionKey]: {
      content: string;
      findingIndexes: number[];
      status: ReportSectionStatus;
    };
  };
}

class ProviderThesisExecutor implements AgentExecutor {
  readonly agentType = "thesis" as const;
  private readonly provider: StructuredModelProvider;

  constructor(provider: StructuredModelProvider) {
    this.provider = provider;
  }

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
    const plan = await this.provider.generateObject<ProviderFindingPlan<ThesisObjectKey>>({
      schemaName: "delphi_thesis_findings",
      schemaDescription: "Structured thesis findings for one investment research run.",
      schema: providerFindingSchema(["thesis_core", "risk_execution"]),
      developerPrompt:
        "You are Delphi thesis agent. Produce 1-3 concise findings grounded only in the supplied company and news snapshots. Do not invent evidence. Use the allowed object keys only.",
      userPrompt: [
        `Ticker: ${context.query.ticker}`,
        `Question: ${context.query.userQuestion}`,
        `Time horizon: ${context.query.timeHorizon}`,
        `Company snapshot: ${JSON.stringify(company)}`,
        `News snapshot: ${JSON.stringify(news)}`,
        formatEvidenceCandidates(evidenceCandidates),
        "Allowed object keys:",
        '- "thesis_core": the primary Thesis object',
        '- "risk_execution": the primary execution Risk object',
      ].join("\n"),
    });

    const findings = plan.output.findings.map((finding) =>
      createFinding(context, {
        claim: finding.claim,
        impact: finding.impact,
        confidence: normalizeConfidence(finding.confidence),
        evidenceRefs: pickEvidenceRefs(evidenceRefs, finding.evidenceIndexes),
        objectRefs: finding.objectKeys.map((key) => thesisObjectRef(context, key)),
      }));

    return {
      ...createEmptyAgentExecutionResult("done", plan.output.summary),
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

class ProviderLiquidityExecutor implements AgentExecutor {
  readonly agentType = "liquidity" as const;
  private readonly provider: StructuredModelProvider;

  constructor(provider: StructuredModelProvider) {
    this.provider = provider;
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const adapter = requireDataAdapter(context);
    await publishToolEvent(context, "tool_started", "Fetching macro and liquidity snapshot.");
    const snapshot = await adapter.getMacroLiquiditySnapshot(context.run.runId);
    await publishToolEvent(context, "tool_finished", "Fetched macro and liquidity snapshot.", {
      regimeLabel: snapshot.regimeLabel,
    });

    const evidenceCandidates = collectEvidenceCandidates(context, ["macro"]);
    const evidenceRefs = evidenceCandidates.map((candidate) => buildEvidenceRef(context.run.caseId, candidate));
    const plan = await this.provider.generateObject<ProviderFindingPlan<LiquidityObjectKey>>({
      schemaName: "delphi_liquidity_findings",
      schemaDescription: "Structured liquidity findings for one investment research run.",
      schema: providerFindingSchema([
        "macro_action_policy_rates",
        "liquidity_factor_rates_pressure",
        "liquidity_regime_primary",
      ]),
      developerPrompt:
        "You are Delphi liquidity agent. Produce 1-3 concise findings grounded only in the supplied macro and liquidity snapshot. Do not invent evidence. Use the allowed object keys only.",
      userPrompt: [
        `Ticker: ${context.query.ticker}`,
        `Question: ${context.query.userQuestion}`,
        `Time horizon: ${context.query.timeHorizon}`,
        `Macro/liquidity snapshot: ${JSON.stringify(snapshot)}`,
        formatEvidenceCandidates(evidenceCandidates),
        "Allowed object keys:",
        '- "macro_action_policy_rates": the MacroActorAction object',
        '- "liquidity_factor_rates_pressure": the LiquidityFactor object',
        '- "liquidity_regime_primary": the LiquidityRegime object',
      ].join("\n"),
    });

    const findings = plan.output.findings.map((finding) =>
      createFinding(context, {
        claim: finding.claim,
        impact: finding.impact,
        confidence: normalizeConfidence(finding.confidence),
        evidenceRefs: pickEvidenceRefs(evidenceRefs, finding.evidenceIndexes),
        objectRefs: finding.objectKeys.map((key) => liquidityObjectRef(context, key)),
      }));

    return {
      ...createEmptyAgentExecutionResult("done", plan.output.summary),
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

class ProviderMarketSignalExecutor implements AgentExecutor {
  readonly agentType = "market_signal" as const;
  private readonly provider: StructuredModelProvider;

  constructor(provider: StructuredModelProvider) {
    this.provider = provider;
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const adapter = requireDataAdapter(context);
    await publishToolEvent(context, "tool_started", "Fetching market snapshot.");
    const snapshot = await adapter.getMarketSnapshot(context.query.ticker, context.run.runId);
    await publishToolEvent(context, "tool_finished", "Fetched market snapshot.", {
      latestPrice: snapshot.latestPrice ?? null,
    });

    const evidenceCandidates = collectEvidenceCandidates(context, ["market"]);
    const evidenceRefs = evidenceCandidates.map((candidate) => buildEvidenceRef(context.run.caseId, candidate));
    const plan = await this.provider.generateObject<ProviderFindingPlan<MarketObjectKey>>({
      schemaName: "delphi_market_signal_findings",
      schemaDescription: "Structured market signal findings for one investment research run.",
      schema: providerFindingSchema(["market_signal_price_positioning"]),
      developerPrompt:
        "You are Delphi market signal agent. Produce 1-3 concise findings grounded only in the supplied market snapshot. Do not invent evidence. Use the allowed object key only.",
      userPrompt: [
        `Ticker: ${context.query.ticker}`,
        `Question: ${context.query.userQuestion}`,
        `Time horizon: ${context.query.timeHorizon}`,
        `Market snapshot: ${JSON.stringify(snapshot)}`,
        formatEvidenceCandidates(evidenceCandidates),
        "Allowed object keys:",
        '- "market_signal_price_positioning": the primary MarketSignal object',
      ].join("\n"),
    });

    const findings = plan.output.findings.map((finding) =>
      createFinding(context, {
        claim: finding.claim,
        impact: finding.impact,
        confidence: normalizeConfidence(finding.confidence),
        evidenceRefs: pickEvidenceRefs(evidenceRefs, finding.evidenceIndexes),
        objectRefs: finding.objectKeys.map((key) => marketObjectRef(context, key)),
      }));

    return {
      ...createEmptyAgentExecutionResult("done", plan.output.summary),
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

class ProviderJudgeExecutor implements AgentExecutor {
  readonly agentType = "judge" as const;
  private readonly provider: StructuredModelProvider;

  constructor(provider: StructuredModelProvider) {
    this.provider = provider;
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const upstream = context.upstreamFindings.map((finding, index) => ({
      index,
      findingId: finding.findingId,
      agentType: finding.agentType,
      claim: finding.claim,
      impact: finding.impact,
      confidence: finding.confidence,
      evidenceRefs: finding.evidenceRefs,
      objectRefs: finding.objectRefs,
    }));

    const plan = await this.provider.generateObject<ProviderJudgePlan>({
      schemaName: "delphi_judge_report",
      schemaDescription: "Structured decision and six fixed report sections for one run.",
      schema: providerJudgeSchema(),
      developerPrompt:
        "You are Delphi judge. Use only the supplied findings to produce one decision summary and six fixed report sections. Do not invent evidence or findings. Every section must be present.",
      userPrompt: [
        `Ticker: ${context.query.ticker}`,
        `Question: ${context.query.userQuestion}`,
        `Time horizon: ${context.query.timeHorizon}`,
        `Available findings: ${JSON.stringify(upstream)}`,
      ].join("\n"),
    });

    const decision: DecisionRecord = {
      decisionId: `decision:${context.run.runId}:primary`,
      runId: context.run.runId,
      decisionType: "investment_view",
      summary: plan.output.summary,
      confidenceBand: plan.output.confidenceBand,
      basisFindingRefs: context.upstreamFindings.map((finding) => finding.findingId),
      updatedObjectRefs: unique(
        context.upstreamFindings.flatMap((finding) => finding.objectRefs),
      ),
    };

    const reportSections = createEmptyReportSections(context.run.runId).map((section) =>
      buildProviderReportSection(section, context.upstreamFindings, plan.output.sections[section.sectionKey]));

    const finalReport = buildFinalReport({
      runId: context.run.runId,
      caseId: context.run.caseId,
      sections: reportSections,
    });

    return {
      ...createEmptyAgentExecutionResult("done", "Synthesized provider-backed findings into one decision and six report sections."),
      decision,
      reportSections,
      finalReport,
      graphPatches: [
        buildJudgeDecisionPatch(context.run, context.task.taskId, decision),
        buildJudgeReportPatch(context.run, context.task.taskId, decision, reportSections),
        ...buildJudgeCitationPatches(context.run, context.task.taskId, decision, reportSections),
      ],
    };
  }
}

export function createProviderExecutors(
  provider: StructuredModelProvider,
): AgentExecutorMap {
  return {
    thesis: new ProviderThesisExecutor(provider),
    liquidity: new ProviderLiquidityExecutor(provider),
    market_signal: new ProviderMarketSignalExecutor(provider),
    judge: new ProviderJudgeExecutor(provider),
  };
}

function providerFindingSchema(objectKeys: readonly string[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "findings"],
    properties: {
      summary: {
        type: "string",
      },
      findings: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["claim", "impact", "confidence", "evidenceIndexes", "objectKeys"],
          properties: {
            claim: { type: "string" },
            impact: {
              type: "string",
              enum: ["positive", "neutral", "negative", "mixed"],
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            evidenceIndexes: {
              type: "array",
              items: {
                type: "integer",
                minimum: 0,
              },
            },
            objectKeys: {
              type: "array",
              minItems: 1,
              items: {
                type: "string",
                enum: [...objectKeys],
              },
            },
          },
        },
      },
    },
  };
}

function providerJudgeSchema(): Record<string, unknown> {
  const sectionSchema = {
    type: "object",
    additionalProperties: false,
    required: ["content", "findingIndexes", "status"],
    properties: {
      content: {
        type: "string",
      },
      findingIndexes: {
        type: "array",
        items: {
          type: "integer",
          minimum: 0,
        },
      },
      status: {
        type: "string",
        enum: ["ready", "empty", "degraded"],
      },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "confidenceBand", "sections"],
    properties: {
      summary: { type: "string" },
      confidenceBand: { type: "string" },
      sections: {
        type: "object",
        additionalProperties: false,
        required: [
          "final_judgment",
          "core_thesis",
          "supporting_evidence",
          "key_risks",
          "liquidity_context",
          "what_changes_the_view",
        ],
        properties: {
          final_judgment: sectionSchema,
          core_thesis: sectionSchema,
          supporting_evidence: sectionSchema,
          key_risks: sectionSchema,
          liquidity_context: sectionSchema,
          what_changes_the_view: sectionSchema,
        },
      },
    },
  };
}

function thesisObjectRef(context: AgentExecutionContext, key: ThesisObjectKey): string {
  switch (key) {
    case "thesis_core":
      return buildStableObjectRef("Thesis", context.run.caseId, "core");
    case "risk_execution":
      return buildStableObjectRef("Risk", context.run.caseId, "execution");
  }
}

function liquidityObjectRef(
  context: AgentExecutionContext,
  key: LiquidityObjectKey,
): string {
  switch (key) {
    case "macro_action_policy_rates":
      return buildStableObjectRef("MacroActorAction", context.run.caseId, "policy_rates");
    case "liquidity_factor_rates_pressure":
      return buildStableObjectRef("LiquidityFactor", context.run.caseId, "rates_pressure");
    case "liquidity_regime_primary":
      return buildStableObjectRef("LiquidityRegime", context.run.caseId, "primary");
  }
}

function marketObjectRef(context: AgentExecutionContext, key: MarketObjectKey): string {
  switch (key) {
    case "market_signal_price_positioning":
      return buildStableObjectRef("MarketSignal", context.run.caseId, "price_positioning");
  }
}

function pickEvidenceRefs(
  evidenceRefs: readonly string[],
  indexes: readonly number[],
): string[] {
  return unique(
    indexes
      .map((index) => evidenceRefs[index])
      .filter((value): value is string => typeof value === "string"),
  );
}

function formatEvidenceCandidates(candidates: readonly EvidenceCandidate[]): string {
  if (candidates.length === 0) {
    return "Evidence candidates: []";
  }

  return `Evidence candidates: ${JSON.stringify(
    candidates.map((candidate, index) => ({
      index,
      summary: candidate.summary,
      sourceType: candidate.sourceType,
      supportedObjects: candidate.supportedObjects,
    })),
  )}`;
}

function buildProviderReportSection(
  section: ReportSectionRecord,
  findings: readonly FindingRecord[],
  plan: ProviderJudgePlan["sections"][FinalReportSectionKey],
): ReportSectionRecord {
  const citedFindings = unique(
    plan.findingIndexes
      .map((index) => findings[index])
      .filter((finding): finding is FindingRecord => Boolean(finding)),
  );

  return {
    ...section,
    content: plan.content,
    status: plan.status,
    citationFindingRefs: citedFindings.map((finding) => finding.findingId),
    citationEvidenceRefs: unique(citedFindings.flatMap((finding) => finding.evidenceRefs)),
    citationObjectRefs: unique(citedFindings.flatMap((finding) => finding.objectRefs)),
  };
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
