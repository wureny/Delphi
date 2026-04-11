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
  PriorAlignment,
  ReportSectionRecord,
  ReportSectionStatus,
} from "./contracts.ts";
import {
  createEmptyReportSections,
  buildFinalReport,
  reportSectionTitles,
} from "./report.ts";
import type { StructuredModelProvider } from "./model-provider.ts";
import {
  buildEvidenceCandidatePatch,
  buildEvidenceRef,
  buildFindingPatch,
  buildJudgeCitationPatches,
  buildJudgeDecisionPatch,
  buildJudgeReportPatch,
  buildJudgeStableJudgmentPatch,
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
  collectDataDegradedReasons,
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
    priorAlignment: PriorAlignment;
    priorRef: string | null;
    revisionReason: string | null;
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

const graphContextInstructions = [
  "Language requirement: ALWAYS respond in English regardless of the language of the user question. All claims, impact statements, revision reasons, and report sections must be written in English.",
  "",
  "Graph context handling (MANDATORY):",
  "- If graph context is provided, you MUST address it in your findings.",
  "- For each finding, set priorAlignment to one of: consistent, revised, contradicted, new.",
  '  - "consistent": your finding agrees with a prior analysis on record.',
  '  - "revised": your finding updates or modifies a prior view, and you MUST explain why in revisionReason.',
  '  - "contradicted": your finding directly contradicts a prior view, and you MUST explain why in revisionReason.',
  '  - "new": no prior analysis exists on this point (first-time analysis).',
  "- If a prior judgment or thesis is referenced, set priorRef to the ref string from graph context.",
  "- If no graph context is provided, set all findings to priorAlignment: \"new\".",
].join("\n");

const thesisCoverageContract = [
  "Coverage requirements:",
  "- Include at least one finding on business durability or core thesis quality.",
  "- Include at least one finding on recent execution, guidance, or management signaling.",
  "- Include at least one finding on why the stock is or is not attractive over the stated time horizon.",
  "- Avoid repeating the same point in slightly different words.",
  "",
  "Prior thesis handling:",
  "- If prior thesis data exists in graph context, you MUST state whether you maintain, revise, or overturn it.",
  "- Explain what changed in the evidence or environment that justifies your current stance.",
  "",
  graphContextInstructions,
].join("\n");

const liquidityCoverageContract = [
  "Coverage requirements:",
  "- Include one finding on the current liquidity regime.",
  "- Include one finding on how rates or funding conditions affect valuation support or downside risk.",
  "- Include one finding on the practical portfolio implication for owning this stock now.",
  "- Avoid generic macro commentary that does not change the case.",
  "",
  "Prior liquidity regime handling:",
  "- If a prior liquidity regime is recorded in graph context, you MUST state whether the regime has switched or persisted.",
  "- If switched, explain the transition and its investment implication.",
  "",
  graphContextInstructions,
].join("\n");

const marketSignalCoverageContract = [
  "Coverage requirements:",
  "- Include one finding on current price behavior or trend confirmation.",
  "- Include one finding on crowding, positioning, or sentiment saturation.",
  "- Include one finding on the practical trading stance: buyable, holdable, crowded, or avoid-for-now.",
  "- Avoid pure tape description without a decision implication.",
  "",
  "Prior signal handling:",
  "- If prior market signals exist in graph context, you MUST compare current signals against the historical direction.",
  "- Note any reversals, continuations, or divergences.",
  "",
  graphContextInstructions,
].join("\n");

const judgeSectionContract = [
  "Section writing contract:",
  '- final_judgment: give one decisive stance, explain the main conflict, and state the practical action.',
  '- core_thesis: explain the business-side logic that matters most over the stated horizon.',
  '- supporting_evidence: summarize the strongest evidence in layered form, not as a raw list.',
  '- key_risks: name the specific risks that could make this decision wrong or low-payoff.',
  '- liquidity_context: explain how macro/liquidity changes support, limit, or threaten the thesis.',
  '- what_changes_the_view: give explicit triggers that would make you more bullish or more cautious.',
  '- judgment_evolution: compare this judgment against prior judgments from graph context. If prior judgments exist, describe the stance change (e.g., "shifted from bullish 75% to neutral 55%"), explain what drove the change, and note which evidence shifted. If this is the first analysis, state "First analysis for this ticker — no prior judgment on record." This section makes the longitudinal value of the system visible.',
  "Write every section like a short investment memo paragraph, not like a schema placeholder.",
].join("\n");

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
  const degradedReasons = collectDataDegradedReasons(context, ["company", "news"]);
  const evidenceRefs = evidenceCandidates.map((candidate) => buildEvidenceRef(context.run.caseId, candidate));
  const plan = await provider.generateObject<ProviderFindingPlan<ThesisObjectKey>>({
    schemaName: "delphi_thesis_findings",
    schemaDescription: "Structured thesis findings for one investment research run.",
    schema: providerFindingSchema(["thesis_core", "risk_execution"]),
    developerPrompt: buildSkillGuidedPrompt(
      "You are Delphi thesis agent. Produce 2-4 substantial findings grounded only in the supplied company and news snapshots. Each finding should capture a decisive investment point rather than a generic summary. Do not invent evidence. Use the allowed object keys only.\n\nIMPORTANT: If graph context contains prior thesis or judgment data for this ticker, you MUST explicitly address it. State whether your current thesis maintains, revises, or overturns the prior view, and explain what evidence drove any change. Set priorAlignment accordingly for each finding.",
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
      thesisCoverageContract,
    ].join("\n"),
  });

  const findings = plan.output.findings.map((finding) =>
    createFinding(context, {
      claim: finding.claim,
      impact: finding.impact,
      confidence: normalizeConfidence(finding.confidence),
      evidenceRefs: pickEvidenceRefs(evidenceRefs, finding.evidenceIndexes),
      objectRefs: finding.objectKeys.map((key) => thesisObjectRef(context, key)),
      priorAlignment: finding.priorAlignment,
      ...(finding.priorRef ? { priorRef: finding.priorRef } : {}),
      ...(finding.revisionReason ? { revisionReason: finding.revisionReason } : {}),
    }));

  return {
    ...createEmptyAgentExecutionResult(
      degradedReasons.length > 0 ? "degraded" : "done",
      plan.output.summary,
    ),
    findings,
    degradedReasons,
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
  const degradedReasons = collectDataDegradedReasons(context, ["macro"]);
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
      "You are Delphi liquidity agent. Produce 2-4 substantial findings grounded only in the supplied macro and liquidity snapshot. Each finding should state the regime implication for the investment case, not generic macro commentary. Do not invent evidence. Use the allowed object keys only.\n\nIMPORTANT: If graph context contains a prior liquidity regime, you MUST state whether the regime has persisted or switched since the last analysis. Explain the transition drivers and investment implications. Set priorAlignment accordingly.",
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
      liquidityCoverageContract,
    ].join("\n"),
  });

  const findings = plan.output.findings.map((finding) =>
    createFinding(context, {
      claim: finding.claim,
      impact: finding.impact,
      confidence: normalizeConfidence(finding.confidence),
      evidenceRefs: pickEvidenceRefs(evidenceRefs, finding.evidenceIndexes),
      objectRefs: finding.objectKeys.map((key) => liquidityObjectRef(context, key)),
      priorAlignment: finding.priorAlignment,
      ...(finding.priorRef ? { priorRef: finding.priorRef } : {}),
      ...(finding.revisionReason ? { revisionReason: finding.revisionReason } : {}),
    }));

  return {
    ...createEmptyAgentExecutionResult(
      degradedReasons.length > 0 ? "degraded" : "done",
      plan.output.summary,
    ),
    findings,
    degradedReasons,
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
  const degradedReasons = collectDataDegradedReasons(context, ["market"]);
  const evidenceRefs = evidenceCandidates.map((candidate) => buildEvidenceRef(context.run.caseId, candidate));
  const plan = await provider.generateObject<ProviderFindingPlan<MarketObjectKey>>({
    schemaName: "delphi_market_signal_findings",
    schemaDescription: "Structured market signal findings for one investment research run.",
    schema: providerFindingSchema(["market_signal_price_positioning"]),
    developerPrompt: buildSkillGuidedPrompt(
      "You are Delphi market signal agent. Produce 2-4 substantial findings grounded only in the supplied market snapshot. Focus on positioning, crowding, and practical risk posture rather than generic tape reading. Do not invent evidence. Use the allowed object key only.\n\nIMPORTANT: If graph context contains prior market signals, you MUST compare current signals against historical direction. Note any reversals, continuations, or divergences and set priorAlignment accordingly.",
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
      marketSignalCoverageContract,
    ].join("\n"),
  });

  const findings = plan.output.findings.map((finding) =>
    createFinding(context, {
      claim: finding.claim,
      impact: finding.impact,
      confidence: normalizeConfidence(finding.confidence),
      evidenceRefs: pickEvidenceRefs(evidenceRefs, finding.evidenceIndexes),
      objectRefs: finding.objectKeys.map((key) => marketObjectRef(context, key)),
      priorAlignment: finding.priorAlignment,
      ...(finding.priorRef ? { priorRef: finding.priorRef } : {}),
      ...(finding.revisionReason ? { revisionReason: finding.revisionReason } : {}),
    }));

  return {
    ...createEmptyAgentExecutionResult(
      degradedReasons.length > 0 ? "degraded" : "done",
      plan.output.summary,
    ),
    findings,
    degradedReasons,
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

  const emittedSections = new Set<FinalReportSectionKey>();
  const request = {
    schemaName: "delphi_judge_report",
    schemaDescription: "Structured decision and six fixed report sections for one run.",
    schema: providerJudgeSchema(),
    developerPrompt: buildSkillGuidedPrompt(
      "You are Delphi judge. ALWAYS respond in English regardless of the language of the user question. Use only the supplied findings to produce one decision summary and seven fixed report sections. Write memo-style sections with concrete reasoning and explicit conflicts or tradeoffs when they exist. Do not invent evidence or findings. Every section must be present.\n\nIMPORTANT: The judgment_evolution section is critical. If graph context contains prior judgments, you MUST compare your current stance against the most recent prior judgment — describe the change in stance and confidence, explain what evidence shifted, and note if upstream agents revised or contradicted prior views (check priorAlignment fields in findings). If no prior judgment exists, explicitly state this is the first analysis for this ticker.",
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
      judgeSectionContract,
    ].join("\n"),
  } as const;
  const plan = await (provider.generateObjectStream
    ? provider.generateObjectStream<ProviderJudgePlan>(request, {
        onSectionReady: async (sectionKey, content) => {
          if (!isFinalReportSectionKey(sectionKey) || emittedSections.has(sectionKey)) {
            return;
          }

          emittedSections.add(sectionKey);
          await context.eventSink.publish(
            createRunEvent({
              runId: context.run.runId,
              agentId: `agent:${context.run.runId}:judge`,
              eventType: "report_section_ready",
              title: `Report section ready: ${reportSectionTitles[sectionKey]}.`,
              payload: {
                sectionId: `section:${context.run.runId}:${sectionKey}`,
                runId: context.run.runId,
                sectionKey,
                title: reportSectionTitles[sectionKey],
                content,
                status: "ready",
              },
            }),
          );
        },
      })
    : provider.generateObject<ProviderJudgePlan>(request));

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
    if (emittedSections.has(section.sectionKey)) {
      continue;
    }

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
      buildJudgeStableJudgmentPatch(
        context.run,
        context.task.taskId,
        decision,
        finalReport,
        reportSections,
      ),
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

  const contradictionClaim = buildContradictionClaim(context);
  const [runContext, caseContext, priorJudgments, contradictions, thesisEvolution] = await Promise.all([
    context.graphContextReader.getRunContext(context.run.runId),
    context.graphContextReader.getCaseContext(context.run.caseId),
    context.graphContextReader.getPriorJudgments
      ? context.graphContextReader.getPriorJudgments(context.run.caseId)
      : Promise.resolve(null),
    context.graphContextReader.getContradictions
      ? context.graphContextReader.getContradictions(
          context.run.caseId,
          contradictionClaim,
        )
      : Promise.resolve(null),
    context.graphContextReader.getThesisEvolution
      ? context.graphContextReader.getThesisEvolution(context.run.caseId)
      : Promise.resolve(null),
  ]);

  const refs = unique([
    ...runContext.refs,
    ...caseContext.refs,
    ...(priorJudgments?.refs ?? []),
    ...(contradictions?.refs ?? []),
    ...(thesisEvolution?.refs ?? []),
  ]);
  const summaryParts = [
    runContext.refs.length > 0 ? `Run context:\n${runContext.summary}` : null,
    caseContext.refs.length > 0 ? `Case context:\n${caseContext.summary}` : null,
    priorJudgments && priorJudgments.refs.length > 0
      ? `Prior judgments:\n${priorJudgments.summary}`
      : null,
    thesisEvolution && thesisEvolution.refs.length > 0
      ? `Thesis evolution:\n${thesisEvolution.summary}`
      : null,
    contradictions && contradictions.refs.length > 0
      ? `Contradictions:\n${contradictions.summary}`
      : null,
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
        priorJudgmentRefs: priorJudgments?.refs.length ?? 0,
        thesisEvolutionRefs: thesisEvolution?.refs.length ?? 0,
        contradictionRefs: contradictions?.refs.length ?? 0,
        totalRefs: refs.length,
      },
    }),
  );

  return {
    summary: summaryParts.join("\n\n"),
    refs,
  };
}

function buildContradictionClaim(context: AgentExecutionContext): string {
  const upstreamClaims = context.upstreamFindings
    .slice(0, 3)
    .map((finding) => finding.claim.trim())
    .filter((claim) => claim.length > 0);

  if (upstreamClaims.length > 0) {
    return upstreamClaims.join(" | ");
  }

  return context.query.userQuestion;
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
          required: ["claim", "impact", "confidence", "evidenceIndexes", "objectKeys", "priorAlignment", "priorRef", "revisionReason"],
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
            priorAlignment: {
              type: "string",
              enum: ["consistent", "revised", "contradicted", "new"],
            },
            priorRef: {
              type: ["string", "null"],
            },
            revisionReason: {
              type: ["string", "null"],
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
          "judgment_evolution",
        ],
        properties: {
          final_judgment: sectionSchema,
          core_thesis: sectionSchema,
          supporting_evidence: sectionSchema,
          key_risks: sectionSchema,
          liquidity_context: sectionSchema,
          what_changes_the_view: sectionSchema,
          judgment_evolution: sectionSchema,
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

function isFinalReportSectionKey(value: string): value is FinalReportSectionKey {
  return Object.hasOwn(reportSectionTitles, value);
}
