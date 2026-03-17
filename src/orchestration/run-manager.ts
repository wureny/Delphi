import { randomUUID } from "node:crypto";

import type { ResearchQuery, RunRecord, RunStatus } from "./contracts.ts";

export interface CreateRunOptions {
  runId?: string;
  caseId?: string;
  createdAt?: string;
}

export class RunManager {
  private readonly runs = new Map<string, RunRecord>();

  createRun(query: ResearchQuery, options: CreateRunOptions = {}): RunRecord {
    const now = options.createdAt ?? new Date().toISOString();
    const run: RunRecord = {
      runId: options.runId ?? createRunId(),
      caseId: options.caseId ?? createDefaultCaseId(query),
      query,
      status: "created",
      createdAt: now,
      updatedAt: now,
      degradedReasons: [],
    };

    this.runs.set(run.runId, run);
    return run;
  }

  getRun(runId: string): RunRecord | undefined {
    return this.runs.get(runId);
  }

  transitionRun(runId: string, status: RunStatus, updatedAt: string = new Date().toISOString()): RunRecord {
    const run = this.requireRun(runId);
    const nextRun: RunRecord = {
      ...run,
      status,
      updatedAt,
    };

    this.runs.set(runId, nextRun);
    return nextRun;
  }

  markDegraded(runId: string, reason: string, updatedAt: string = new Date().toISOString()): RunRecord {
    const run = this.requireRun(runId);
    const degradedReasons = run.degradedReasons.includes(reason)
      ? run.degradedReasons
      : [...run.degradedReasons, reason];
    const nextRun: RunRecord = {
      ...run,
      status: "degraded",
      updatedAt,
      degradedReasons,
    };

    this.runs.set(runId, nextRun);
    return nextRun;
  }

  private requireRun(runId: string): RunRecord {
    const run = this.runs.get(runId);

    if (!run) {
      throw new Error(`Unknown run: ${runId}`);
    }

    return run;
  }
}

export function createRunId(): string {
  return `run_${randomUUID()}`;
}

export function createDefaultCaseId(query: ResearchQuery): string {
  const normalizedTicker = query.ticker.trim().toUpperCase();
  return `case:${normalizedTicker}:${query.caseType}:${query.timeHorizon}`;
}
