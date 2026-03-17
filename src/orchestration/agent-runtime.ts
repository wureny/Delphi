import type { GraphPatch } from "../research-graph/graph-patch.ts";
import type { AgentType } from "../research-graph/runtime.ts";
import type {
  AgentTask,
  DecisionRecord,
  FinalReport,
  FindingRecord,
  ReportSectionRecord,
  RunRecord,
  TaskStatus,
} from "./contracts.ts";
import type { RuntimeEventSink } from "./events.ts";
import type { GraphPatchGateway } from "./graph-gateway.ts";
import type { SkillRegistry, ToolRegistry } from "./registry.ts";

export interface CompanySnapshot {
  ticker: string;
  observedAt: string;
  companyName: string;
  businessSummary: string;
  keyPoints: string[];
}

export interface NewsItemSnapshot {
  id: string;
  headline: string;
  summary: string;
  publishedAt: string;
  url?: string;
}

export interface NewsSnapshot {
  ticker: string;
  observedAt: string;
  items: NewsItemSnapshot[];
}

export interface MarketSnapshot {
  ticker: string;
  observedAt: string;
  latestPrice?: number;
  priceChangePct?: number;
  volume?: number;
  signalSummaries: string[];
}

export interface MacroLiquiditySnapshot {
  observedAt: string;
  regimeLabel: string;
  ratesSummary: string;
  liquiditySignals: string[];
}

export interface RuntimeDataAdapter {
  getCompanySnapshot(ticker: string, runId: string): Promise<CompanySnapshot>;
  getNewsSnapshot(ticker: string, runId: string): Promise<NewsSnapshot>;
  getMarketSnapshot(ticker: string, runId: string): Promise<MarketSnapshot>;
  getMacroLiquiditySnapshot(runId: string): Promise<MacroLiquiditySnapshot>;
}

export interface GraphContextSnapshot {
  summary: string;
  refs: string[];
}

export interface GraphContextReader {
  getRunContext(runId: string): Promise<GraphContextSnapshot>;
  getCaseContext(caseId: string): Promise<GraphContextSnapshot>;
}

export interface AgentExecutionContext {
  run: RunRecord;
  task: AgentTask;
  query: RunRecord["query"];
  toolRegistry: ToolRegistry;
  skillRegistry: SkillRegistry;
  graphGateway: GraphPatchGateway;
  graphContextReader: GraphContextReader | null;
  dataAdapter: RuntimeDataAdapter | null;
  eventSink: RuntimeEventSink;
  upstreamFindings: FindingRecord[];
  knownTasks: AgentTask[];
}

export interface AgentExecutionResult {
  taskStatus: TaskStatus;
  summary: string;
  findings: FindingRecord[];
  graphPatches: GraphPatch[];
  openQuestions: string[];
  degradedReasons: string[];
  decision: DecisionRecord | null;
  reportSections: ReportSectionRecord[];
  finalReport: FinalReport | null;
}

export interface AgentExecutor {
  readonly agentType: AgentType;
  execute(context: AgentExecutionContext): Promise<AgentExecutionResult>;
}

export type AgentExecutorMap = Record<AgentType, AgentExecutor>;

export function createEmptyAgentExecutionResult(
  taskStatus: TaskStatus = "done",
  summary: string = "",
): AgentExecutionResult {
  return {
    taskStatus,
    summary,
    findings: [],
    graphPatches: [],
    openQuestions: [],
    degradedReasons: [],
    decision: null,
    reportSections: [],
    finalReport: null,
  };
}
