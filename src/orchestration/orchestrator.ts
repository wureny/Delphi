import type { GraphWriter } from "../research-graph/graph-writer.ts";
import type {
  AgentTask,
  DecisionRecord,
  FinalReport,
  FindingRecord,
  ReportSectionRecord,
  RunRecord,
} from "./contracts.ts";
import { buildFinalReport, normalizeReportSections } from "./report.ts";
import { createRunEvent, type RuntimeEventSink } from "./events.ts";
import { GraphPatchGateway } from "./graph-gateway.ts";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  AgentExecutorMap,
  GraphContextReader,
  RuntimeDataAdapter,
} from "./agent-runtime.ts";
import {
  createDefaultSkillRegistry,
  createDefaultToolRegistry,
  type SkillRegistry,
  type ToolRegistry,
} from "./registry.ts";
import { createDefaultPlanner, type Planner } from "./planner.ts";
import { buildRuntimeScaffoldPatch } from "./runtime-patches.ts";
import { RunManager } from "./run-manager.ts";

const runtimeAgentId = "runtime";

export interface RuntimeOrchestratorOptions {
  graphWriter: GraphWriter;
  executors: AgentExecutorMap;
  runManager?: RunManager;
  planner?: Planner;
  eventSink?: RuntimeEventSink;
  toolRegistry?: ToolRegistry;
  skillRegistry?: SkillRegistry;
  dataAdapter?: RuntimeDataAdapter | null;
  graphContextReader?: GraphContextReader | null;
}

export interface OrchestrationResult {
  run: RunRecord;
  tasks: AgentTask[];
  findings: FindingRecord[];
  decision: DecisionRecord | null;
  reportSections: ReportSectionRecord[];
  finalReport: FinalReport | null;
}

export class RuntimeOrchestrator {
  private readonly runManager: RunManager;
  private readonly planner: Planner;
  private readonly eventSink: RuntimeEventSink;
  private readonly toolRegistry: ToolRegistry;
  private readonly skillRegistry: SkillRegistry;
  private readonly dataAdapter: RuntimeDataAdapter | null;
  private readonly graphContextReader: GraphContextReader | null;
  private readonly graphWriter: GraphWriter;
  private readonly executors: AgentExecutorMap;

  constructor(options: RuntimeOrchestratorOptions) {
    this.runManager = options.runManager ?? new RunManager();
    this.planner = options.planner ?? createDefaultPlanner();
    this.eventSink = options.eventSink ?? { publish: async () => Promise.resolve() };
    this.toolRegistry = options.toolRegistry ?? createDefaultToolRegistry();
    this.skillRegistry = options.skillRegistry ?? createDefaultSkillRegistry();
    this.dataAdapter = options.dataAdapter ?? null;
    this.graphContextReader = options.graphContextReader ?? null;
    this.graphWriter = options.graphWriter;
    this.executors = options.executors;
  }

