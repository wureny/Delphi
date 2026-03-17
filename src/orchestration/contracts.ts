import type { AgentType } from "../research-graph/runtime.ts";

export const caseTypes = [
  "buy_decision",
  "risk_reward_check",
  "priced_in_check",
  "event_driven_view",
] as const;

export type CaseType = (typeof caseTypes)[number];

export interface ResearchQuery {
  queryId: string;
  userQuestion: string;
  ticker: string;
  timeHorizon: string;
  caseType: CaseType;
  createdAt: string;
}

export const runStatuses = [
  "created",
  "planned",
  "agent_running",
  "synthesizing",
  "completed",
  "failed",
  "degraded",
] as const;

export type RunStatus = (typeof runStatuses)[number];

export interface RunRecord {
  runId: string;
  caseId: string;
  query: ResearchQuery;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  degradedReasons: string[];
}

export const taskStatuses = [
  "created",
  "running",
  "waiting",
  "done",
  "failed",
  "degraded",
] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export const taskPriorities = ["high", "medium", "low"] as const;

export type TaskPriority = (typeof taskPriorities)[number];

export interface AgentTask {
  taskId: string;
  runId: string;
  agentType: AgentType;
  goal: string;
  inputRefs: string[];
  status: TaskStatus;
  priority: TaskPriority;
  dependsOnTaskIds: string[];
}

export const findingImpacts = [
  "positive",
  "neutral",
  "negative",
  "mixed",
] as const;

export type FindingImpact = (typeof findingImpacts)[number];

export interface FindingRecord {
  findingId: string;
  runId: string;
  taskId: string;
  agentType: AgentType;
  claim: string;
  evidenceRefs: string[];
  objectRefs: string[];
  confidence: number;
  impact: FindingImpact;
  timestamp: string;
}

export interface DecisionRecord {
  decisionId: string;
  runId: string;
  decisionType: string;
  summary: string;
  confidenceBand: string;
  basisFindingRefs: string[];
}

export const finalReportSectionKeys = [
  "final_judgment",
  "core_thesis",
  "supporting_evidence",
  "key_risks",
  "liquidity_context",
  "what_changes_the_view",
] as const;

export type FinalReportSectionKey = (typeof finalReportSectionKeys)[number];

export const reportSectionStatuses = ["ready", "empty", "degraded"] as const;

export type ReportSectionStatus = (typeof reportSectionStatuses)[number];

export interface ReportSectionRecord {
  sectionId: string;
  runId: string;
  sectionKey: FinalReportSectionKey;
  title: string;
  content: string;
  citationFindingRefs: string[];
  citationEvidenceRefs: string[];
  status: ReportSectionStatus;
}

export type SectionCitationMap = {
  [K in FinalReportSectionKey]: string[];
};

export interface FinalReport {
  reportId: string;
  runId: string;
  caseId: string;
  generatedBy: AgentType;
  generatedAt: string;
  finalJudgment: string;
  coreThesis: string;
  supportingEvidence: string;
  keyRisks: string;
  liquidityContext: string;
  whatChangesTheView: string;
  sectionCitations: SectionCitationMap;
}

const caseTypeSet = new Set<string>(caseTypes);
const runStatusSet = new Set<string>(runStatuses);
const taskStatusSet = new Set<string>(taskStatuses);

export function isCaseType(value: string): value is CaseType {
  return caseTypeSet.has(value);
}

export function isRunStatus(value: string): value is RunStatus {
  return runStatusSet.has(value);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return taskStatusSet.has(value);
}
