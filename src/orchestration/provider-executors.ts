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
import { createRunEvent } from "./events.ts";
import {
  defaultSkillCapabilityByAgent,
  type SkillDefinition,
} from "./registry.ts";
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

interface LoadedGraphContext {
  summary: string;
  refs: string[];
}

class ProviderThesisExecutor implements AgentExecutor {
  readonly agentType = "thesis" as const;
  private readonly provider: StructuredModelProvider;

  constructor(provider: StructuredModelProvider) {
    this.provider = provider;
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    return dispatchProviderSkill(context, this.provider);
  }
}

class ProviderLiquidityExecutor implements AgentExecutor {
  readonly agentType = "liquidity" as const;
  private readonly provider: StructuredModelProvider;

  constructor(provider: StructuredModelProvider) {
    this.provider = provider;
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    return dispatchProviderSkill(context, this.provider);
  }
}

class ProviderMarketSignalExecutor implements AgentExecutor {
  readonly agentType = "market_signal" as const;
  private readonly provider: StructuredModelProvider;

  constructor(provider: StructuredModelProvider) {
    this.provider = provider;
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    return dispatchProviderSkill(context, this.provider);
  }
}

class ProviderJudgeExecutor implements AgentExecutor {
  readonly agentType = "judge" as const;
  private readonly provider: StructuredModelProvider;

