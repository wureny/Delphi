import type { GraphPatch } from "../research-graph/graph-patch.ts";
import type { EvidenceCandidate } from "../data-layer/contracts.ts";
import type { AgentType } from "../research-graph/runtime.ts";
import type {
  AgentTask,
  DecisionRecord,
  FindingRecord,
  ReportSectionRecord,
  RunRecord,
} from "./contracts.ts";

export function buildRuntimeScaffoldPatch(
  run: RunRecord,
  tasks: readonly AgentTask[],
): GraphPatch {
  const operations: GraphPatch["operations"] = [
    {
      opId: `op:${run.runId}:query`,
      type: "create_node",
      nodeRef: run.query.queryId,
      nodeType: "Query",
      properties: {
        queryId: run.query.queryId,
        runId: run.runId,
        ticker: run.query.ticker,
        timeHorizon: run.query.timeHorizon,
        caseType: run.query.caseType,
        createdAt: run.query.createdAt,
      },
    },
  ];

  for (const task of tasks) {
    const agentRef = buildAgentRef(run.runId, task.agentType);

    operations.push(
      {
        opId: `op:${task.taskId}:task`,
        type: "create_node",
        nodeRef: task.taskId,
        nodeType: "Task",
        properties: {
          taskId: task.taskId,
          runId: task.runId,
          agentType: task.agentType,
          goal: task.goal,
          inputRefs: task.inputRefs,
          status: task.status,
          priority: task.priority,
        },
      },
      {
        opId: `op:${agentRef}:agent`,
        type: "create_node",
        nodeRef: agentRef,
        nodeType: "Agent",
        properties: {
          agentId: agentRef,
          runId: run.runId,
          agentType: task.agentType,
        },
      },
      {
        opId: `op:${task.taskId}:decomposes`,
        type: "create_edge",
        edgeType: "DECOMPOSES_TO",
        fromRef: run.query.queryId,
        toRef: task.taskId,
        properties: {},
      },
      {
        opId: `op:${task.taskId}:assigned`,
        type: "create_edge",
        edgeType: "ASSIGNED_TO",
        fromRef: task.taskId,
        toRef: agentRef,
        properties: {},
      },
    );
  }

  return {
    patchId: `patch:${run.runId}:runtime-scaffold`,
    runId: run.runId,
    agentType: "judge",
    targetScope: "runtime",
    basisRefs: [],
    operations,
  };
}

export function buildFindingPatch(
  run: RunRecord,
  agentType: AgentType,
  taskId: string,
  skillRef: string,
  findings: readonly FindingRecord[],
): GraphPatch {
  const operations: GraphPatch["operations"] = [
    {
      opId: `op:${skillRef}:skill`,
      type: "create_node",
      nodeRef: skillRef,
      nodeType: "Skill",
      properties: {
        skillId: skillRef,
        runId: run.runId,
        capabilityName: `${agentType}_analysis`,
      },
    },
    {
      opId: `op:${taskId}:skill-link`,
      type: "create_edge",
      edgeType: "USES_SKILL",
      fromRef: taskId,
      toRef: skillRef,
      properties: {},
    },
  ];

  for (const finding of findings) {
    operations.push({
      opId: `op:${finding.findingId}:finding`,
      type: "create_node",
      nodeRef: finding.findingId,
      nodeType: "Finding",
      properties: {
        findingId: finding.findingId,
        runId: finding.runId,
        taskId: finding.taskId,
        agentType: finding.agentType,
        claim: finding.claim,
        evidenceRefs: finding.evidenceRefs,
        objectRefs: finding.objectRefs,
        confidence: finding.confidence,
        impact: finding.impact,
        timestamp: finding.timestamp,
      },
    });

    const uniqueObjectRefs = [...new Set(finding.objectRefs)];

    for (const objectRef of uniqueObjectRefs) {
      const targetNodeType = inferUpdatableStableNodeType(objectRef);

      if (!targetNodeType) {
        continue;
      }

      operations.push({
        opId: `op:${finding.findingId}:${objectRef}:updates`,
        type: "create_edge",
        edgeType: "UPDATES",
        fromRef: finding.findingId,
        toRef: objectRef,
        properties: {
          targetNodeType,
        },
      });
    }
  }

  return {
    patchId: `patch:${run.runId}:${taskId}:findings`,
    runId: run.runId,
    agentType,
    targetScope: "runtime",
    basisRefs: findings.map((finding) => finding.findingId),
    operations,
  };
}

export function buildEvidenceRef(
  caseId: string,
  candidate: Pick<EvidenceCandidate, "candidateId">,
): string {
  return `evidence:${caseId}:${candidate.candidateId}`;
}

export function buildEvidenceCandidatePatch(
  run: RunRecord,
  agentType: AgentType,
  taskId: string,
  candidates: readonly EvidenceCandidate[],
): GraphPatch {
  const operations: GraphPatch["operations"] = candidates.map((candidate, index) => {
    const evidenceRef = buildEvidenceRef(run.caseId, candidate);

    return {
      opId: `op:${taskId}:evidence:${index + 1}`,
      type: "merge_node",
      resolvedRef: evidenceRef,
      nodeType: "Evidence",
      matchKeys: {
        caseId: run.caseId,
        provider: candidate.provider,
        sourceType: candidate.sourceType,
        sourceRef: candidate.sourceRef,
        observedAt: candidate.observedAt,
      },
      properties: {
        evidenceId: evidenceRef,
        caseId: run.caseId,
        provider: candidate.provider,
        sourceType: candidate.sourceType,
        sourceRef: candidate.sourceRef,
        observedAt: candidate.observedAt,
        summary: candidate.summary,
      },
    };
  });

  return {
    patchId: `patch:${run.runId}:${taskId}:evidence`,
    runId: run.runId,
    agentType,
    targetScope: "case",
    basisRefs: [taskId],
    operations,
  };
}