  async run(query: RunRecord["query"]): Promise<OrchestrationResult> {
    let run = this.runManager.createRun(query);
    const graphGateway = new GraphPatchGateway({
      runId: run.runId,
      caseId: run.caseId,
      writer: this.graphWriter,
    });

    await this.publishRuntimeEvent(run.runId, "run_created", "Run created.", {
      queryId: query.queryId,
      caseId: run.caseId,
      ticker: query.ticker,
    });

    const plannerOutput = await this.planner.plan(run);
    run = this.runManager.transitionRun(run.runId, "planned");

    await this.publishRuntimeEvent(run.runId, "planner_completed", "Planner completed.", {
      summary: plannerOutput.summary,
      taskCount: plannerOutput.tasks.length,
    });

    for (const task of plannerOutput.tasks) {
      await this.publishRuntimeEvent(run.runId, "task_assigned", `Assigned ${task.agentType} task.`, {
        taskId: task.taskId,
        agentType: task.agentType,
        goal: task.goal,
      }, buildAgentId(run.runId, task.agentType));
    }

    const scaffoldPatch = buildRuntimeScaffoldPatch(run, plannerOutput.tasks);
    const scaffoldSubmission = await graphGateway.submit(scaffoldPatch);
    await this.publishRuntimeEvent(
      run.runId,
      scaffoldSubmission.runEventType,
      "Submitted runtime scaffold patch.",
      {
        patchId: scaffoldSubmission.patchId,
        status: scaffoldSubmission.status,
        reason:
          scaffoldSubmission.status === "rejected"
            ? scaffoldSubmission.reason
            : "accepted",
      },
    );

    run = this.runManager.transitionRun(run.runId, "agent_running");

    const findings: FindingRecord[] = [];
    const nonJudgeTasks = plannerOutput.tasks.filter((task) => task.agentType !== "judge");
    const judgeTask = plannerOutput.tasks.find((task) => task.agentType === "judge");
    let decision: DecisionRecord | null = null;
    let reportSections: ReportSectionRecord[] = [];
    let finalReport: FinalReport | null = null;
    let fatalFailure = false;

    for (const task of nonJudgeTasks) {
      const result = await this.executeTask(run, task, plannerOutput.tasks, findings, graphGateway);
      findings.push(...result.findings);

      if (result.taskStatus === "failed") {
        run = this.runManager.markDegraded(run.runId, `${task.agentType} task failed.`);
        fatalFailure = false;
      }

      if (result.taskStatus === "degraded") {
        run = this.runManager.markDegraded(run.runId, `${task.agentType} task degraded.`);
      }
    }

    if (!judgeTask) {
      run = this.runManager.transitionRun(run.runId, "failed");
      fatalFailure = true;
    }

    if (!fatalFailure && judgeTask) {
      run = this.runManager.transitionRun(run.runId, "synthesizing");
      await this.publishRuntimeEvent(run.runId, "judge_synthesis_started", "Judge synthesis started.", {
        findingCount: findings.length,
      }, buildAgentId(run.runId, "judge"));

      const judgeResult = await this.executeTask(run, judgeTask, plannerOutput.tasks, findings, graphGateway);
      findings.push(...judgeResult.findings);

      if (judgeResult.decision) {
        decision = judgeResult.decision;
      }

      reportSections = normalizeReportSections(run.runId, judgeResult.reportSections);
      finalReport =
        judgeResult.finalReport ??
        buildFinalReport({
          runId: run.runId,
          caseId: run.caseId,
          sections: reportSections,
        });

      if (judgeResult.taskStatus === "failed") {
        run = this.runManager.transitionRun(run.runId, "failed");
        fatalFailure = true;
      } else if (judgeResult.taskStatus === "degraded") {
        run = this.runManager.markDegraded(run.runId, "Judge synthesis degraded.");
      }
    }

    if (finalReport) {
      await this.publishRuntimeEvent(run.runId, "report_ready", "Final report ready.", {
        reportId: finalReport.reportId,
      }, buildAgentId(run.runId, "judge"));
    }

    if (fatalFailure) {
      run = this.runManager.transitionRun(run.runId, "failed");
    } else if (run.degradedReasons.length > 0 || run.status === "degraded") {
      run = this.runManager.transitionRun(run.runId, "degraded");
    } else {
      run = this.runManager.transitionRun(run.runId, "completed");
    }

    return {
      run,
      tasks: plannerOutput.tasks,
      findings,
      decision,
      reportSections,
      finalReport,
    };
  }

