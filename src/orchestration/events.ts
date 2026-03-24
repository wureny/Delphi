import { randomUUID } from "node:crypto";

export const runEventTypes = [
  "run_created",
  "planner_completed",
  "task_assigned",
  "tool_started",
  "tool_finished",
  "finding_created",
  "patch_accepted",
  "patch_rejected",
  "judge_synthesis_started",
  "agent_completed",
  "agent_failed",
  "degraded_mode_entered",
  "report_section_ready",
  "report_ready",
] as const;

export type RunEventType = (typeof runEventTypes)[number];

export interface RunEvent {
  eventId: string;
  runId: string;
  agentId: string;
  eventType: RunEventType;
  title: string;
  payload: Record<string, unknown>;
  ts: string;
}

export interface RuntimeEventSink {
  publish(event: RunEvent): Promise<void>;
}

export class NoopRuntimeEventSink implements RuntimeEventSink {
  async publish(_event: RunEvent): Promise<void> {
    return Promise.resolve();
  }
}

export class MemoryRuntimeEventSink implements RuntimeEventSink {
  readonly events: RunEvent[] = [];

  async publish(event: RunEvent): Promise<void> {
    this.events.push(event);
  }
}

export class CompositeRuntimeEventSink implements RuntimeEventSink {
  constructor(private readonly sinks: RuntimeEventSink[]) {}

  async publish(event: RunEvent): Promise<void> {
    for (const sink of this.sinks) {
      await sink.publish(event);
    }
  }
}

export interface CreateRunEventInput {
  runId: string;
  agentId: string;
  eventType: RunEventType;
  title: string;
  payload?: Record<string, unknown>;
  eventId?: string;
  ts?: string;
}

export function createRunEvent(input: CreateRunEventInput): RunEvent {
  return {
    eventId: input.eventId ?? `event_${randomUUID()}`,
    runId: input.runId,
    agentId: input.agentId,
    eventType: input.eventType,
    title: input.title,
    payload: input.payload ?? {},
    ts: input.ts ?? new Date().toISOString(),
  };
}
