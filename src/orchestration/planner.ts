import type { AgentTask, RunRecord } from "./contracts.ts";

export interface PlannerOutput {
  tasks: AgentTask[];
  summary: string;
}

export interface Planner {
  plan(run: RunRecord): Promise<PlannerOutput>;
}

export class DefaultPlanner implements Planner {
  async plan(run: RunRecord): Promise<PlannerOutput> {
    const queryRef = run.query.queryId;
    const thesisTaskId = buildTaskId(run.runId, "thesis");
    const liquidityTaskId = buildTaskId(run.runId, "liquidity");
    const marketSignalTaskId = buildTaskId(run.runId, "market_signal");
    const judgeTaskId = buildTaskId(run.runId, "judge");

    return {
      summary: "Created the fixed v0 four-task research plan.",
      tasks: [
        {
          taskId: thesisTaskId,
          runId: run.runId,
          agentType: "thesis",
          goal: `Build the core thesis for ${run.query.ticker} over the ${run.query.timeHorizon} horizon.`,
          inputRefs: [queryRef],
          status: "created",
          priority: "high",
          dependsOnTaskIds: [],
        },
        {
          taskId: liquidityTaskId,
          runId: run.runId,
          agentType: "liquidity",
          goal: `Explain the macro and liquidity context relevant to ${run.query.ticker}.`,
          inputRefs: [queryRef],
          status: "created",
          priority: "high",
          dependsOnTaskIds: [],
        },
        {
          taskId: marketSignalTaskId,
          runId: run.runId,
          agentType: "market_signal",
          goal: `Assess price action, positioning, and signal saturation for ${run.query.ticker}.`,
          inputRefs: [queryRef],
          status: "created",
          priority: "high",
          dependsOnTaskIds: [],
        },
        {
          taskId: judgeTaskId,
          runId: run.runId,
          agentType: "judge",
          goal: `Synthesize upstream findings into one decision and six fixed report sections for ${run.query.ticker}.`,
          inputRefs: [thesisTaskId, liquidityTaskId, marketSignalTaskId],
          status: "created",
          priority: "medium",
          dependsOnTaskIds: [thesisTaskId, liquidityTaskId, marketSignalTaskId],
        },
      ],
    };
  }
}

export function createDefaultPlanner(): Planner {
  return new DefaultPlanner();
}

function buildTaskId(runId: string, suffix: string): string {
  return `task:${runId}:${suffix}`;
}