  private async executeTask(
    run: RunRecord,
    task: AgentTask,
    tasks: AgentTask[],
    findings: FindingRecord[],
    graphGateway: GraphPatchGateway,
  ): Promise<AgentExecutionResult> {
    const agentId = buildAgentId(run.runId, task.agentType);
    const executor = this.executors[task.agentType];

    if (!executor) {
      const failedResult: AgentExecutionResult = {
        taskStatus: "failed",
        summary: `Missing executor for ${task.agentType}.`,
        findings: [],
        graphPatches: [],
        openQuestions: [],
        degradedReasons: [`Missing executor for ${task.agentType}.`],
        decision: null,
        reportSections: [],
        finalReport: null,
      };
      await this.publishRuntimeEvent(run.runId, "agent_failed", `Agent ${task.agentType} has no executor.`, {
        taskId: task.taskId,
      }, agentId);
      return failedResult;
    }

    const runtimeContext: AgentExecutionContext = {
      run,
      task: {
        ...task,
        status: "running",
      },
      query: run.query,
      toolRegistry: this.toolRegistry,
      skillRegistry: this.skillRegistry,
      graphGateway,
      graphContextReader: this.graphContextReader,
      dataAdapter: this.dataAdapter,
      eventSink: this.eventSink,
      upstreamFindings: findings,
      knownTasks: tasks,
    };

    try {
      const result = await executor.execute(runtimeContext);
      let effectiveTaskStatus = result.taskStatus;
      const degradedReasons = [...result.degradedReasons];

      for (const finding of result.findings) {
        await this.publishRuntimeEvent(run.runId, "finding_created", `Finding created by ${task.agentType}.`, {
          taskId: task.taskId,
          findingId: finding.findingId,
          claim: finding.claim,
        }, agentId);
      }

      for (const patch of result.graphPatches) {
        const submission = await graphGateway.submit(patch);
        await this.publishRuntimeEvent(
          run.runId,
          submission.runEventType,
          `Graph patch ${submission.status}.`,
          {
            patchId: submission.patchId,
            status: submission.status,
            reason: submission.status === "rejected" ? submission.reason : "accepted",
            errors: submission.status === "rejected" ? submission.errors : [],
            warnings: submission.status === "rejected" ? submission.warnings : submission.validation.warnings,
          },
          agentId,
        );

        if (submission.status === "rejected" && effectiveTaskStatus !== "failed") {
          effectiveTaskStatus = "degraded";
          degradedReasons.push(`Graph patch rejected: ${submission.patchId}`);
        }
      }

      if (effectiveTaskStatus === "failed") {
        await this.publishRuntimeEvent(run.runId, "agent_failed", `Agent ${task.agentType} failed.`, {
          taskId: task.taskId,
          summary: result.summary,
        }, agentId);
      } else {
        await this.publishRuntimeEvent(run.runId, "agent_completed", `Agent ${task.agentType} completed.`, {
          taskId: task.taskId,
          taskStatus: effectiveTaskStatus,
          summary: result.summary,
        }, agentId);
      }

      if (effectiveTaskStatus === "degraded") {
        await this.publishRuntimeEvent(run.runId, "degraded_mode_entered", `Agent ${task.agentType} entered degraded mode.`, {
          taskId: task.taskId,
          reasons: degradedReasons,
        }, agentId);
      }

      return {
        ...result,
        taskStatus: effectiveTaskStatus,
        degradedReasons,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown executor failure.";

      await this.publishRuntimeEvent(run.runId, "agent_failed", `Agent ${task.agentType} failed.`, {
        taskId: task.taskId,
        error: message,
      }, agentId);

      await this.publishRuntimeEvent(run.runId, "degraded_mode_entered", `Run degraded after ${task.agentType} failure.`, {
        taskId: task.taskId,
        error: message,
      }, agentId);

      return {
        taskStatus: task.agentType === "judge" ? "failed" : "degraded",
        summary: message,
        findings: [],
        graphPatches: [],
        openQuestions: [],
        degradedReasons: [message],
        decision: null,
        reportSections: [],
        finalReport: null,
      };
    }
  }

  private async publishRuntimeEvent(
    runId: string,
    eventType: Parameters<typeof createRunEvent>[0]["eventType"],
    title: string,
    payload: Record<string, unknown>,
    agentId: string = runtimeAgentId,
  ): Promise<void> {
    await this.eventSink.publish(
      createRunEvent({
        runId,
        agentId,
        eventType,
        title,
        payload,
      }),
    );
  }
}

function buildAgentId(runId: string, agentType: string): string {
  return `agent:${runId}:${agentType}`;
}