  constructor(provider: StructuredModelProvider) {
    this.provider = provider;
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    return dispatchProviderSkill(context, this.provider);
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

type ProviderSkillRunner = (
  context: AgentExecutionContext,
  provider: StructuredModelProvider,
  skill: SkillDefinition,
) => Promise<AgentExecutionResult>;

const providerSkillRunners: Record<string, ProviderSkillRunner> = {
  thesis_analysis: runProviderThesisAnalysis,
  liquidity_analysis: runProviderLiquidityAnalysis,
  market_signal_analysis: runProviderMarketSignalAnalysis,
  judge_synthesis: runProviderJudgeSynthesis,
};

async function dispatchProviderSkill(
  context: AgentExecutionContext,
  provider: StructuredModelProvider,
): Promise<AgentExecutionResult> {
  const capabilityName = defaultSkillCapabilityByAgent[context.task.agentType];
  const skill = context.skillRegistry.getForAgent(
    context.task.agentType,
    capabilityName,
  );

  if (!skill) {
    throw new Error(
      `Missing registered skill ${capabilityName} for agent ${context.task.agentType}.`,
    );
  }

  const runner = providerSkillRunners[skill.capabilityName];

  if (!runner) {
    throw new Error(
      `No provider skill runner registered for ${skill.capabilityName}.`,
    );
  }

  return runner(context, provider, skill);
}

async function runProviderThesisAnalysis(
  context: AgentExecutionContext,
  provider: StructuredModelProvider,
  skill: SkillDefinition,
): Promise<AgentExecutionResult> {
  const adapter = requireDataAdapter(context);
  const graphContext = await loadGraphContext(context);
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
  const plan = await provider.generateObject<ProviderFindingPlan<ThesisObjectKey>>({
    schemaName: "delphi_thesis_findings",
    schemaDescription: "Structured thesis findings for one investment research run.",
    schema: providerFindingSchema(["thesis_core", "risk_execution"]),
    developerPrompt: buildSkillGuidedPrompt(
      "You are Delphi thesis agent. Produce 2-4 substantial findings grounded only in the supplied company and news snapshots. Each finding should capture a decisive investment point rather than a generic summary. Do not invent evidence. Use the allowed object keys only.",
      skill,
    ),
    userPrompt: [
      `Ticker: ${context.query.ticker}`,
      `Question: ${context.query.userQuestion}`,
      `Time horizon: ${context.query.timeHorizon}`,
      ...(graphContext?.summary.trim().length
        ? [`Graph context:\n${graphContext.summary}`]
        : []),
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
        buildSkillRef(context, skill),
        findings,
      ),
    ],
  };
}

async function runProviderLiquidityAnalysis(
  context: AgentExecutionContext,
  provider: StructuredModelProvider,
  skill: SkillDefinition,
): Promise<AgentExecutionResult> {
  const adapter = requireDataAdapter(context);
  const graphContext = await loadGraphContext(context);
  await publishToolEvent(context, "tool_started", "Fetching macro and liquidity snapshot.");
  const snapshot = await adapter.getMacroLiquiditySnapshot(context.run.runId);
  await publishToolEvent(context, "tool_finished", "Fetched macro and liquidity snapshot.", {
    regimeLabel: snapshot.regimeLabel,
  });

  const evidenceCandidates = collectEvidenceCandidates(context, ["macro"]);
  const evidenceRefs = evidenceCandidates.map((candidate) => buildEvidenceRef(context.run.caseId, candidate));
  const plan = await provider.generateObject<ProviderFindingPlan<LiquidityObjectKey>>({
    schemaName: "delphi_liquidity_findings",
    schemaDescription: "Structured liquidity findings for one investment research run.",
    schema: providerFindingSchema([
      "macro_action_policy_rates",
      "liquidity_factor_rates_pressure",
      "liquidity_regime_primary",
    ]),
    developerPrompt: buildSkillGuidedPrompt(
      "You are Delphi liquidity agent. Produce 2-4 substantial findings grounded only in the supplied macro and liquidity snapshot. Each finding should state the regime implication for the investment case, not generic macro commentary. Do not invent evidence. Use the allowed object keys only.",
      skill,
    ),
    userPrompt: [
      `Ticker: ${context.query.ticker}`,
      `Question: ${context.query.userQuestion}`,
      `Time horizon: ${context.query.timeHorizon}`,
      ...(graphContext?.summary.trim().length
        ? [`Graph context:\n${graphContext.summary}`]
        : []),
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
        buildSkillRef(context, skill),
        findings,
      ),
    ],
  };
}

async function runProviderMarketSignalAnalysis(
  context: AgentExecutionContext,
  provider: StructuredModelProvider,
  skill: SkillDefinition,
): Promise<AgentExecutionResult> {
  const adapter = requireDataAdapter(context);
  const graphContext = await loadGraphContext(context);
  await publishToolEvent(context, "tool_started", "Fetching market snapshot.");
  const snapshot = await adapter.getMarketSnapshot(context.query.ticker, context.run.runId);
  await publishToolEvent(context, "tool_finished", "Fetched market snapshot.", {
    latestPrice: snapshot.latestPrice ?? null,
  });

  const evidenceCandidates = collectEvidenceCandidates(context, ["market"]);
  const evidenceRefs = evidenceCandidates.map((candidate) => buildEvidenceRef(context.run.caseId, candidate));
  const plan = await provider.generateObject<ProviderFindingPlan<MarketObjectKey>>({
    schemaName: "delphi_market_signal_findings",
    schemaDescription: "Structured market signal findings for one investment research run.",
    schema: providerFindingSchema(["market_signal_price_positioning"]),
    developerPrompt: buildSkillGuidedPrompt(
      "You are Delphi market signal agent. Produce 2-4 substantial findings grounded only in the supplied market snapshot. Focus on positioning, crowding, and practical risk posture rather than generic tape reading. Do not invent evidence. Use the allowed object key only.",
      skill,
    ),
    userPrompt: [
      `Ticker: ${context.query.ticker}`,
      `Question: ${context.query.userQuestion}`,
      `Time horizon: ${context.query.timeHorizon}`,
      ...(graphContext?.summary.trim().length
        ? [`Graph context:\n${graphContext.summary}`]
        : []),
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
        buildSkillRef(context, skill),
        findings,
      ),
    ],
  };
}

async function runProviderJudgeSynthesis(
  context: AgentExecutionContext,
  provider: StructuredModelProvider,
  skill: SkillDefinition,
): Promise<AgentExecutionResult> {
  const graphContext = await loadGraphContext(context);
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

  const plan = await provider.generateObject<ProviderJudgePlan>({
    schemaName: "delphi_judge_report",
    schemaDescription: "Structured decision and six fixed report sections for one run.",
    schema: providerJudgeSchema(),
    developerPrompt: buildSkillGuidedPrompt(
      "You are Delphi judge. Use only the supplied findings to produce one decision summary and six fixed report sections. Write memo-style sections with concrete reasoning and explicit conflicts or tradeoffs when they exist. Do not invent evidence or findings. Every section must be present.",
      skill,
    ),
    userPrompt: [
      `Ticker: ${context.query.ticker}`,
      `Question: ${context.query.userQuestion}`,
      `Time horizon: ${context.query.timeHorizon}`,
      ...(graphContext?.summary.trim().length
        ? [`Graph context:\n${graphContext.summary}`]
        : []),
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

  for (const section of reportSections) {
    await context.eventSink.publish(
      createRunEvent({
        runId: context.run.runId,
        agentId: `agent:${context.run.runId}:judge`,
        eventType: "report_section_ready",
        title: `Report section ready: ${section.title}.`,
        payload: {
          reportId: finalReport.reportId,
          ...section,
        },
      }),
    );
  }

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

async function loadGraphContext(
  context: AgentExecutionContext,
): Promise<LoadedGraphContext | null> {
  if (!context.graphContextReader) {
    return null;
  }

  await context.eventSink.publish(
    createRunEvent({
      runId: context.run.runId,
      agentId: `agent:${context.run.runId}:${context.task.agentType}`,
      eventType: "tool_started",
      title: "Reading graph context.",
      payload: {
        taskId: context.task.taskId,
        capability: "graph_context_retrieval",
      },
    }),
  );

  const [runContext, caseContext] = await Promise.all([
    context.graphContextReader.getRunContext(context.run.runId),
    context.graphContextReader.getCaseContext(context.run.caseId),
  ]);

  const refs = unique([...runContext.refs, ...caseContext.refs]);
  const summaryParts = [
    runContext.refs.length > 0 ? `Run context:\n${runContext.summary}` : null,
    caseContext.refs.length > 0 ? `Case context:\n${caseContext.summary}` : null,
  ].filter((part): part is string => Boolean(part));

  await context.eventSink.publish(
    createRunEvent({
      runId: context.run.runId,
      agentId: `agent:${context.run.runId}:${context.task.agentType}`,
      eventType: "tool_finished",
      title: "Loaded graph context.",
      payload: {
        taskId: context.task.taskId,
        capability: "graph_context_retrieval",
        runContextRefs: runContext.refs.length,
        caseContextRefs: caseContext.refs.length,
        totalRefs: refs.length,
      },
    }),
  );

  return {
    summary: summaryParts.join("\n\n"),
    refs,
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
        maxItems: 4,
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

function buildSkillGuidedPrompt(
  basePrompt: string,
  skill: Pick<SkillDefinition, "promptGuidance">,
): string {
  if (skill.promptGuidance.trim().length === 0) {
    return basePrompt;
  }

  return `${basePrompt}\n\nFollow this analysis playbook:\n${skill.promptGuidance}`;
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

function buildSkillRef(
  context: AgentExecutionContext,
  skill: Pick<SkillDefinition, "capabilityName">,
): string {
  return `skill:${context.run.runId}:${skill.capabilityName}`;
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
