export const agentKeys = [
  "thesis",
  "liquidity",
  "market_signal",
  "judge",
] as const;

export type AgentKey = (typeof agentKeys)[number];

export const reportSectionKeys = [
  "final_judgment",
  "core_thesis",
  "supporting_evidence",
  "key_risks",
  "liquidity_context",
  "what_changes_the_view",
] as const;

export type ReportSectionKey = (typeof reportSectionKeys)[number];

export type ReportSectionStatus = "ready" | "empty" | "degraded";
export type RunStatus =
  | "created"
  | "planned"
  | "agent_running"
  | "synthesizing"
  | "completed"
  | "failed"
  | "degraded";
export type RunEventType =
  | "run_created"
  | "planner_completed"
  | "task_assigned"
  | "tool_started"
  | "tool_finished"
  | "finding_created"
  | "patch_accepted"
  | "patch_rejected"
  | "judge_synthesis_started"
  | "report_section_ready"
  | "agent_completed"
  | "agent_failed"
  | "degraded_mode_entered"
  | "report_ready";

export interface ResearchQuery {
  queryId: string;
  userQuestion: string;
  ticker: string;
  timeHorizon: string;
  caseType: string;
  createdAt: string;
}

export interface RunRecord {
  runId: string;
  caseId: string;
  query: ResearchQuery;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  degradedReasons: string[];
}

export interface ReportSectionRecord {
  sectionId: string;
  runId: string;
  sectionKey: ReportSectionKey;
  title: string;
  content: string;
  citationFindingRefs: string[];
  citationEvidenceRefs: string[];
  citationObjectRefs: string[];
  status: ReportSectionStatus;
}

export interface FinalReport {
  reportId: string;
  runId: string;
  caseId: string;
  generatedBy: AgentKey;
  generatedAt: string;
  finalJudgment: string;
  coreThesis: string;
  supportingEvidence: string;
  keyRisks: string;
  liquidityContext: string;
  whatChangesTheView: string;
  sectionCitations: Record<ReportSectionKey, string[]>;
  updatedObjectRefs: string[];
  sectionObjectRefs: Record<ReportSectionKey, string[]>;
  updatedObjectTypes: string[];
}

export interface RunEvent {
  eventId: string;
  runId: string;
  agentId: string;
  eventType: RunEventType;
  title: string;
  payload: Record<string, unknown>;
  ts: string;
}

export type TerminalLineKind =
  | "plan"
  | "tool"
  | "finding"
  | "graph"
  | "synthesis"
  | "status"
  | "warning"
  | "error";

export type TerminalLineTone =
  | "neutral"
  | "running"
  | "success"
  | "warning"
  | "danger";

export interface TerminalLine {
  lineId: string;
  runId: string;
  agentType: AgentKey;
  eventId: string;
  prefix: string;
  text: string;
  kind: TerminalLineKind;
  tone: TerminalLineTone;
  ts: string;
}

export interface TerminalStreamChunk {
  chunkId: string;
  runId: string;
  agentType: AgentKey;
  line: TerminalLine;
}

export interface TerminalSnapshot {
  runId: string;
  terminals: Record<AgentKey, TerminalLine[]>;
}

export type ResearchMapTone =
  | "primary"
  | "supporting"
  | "signal"
  | "caution"
  | "watch";

export type ResearchMapStatus = "ready" | "partial" | "waiting";

export interface ResearchMapCard {
  cardId: string;
  label: string;
  tone: ResearchMapTone;
  status: ResearchMapStatus;
  summary: string;
  findingRefs: string[];
  evidenceRefs: string[];
  objectRefs: string[];
}

export interface ResearchMapSnapshot {
  runId: string;
  caseId: string;
  status: RunStatus;
  headline: string;
  summary: string;
  updatedAt: string;
  cards: ResearchMapCard[];
  evidenceTrail: string[];
}

export type GraphSnapshotNodeKind =
  | "case"
  | "section"
  | "finding"
  | "object"
  | "evidence";

export interface GraphSnapshotNode {
  nodeId: string;
  label: string;
  kind: GraphSnapshotNodeKind;
  summary: string;
  emphasis: "primary" | "supporting" | "caution" | "neutral";
}

export interface GraphSnapshotEdge {
  edgeId: string;
  from: string;
  to: string;
  label: string;
}

export interface GraphSnapshot {
  runId: string;
  caseId: string;
  status: RunStatus;
  headline: string;
  summary: string;
  updatedAt: string;
  nodes: GraphSnapshotNode[];
  edges: GraphSnapshotEdge[];
}

export interface RecordedRunFixture {
  meta: {
    source: string;
    generatedAt: string;
    notes: string;
  };
  run: RunRecord;
  reportSections: ReportSectionRecord[];
  finalReport: FinalReport | null;
  events: RunEvent[];
  terminalSnapshot?: TerminalSnapshot;
  terminalChunks?: TerminalStreamChunk[];
}

export const reportSectionTitles: Record<ReportSectionKey, string> = {
  final_judgment: "Final Judgment",
  core_thesis: "Core Thesis",
  supporting_evidence: "Supporting Evidence",
  key_risks: "Key Risks",
  liquidity_context: "Liquidity Context",
  what_changes_the_view: "What Changes The View",
};
