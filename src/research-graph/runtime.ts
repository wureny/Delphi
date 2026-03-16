import type { OntologyNodeType } from "./ontology.ts";

export const agentTypes = [
  "thesis",
  "liquidity",
  "market_signal",
  "judge",
] as const;

export type AgentType = (typeof agentTypes)[number];

export const runtimeNodeTypes = [
  "Query",
  "Task",
  "Agent",
  "Skill",
  "ToolCall",
  "ContextItem",
  "Finding",
  "Decision",
  "ReportSection",
] as const;

export type RuntimeNodeType = (typeof runtimeNodeTypes)[number];

export const runtimeEdgeTypes = [
  "DECOMPOSES_TO",
  "ASSIGNED_TO",
  "USES_SKILL",
  "RETRIEVES",
  "SUPPORTS",
  "CONTRADICTS",
  "UPDATES",
  "CONTRIBUTES_TO",
  "REVISES",
  "CITES",
] as const;

export type RuntimeEdgeType = (typeof runtimeEdgeTypes)[number];

export interface QueryNode {
  nodeType: "Query";
  queryId: string;
  runId: string;
  ticker: string;
  timeHorizon: string;
  caseType: string;
  createdAt: string;
}

export interface TaskNode {
  nodeType: "Task";
  taskId: string;
  runId: string;
  agentType: AgentType;
  goal: string;
  inputRefs: string[];
  status: string;
  priority: string;
}

export interface AgentNode {
  nodeType: "Agent";
  agentId: string;
  runId: string;
  agentType: AgentType;
}

export interface SkillNode {
  nodeType: "Skill";
  skillId: string;
  runId: string;
  capabilityName: string;
}

export interface ToolCallNode {
  nodeType: "ToolCall";
  toolCallId: string;
  runId: string;
  toolName: string;
  status: string;
  startedAt: string;
}

export interface ContextItemNode {
  nodeType: "ContextItem";
  contextItemId: string;
  runId: string;
  refType: string;
  refId: string;
  sourceLayer: "snapshot" | "ontology" | "runtime";
}

export interface FindingNode {
  nodeType: "Finding";
  findingId: string;
  runId: string;
  taskId: string;
  agentType: AgentType;
  claim: string;
  evidenceRefs: string[];
  objectRefs: string[];
  confidence: number;
  impact: "positive" | "neutral" | "negative" | "mixed";
  timestamp: string;
}

export interface DecisionNode {
  nodeType: "Decision";
  decisionId: string;
  runId: string;
  decisionType: string;
  summary: string;
  confidenceBand: string;
}

export interface ReportSectionNode {
  nodeType: "ReportSection";
  sectionId: string;
  runId: string;
  sectionKey: string;
  title: string;
}

export type RuntimeNode =
  | QueryNode
  | TaskNode
  | AgentNode
  | SkillNode
  | ToolCallNode
  | ContextItemNode
  | FindingNode
  | DecisionNode
  | ReportSectionNode;

export type GraphNodeType = OntologyNodeType | RuntimeNodeType;

export interface RuntimeRelationshipRule {
  type: RuntimeEdgeType;
  from: GraphNodeType;
  to: GraphNodeType;
}

export const runtimeRelationshipRegistry: readonly RuntimeRelationshipRule[] = [
  { type: "DECOMPOSES_TO", from: "Query", to: "Task" },
  { type: "ASSIGNED_TO", from: "Task", to: "Agent" },
  { type: "USES_SKILL", from: "Task", to: "Skill" },
  { type: "RETRIEVES", from: "Task", to: "ContextItem" },
  { type: "RETRIEVES", from: "Skill", to: "ContextItem" },
  { type: "SUPPORTS", from: "Finding", to: "Decision" },
  { type: "CONTRADICTS", from: "Finding", to: "Finding" },
  { type: "UPDATES", from: "Decision", to: "Judgment" },
  { type: "UPDATES", from: "Finding", to: "Thesis" },
  { type: "UPDATES", from: "Finding", to: "Risk" },
  { type: "UPDATES", from: "Finding", to: "LiquidityFactor" },
  { type: "UPDATES", from: "Finding", to: "LiquidityRegime" },
  { type: "UPDATES", from: "Finding", to: "MarketSignal" },
  { type: "CONTRIBUTES_TO", from: "Decision", to: "ReportSection" },
  { type: "CITES", from: "ReportSection", to: "Finding" },
  { type: "CITES", from: "ReportSection", to: "Evidence" },
] as const;

const agentTypeSet = new Set<string>(agentTypes);
const runtimeNodeTypeSet = new Set<string>(runtimeNodeTypes);
const runtimeEdgeTypeSet = new Set<string>(runtimeEdgeTypes);

export function isAgentType(value: string): value is AgentType {
  return agentTypeSet.has(value);
}

export function isRuntimeNodeType(value: string): value is RuntimeNodeType {
  return runtimeNodeTypeSet.has(value);
}

export function isRuntimeEdgeType(value: string): value is RuntimeEdgeType {
  return runtimeEdgeTypeSet.has(value);
}