export function buildJudgeDecisionPatch(
  run: RunRecord,
  taskId: string,
  decision: DecisionRecord,
): GraphPatch {
  const skillRef = `skill:${run.runId}:judge_synthesis`;
  const operations: GraphPatch["operations"] = [
    {
      opId: `op:${skillRef}:skill`,
      type: "create_node",
      nodeRef: skillRef,
      nodeType: "Skill",
      properties: {
        skillId: skillRef,
        runId: run.runId,
        capabilityName: "judge_synthesis",
      },
    },
    {
      opId: `op:${taskId}:skill-link`,
      type: "create_edge",
      edgeType: "USES_SKILL",
      fromRef: taskId,
      toRef: skillRef,
      properties: {},
    },
    {
      opId: `op:${decision.decisionId}:decision`,
      type: "create_node",
      nodeRef: decision.decisionId,
      nodeType: "Decision",
      properties: {
        decisionId: decision.decisionId,
        runId: decision.runId,
        decisionType: decision.decisionType,
        summary: decision.summary,
        confidenceBand: decision.confidenceBand,
      },
    },
  ];

  for (const findingRef of decision.basisFindingRefs) {
    operations.push({
      opId: `op:${findingRef}:${decision.decisionId}:supports`,
      type: "create_edge",
      edgeType: "SUPPORTS",
      fromRef: findingRef,
      toRef: decision.decisionId,
      properties: {},
    });
  }

  return {
    patchId: `patch:${run.runId}:${taskId}:judge-decision`,
    runId: run.runId,
    agentType: "judge",
    targetScope: "runtime",
    basisRefs: decision.basisFindingRefs,
    operations,
  };
}

export function buildJudgeReportPatch(
  run: RunRecord,
  taskId: string,
  decision: DecisionRecord,
  sections: readonly ReportSectionRecord[],
): GraphPatch {
  const operations: GraphPatch["operations"] = [];

  for (const section of sections) {
    operations.push(
      {
        opId: `op:${section.sectionId}:section`,
        type: "create_node",
        nodeRef: section.sectionId,
        nodeType: "ReportSection",
        properties: {
          sectionId: section.sectionId,
          runId: section.runId,
          sectionKey: section.sectionKey,
          title: section.title,
          content: section.content,
          status: section.status,
        },
      },
      {
        opId: `op:${decision.decisionId}:${section.sectionId}:contributes`,
        type: "create_edge",
        edgeType: "CONTRIBUTES_TO",
        fromRef: decision.decisionId,
        toRef: section.sectionId,
        properties: {},
      },
    );
  }

  return {
    patchId: `patch:${run.runId}:${taskId}:judge-report`,
    runId: run.runId,
    agentType: "judge",
    targetScope: "runtime",
    basisRefs: decision.basisFindingRefs,
    operations,
  };
}

export function buildJudgeCitationPatches(
  run: RunRecord,
  taskId: string,
  decision: DecisionRecord,
  sections: readonly ReportSectionRecord[],
): GraphPatch[] {
  const operations: GraphPatch["operations"] = [];

  for (const section of sections) {
    for (const findingRef of section.citationFindingRefs) {
      operations.push({
        opId: `op:${section.sectionId}:${findingRef}:cites`,
        type: "create_edge",
        edgeType: "CITES",
        fromRef: section.sectionId,
        toRef: findingRef,
        properties: {},
      });
    }

    for (const evidenceRef of section.citationEvidenceRefs) {
      operations.push({
        opId: `op:${section.sectionId}:${evidenceRef}:cites-evidence`,
        type: "create_edge",
        edgeType: "CITES",
        fromRef: section.sectionId,
        toRef: evidenceRef,
        properties: {},
      });
    }
  }

  return chunkOperations(operations, 18).map((chunk, index) => ({
    patchId: `patch:${run.runId}:${taskId}:judge-citations:${index + 1}`,
    runId: run.runId,
    agentType: "judge",
    targetScope: "runtime",
    basisRefs: decision.basisFindingRefs,
    operations: chunk,
  }));
}

function buildAgentRef(runId: string, agentType: AgentType): string {
  return `agent:${runId}:${agentType}`;
}

function inferUpdatableStableNodeType(
  ref: string,
): "Thesis" | "Risk" | "LiquidityFactor" | "LiquidityRegime" | "MarketSignal" | null {
  if (ref.startsWith("thesis:")) {
    return "Thesis";
  }

  if (ref.startsWith("risk:")) {
    return "Risk";
  }

  if (ref.startsWith("liquidityfactor:")) {
    return "LiquidityFactor";
  }

  if (ref.startsWith("liquidityregime:")) {
    return "LiquidityRegime";
  }

  if (ref.startsWith("marketsignal:")) {
    return "MarketSignal";
  }

  return null;
}

function chunkOperations(
  operations: GraphPatch["operations"],
  chunkSize: number,
): GraphPatch["operations"][] {
  const chunks: GraphPatch["operations"][] = [];

  for (let index = 0; index < operations.length; index += chunkSize) {
    chunks.push(operations.slice(index, index + chunkSize));
  }

  return chunks;
}
