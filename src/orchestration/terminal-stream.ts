import type { AgentType } from "../research-graph/runtime.ts";
import { isAgentType } from "../research-graph/runtime.ts";
import type { RunEvent } from "./events.ts";

export const terminalLineKinds = [
  "plan",
  "tool",
  "finding",
  "graph",
  "synthesis",
  "status",
  "warning",
  "error",
] as const;

export type TerminalLineKind = (typeof terminalLineKinds)[number];

export const terminalLineTones = [
  "neutral",
  "running",
  "success",
  "warning",
  "danger",
] as const;

export type TerminalLineTone = (typeof terminalLineTones)[number];

export interface TerminalLine {
  lineId: string;
  runId: string;
  agentType: AgentType;
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
  agentType: AgentType;
  line: TerminalLine;
}

export interface TerminalSnapshot {
  runId: string;
  terminals: Record<AgentType, TerminalLine[]>;
}

export function createEmptyTerminalSnapshot(runId: string): TerminalSnapshot {
  return {
    runId,
    terminals: {
      thesis: [],
      liquidity: [],
      market_signal: [],
      judge: [],
    },
  };
}

export function createTerminalChunkFromRunEvent(
  event: RunEvent,
): TerminalStreamChunk | null {
  const agentType = inferAgentType(event.agentId);

  if (!agentType) {
    return null;
  }

  const text = summarizeTerminalEvent(event);

  if (!text) {
    return null;
  }

  return {
    chunkId: `terminal:${event.eventId}`,
    runId: event.runId,
    agentType,
    line: {
      lineId: `line:${event.eventId}`,
      runId: event.runId,
      agentType,
      eventId: event.eventId,
      prefix: terminalPrefix(event),
      text,
      kind: terminalKind(event),
      tone: terminalTone(event),
      ts: event.ts,
    },
  };
}

function inferAgentType(agentId: string): AgentType | null {
  const candidate = agentId.split(":").at(-1);
  return candidate && isAgentType(candidate) ? candidate : null;
}

function summarizeTerminalEvent(event: RunEvent): string | null {
  switch (event.eventType) {
    case "task_assigned":
      return stringPayload(event, "goal") ?? event.title;
    case "tool_started":
      return `Starting ${humanizeCapability(stringPayload(event, "capability") ?? "the next step")}`;
    case "tool_finished":
      return summarizeToolResult(event);
    case "finding_created":
      return stringPayload(event, "claim") ?? "finding emitted";
    case "patch_accepted":
      return "Saved structured update";
    case "patch_rejected":
      return "Structured update needs revision";
    case "judge_synthesis_started":
      return "Synthesizing the answer from the specialist findings";
    case "report_section_ready":
      return summarizeReportSection(event);
    case "agent_completed":
      return stringPayload(event, "summary") ?? "Step completed";
    case "agent_failed":
      return (
        stringPayload(event, "error") ??
        stringPayload(event, "summary") ??
        "Step failed"
      );
    case "degraded_mode_entered":
      return summarizeReasons(event) ?? "Running in degraded mode";
    case "report_ready":
      return "Final report ready";
    default:
      return null;
  }
}

function summarizeToolResult(event: RunEvent): string {
  const capability = stringPayload(event, "capability") ?? "tool capability";
  const newsCount = numberPayload(event, "newsCount");
  const regimeLabel = stringPayload(event, "regimeLabel");
  const latestPrice = numberPayload(event, "latestPrice");

  if (typeof newsCount === "number") {
    return `Reviewed ${newsCount} news items`;
  }

  if (regimeLabel) {
    return `Read the regime as ${regimeLabel}`;
  }

  if (typeof latestPrice === "number") {
    return `Latest price read: ${latestPrice.toFixed(2)}`;
  }

  return `Finished ${humanizeCapability(capability)}`;
}

function summarizeReasons(event: RunEvent): string | null {
  const reasons = event.payload.reasons;

  if (Array.isArray(reasons)) {
    const firstReason = reasons.find((reason): reason is string => typeof reason === "string");

    if (firstReason) {
      return firstReason;
    }
  }

  return stringPayload(event, "error");
}

function terminalPrefix(event: RunEvent): string {
  switch (event.eventType) {
    case "task_assigned":
      return "plan>";
    case "tool_started":
    case "tool_finished":
      return "tool>";
    case "finding_created":
      return "find>";
    case "patch_accepted":
    case "patch_rejected":
      return "graph>";
    case "judge_synthesis_started":
    case "report_section_ready":
      return "synth>";
    case "agent_completed":
      return "done>";
    case "agent_failed":
      return "fail>";
    case "degraded_mode_entered":
      return "warn>";
    case "report_ready":
      return "ship>";
    default:
      return "evt>";
  }
}

function terminalKind(event: RunEvent): TerminalLineKind {
  switch (event.eventType) {
    case "task_assigned":
      return "plan";
    case "tool_started":
    case "tool_finished":
      return "tool";
    case "finding_created":
      return "finding";
    case "patch_accepted":
    case "patch_rejected":
      return "graph";
    case "judge_synthesis_started":
    case "report_section_ready":
    case "report_ready":
      return "synthesis";
    case "degraded_mode_entered":
      return "warning";
    case "agent_failed":
      return "error";
    default:
      return "status";
  }
}

function terminalTone(event: RunEvent): TerminalLineTone {
  switch (event.eventType) {
    case "tool_started":
    case "tool_finished":
    case "judge_synthesis_started":
    case "report_section_ready":
      return "running";
    case "agent_completed":
    case "report_ready":
    case "patch_accepted":
      return "success";
    case "patch_rejected":
    case "degraded_mode_entered":
      return "warning";
    case "agent_failed":
      return "danger";
    default:
      return "neutral";
  }
}

function summarizeReportSection(event: RunEvent): string {
  const title = stringPayload(event, "title");
  const sectionKey = stringPayload(event, "sectionKey");

  if (title) {
    return `Wrote ${title}`;
  }

  if (sectionKey) {
    return `Wrote ${sectionKey.replaceAll("_", " ")}`;
  }

  return "Section written";
}

function humanizeCapability(value: string): string {
  switch (value) {
    case "graph_context_retrieval":
      return "prior case context";
    case "thesis_analysis":
      return "company signals";
    case "liquidity_analysis":
      return "the liquidity backdrop";
    case "market_signal_analysis":
      return "price action and positioning";
    default:
      break;
  }

  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringPayload(event: RunEvent, key: string): string | null {
  const value = event.payload[key];
  return typeof value === "string" ? value : null;
}

function numberPayload(event: RunEvent, key: string): number | null {
  const value = event.payload[key];
  return typeof value === "number" ? value : null;
}

function truncateLong(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
