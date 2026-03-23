import type { FeedMessage, FeedMode, StreamKind } from "./feeds.js";
import {
  agentKeys,
  reportSectionKeys,
  reportSectionTitles,
  type AgentKey,
  type ReportSectionRecord,
  type ReportSectionStatus,
  type ReportSectionKey,
  type TerminalLine,
  type RunEvent,
  type RunRecord,
} from "./run-contract.js";

export type ConnectionStatus =
  | "idle"
  | "creating"
  | "connecting"
  | "streaming"
  | "interrupted"
  | "completed"
  | "error";

export type AgentCardStatus =
  | "idle"
  | "running"
  | "blocked"
  | "done"
  | "degraded"
  | "failed";

export interface AppState {
  feedMode: FeedMode;
  feedLabel: string;
  composerText: string;
  canvasCollapsed: boolean;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  infoMessage: string | null;
  streamWarnings: Partial<Record<StreamKind, string>>;
  run: RunRecord | null;
  reportSections: ReportSectionRecord[];
  finalReportReady: boolean;
  receivedEvents: RunEvent[];
  terminalLines: Record<AgentKey, TerminalLine[]>;
}

export interface RunViewState {
  ticker: string;
  horizon: string;
  queryLabel: string;
  stageLabel: string;
  stageDetail: string;
  statusTone: "idle" | "running" | "completed" | "degraded" | "failed";
  completedAgentCount: number;
  totalAgentCount: number;
  degraded: boolean;
  degradedReasons: string[];
  connectionStatus: ConnectionStatus;
  streamWarning: string | null;
  feedLabel: string;
}

export interface ReportSectionViewState {
  key: ReportSectionKey;
  title: string;
  content: string;
  status: ReportSectionStatus;
  citations: string[];
  isSkeleton: boolean;
  highlight: boolean;
}

export interface ReportViewState {
  sections: ReportSectionViewState[];
  degraded: boolean;
  degradedMessage: string | null;
}

export interface AgentCardState {
  agent: AgentKey;
  label: string;
  status: AgentCardStatus;
  phaseLabel: string;
  currentTask: string;
  recentAction: string;
  latestFinding: string;
  latestTool: string;
  latestPatch: string;
  patchTone: "clean" | "warning" | "error";
  transcriptLines: TerminalLineState[];
  eventCount: number;
  isLive: boolean;
}

export interface TerminalLineState {
  id: string;
  prefix: string;
  text: string;
  kind: TerminalLine["kind"];
  tone: TerminalLine["tone"];
  ts: string;
}

export interface TimelineItemViewState {
  eventId: string;
  agentLabel: string;
  timestampLabel: string;
  title: string;
  summary: string;
}

export function createInitialState(
  feedMode: FeedMode,
  infoMessage?: string,
): AppState {
  return {
    feedMode,
    feedLabel: feedMode === "recorded" ? "Recorded Demo Feed" : "Live SSE Feed",
    composerText: feedMode === "recorded" ? "AAPL 未来三个月值不值得买？" : "",
    canvasCollapsed: false,
    connectionStatus: "idle",
    errorMessage: null,
    infoMessage:
      infoMessage ??
      (feedMode === "recorded"
        ? "Recorded mode replays the committed AAPL demo fixture. This is explicit demo input, not a live backend run."
        : "SSE mode expects a runtime event endpoint plus an optional snapshot endpoint for final report hydration."),
    streamWarnings: {},
    run: null,
    reportSections: createEmptySections(),
    finalReportReady: false,
    receivedEvents: [],
    terminalLines: createEmptyTerminalLines(),
  };
}

export function createRestartState(
  previous: AppState,
  infoMessage?: string,
): AppState {
  return {
    ...createInitialState(previous.feedMode, infoMessage),
    composerText: previous.composerText,
    canvasCollapsed: previous.canvasCollapsed,
  };
}

export function reduceFeedMessage(
  state: AppState,
  message: FeedMessage,
): AppState {
  switch (message.kind) {
    case "connected":
      return {
        ...state,
        feedLabel: message.label,
        connectionStatus: "connecting",
        errorMessage: null,
      };
    case "snapshot":
      return {
        ...state,
        connectionStatus: deriveConnectionStatusFromRun(
          message.run,
          state.connectionStatus,
          state.streamWarnings,
        ),
        run: message.run,
        reportSections: message.reportSections.length
          ? message.reportSections
          : createEmptySections(message.run.runId),
      };
    case "event":
      return {
        ...state,
        connectionStatus: deriveConnectionStatusFromRun(
          state.run ?? null,
          "streaming",
          clearStreamWarning(state.streamWarnings, "events"),
        ),
        streamWarnings: clearStreamWarning(state.streamWarnings, "events"),
        receivedEvents: [...state.receivedEvents, message.event],
        finalReportReady:
          state.finalReportReady || message.event.eventType === "report_ready",
      };
    case "terminal_snapshot":
      return {
        ...state,
        terminalLines: sanitizeTerminalLines(message.snapshot.terminals),
      };
    case "terminal_chunk":
      return {
        ...state,
        connectionStatus: deriveConnectionStatusFromRun(
          state.run ?? null,
          state.connectionStatus === "connecting" ? "connecting" : "streaming",
          clearStreamWarning(state.streamWarnings, "terminal"),
        ),
        streamWarnings: clearStreamWarning(state.streamWarnings, "terminal"),
        terminalLines: appendTerminalChunk(state.terminalLines, message.chunk),
      };
    case "stream_interrupted": {
      const nextWarnings = {
        ...state.streamWarnings,
        [message.stream]: message.message,
      };

      return {
        ...state,
        connectionStatus:
          isRunSettled(state.run) ? "completed" : "interrupted",
        streamWarnings: nextWarnings,
      };
    }
    case "stream_recovered": {
      const nextWarnings = clearStreamWarning(state.streamWarnings, message.stream);

      return {
        ...state,
        connectionStatus: deriveConnectionStatusFromRun(
          state.run ?? null,
          state.connectionStatus,
          nextWarnings,
        ),
        streamWarnings: nextWarnings,
      };
    }
    case "complete":
      return {
        ...state,
        connectionStatus: "completed",
      };
    case "error":
      return {
        ...state,
        connectionStatus: "error",
        errorMessage: message.message,
      };
    default:
      return state;
  }
}

export function selectRunViewState(state: AppState): RunViewState {
  const agentCards = selectAgentCardStates(state);
  const completedAgentCount = agentCards.filter((card) =>
    ["done", "degraded", "failed"].includes(card.status),
  ).length;
  const degradedReasons = collectDegradedReasons(state);
  const runStatus = state.run?.status;
  const streamWarning = summarizeStreamWarnings(state.streamWarnings);
  const hasReportReady = state.receivedEvents.some(
    (event) => event.eventType === "report_ready",
  );
  const hasJudgeStarted = state.receivedEvents.some(
    (event) => event.eventType === "judge_synthesis_started",
  );
  const hasPlan = state.receivedEvents.some(
    (event) =>
      event.eventType === "planner_completed" ||
      event.eventType === "task_assigned",
  );
  const activeCards = agentCards.filter((card) => card.status === "running");

  let stageLabel = "Awaiting Run";
  let stageDetail =
    state.feedMode === "sse"
      ? "Submit a question to create a live run against the runtime API."
      : "Replay the recorded fixture to inspect the shell with known runtime output.";
  let statusTone: RunViewState["statusTone"] = "idle";

  if (state.connectionStatus === "creating") {
    stageLabel = "Creating Run";
    stageDetail = "Submitting your question and preparing report + terminal hydration.";
    statusTone = "running";
  } else if (state.connectionStatus === "error") {
    stageLabel = "Connection Error";
    stageDetail = state.errorMessage ?? "The feed could not be established.";
    statusTone = "failed";
  } else if (state.connectionStatus === "interrupted") {
    stageLabel = "Stream Reconnecting";
    stageDetail =
      streamWarning ??
      "Live transport dropped temporarily. The latest report snapshot stays on screen while the browser reconnects.";
    statusTone = "degraded";
  } else if (state.connectionStatus === "connecting" && state.run) {
    stageLabel = "Hydrating Run";
    stageDetail =
      "Fetching the latest report snapshot and terminal transcript before live streaming continues.";
    statusTone = "running";
  } else if (runStatus === "failed") {
    stageLabel = degradedReasons.length > 0 ? "Run Failed" : "Runtime Failed";
    stageDetail =
      degradedReasons[0] ??
      "The runtime failed before a usable structured report was produced.";
    statusTone = "failed";
  } else if (runStatus === "completed" || runStatus === "degraded" || hasReportReady) {
    stageLabel = degradedReasons.length > 0 ? "Degraded Result" : "Completed";
    stageDetail =
      degradedReasons.length > 0
        ? "The report rendered, but some evidence or validation steps were incomplete."
        : "Judge assembled the fixed six-section report.";
    statusTone = degradedReasons.length > 0 ? "degraded" : "completed";
  } else if (hasJudgeStarted) {
    stageLabel = "Synthesizing";
    stageDetail = "Judge is consolidating upstream findings into the final report.";
    statusTone = "running";
  } else if (activeCards.length > 0) {
    stageLabel = "Agent Research";
    stageDetail = `${activeCards.map((card) => card.label).join(", ")} are actively updating the run.`;
    statusTone = "running";
  } else if (hasPlan) {
    stageLabel = "Planning";
    stageDetail = "Planner has assigned the fixed four-agent research lanes.";
    statusTone = "running";
  } else if (state.receivedEvents.length > 0) {
    stageLabel = "Run Created";
    stageDetail = "The runtime accepted the query and opened a new run scope.";
    statusTone = "running";
  }

  return {
    ticker: state.run?.query.ticker ?? "AAPL",
    horizon: state.run?.query.timeHorizon ?? "3m",
    queryLabel: state.run?.query.userQuestion ?? state.composerText,
    stageLabel,
    stageDetail,
    statusTone,
    completedAgentCount,
    totalAgentCount: agentKeys.length,
    degraded: degradedReasons.length > 0,
    degradedReasons,
    connectionStatus: state.connectionStatus,
    streamWarning,
    feedLabel: state.feedLabel,
  };
}

export function selectReportViewState(state: AppState): ReportViewState {
  const degradedReasons = collectDegradedReasons(state);
  const hasReport = state.finalReportReady;
  const isSynthesizing = state.receivedEvents.some(
    (event) => event.eventType === "judge_synthesis_started",
  );
  const runFailed = state.run?.status === "failed";

  const sections = hasReport
    ? state.reportSections.map((section) => ({
        key: section.sectionKey,
        title: section.title,
        content: section.content,
        status:
          degradedReasons.length > 0 && !section.content
            ? "degraded"
            : section.status,
        citations: compactCitations(section),
        isSkeleton: false,
        highlight: section.sectionKey === "final_judgment",
      }))
    : createEmptySections().map((section): ReportSectionViewState => ({
        key: section.sectionKey,
        title: section.title,
        content:
          section.sectionKey === "final_judgment" && isSynthesizing
            ? "Synthesizing judgment..."
            : runFailed && section.sectionKey === "final_judgment"
              ? "This run failed before Delphi could assemble a usable final judgment."
            : "",
        status: "empty",
        citations: [],
        isSkeleton: true,
        highlight: section.sectionKey === "final_judgment",
      }));

  return {
    sections,
    degraded: degradedReasons.length > 0 || runFailed,
    degradedMessage:
      runFailed
        ? `Runtime failed: ${degradedReasons[0] ?? "upstream agents did not produce a usable report."}`
        : degradedReasons.length > 0
          ? `This run completed in degraded mode. ${degradedReasons[0] ?? "Some evidence collection or validation steps were incomplete."}`
        : null,
  };
}

export function renderComposerButtonLabel(state: AppState): string {
  if (state.feedMode === "recorded") {
    return "Replay Recorded Run";
  }

  if (state.connectionStatus === "creating") {
    return "Creating Run...";
  }

  return state.run ? "Create New Live Run" : "Submit Live Query";
}

export function selectAgentCardStates(state: AppState): AgentCardState[] {
  const cards = new Map<AgentKey, AgentCardState>(
    agentKeys.map((agent) => [
      agent,
      {
        agent,
        label: formatAgentLabel(agent),
        status: agent === "judge" ? "blocked" : "idle",
        phaseLabel: agent === "judge" ? "Waiting" : "Idle",
        currentTask:
          agent === "judge"
            ? "Waiting for thesis, liquidity, and market signal findings."
            : "Task not assigned yet.",
        recentAction: "No runtime activity yet.",
        latestFinding: "No findings emitted yet.",
        latestTool: "No tool activity yet.",
        latestPatch: "No graph validation yet.",
        patchTone: "clean",
        transcriptLines: [],
        eventCount: 0,
        isLive: false,
      },
    ]),
  );

  for (const event of state.receivedEvents) {
    const agent = inferAgentKey(event);

    if (!agent) {
      continue;
    }

    const card = cards.get(agent);

    if (!card) {
      continue;
    }

    switch (event.eventType) {
      case "task_assigned":
        card.currentTask = stringPayload(event, "goal") ?? card.currentTask;
        card.phaseLabel = agent === "judge" ? "Waiting" : "Assigned";
        card.status = agent === "judge" ? "blocked" : "idle";
        card.recentAction = event.title;
        break;
      case "tool_started":
        card.status = "running";
        card.phaseLabel = "Running";
        card.recentAction = event.title;
        card.latestTool =
          stringPayload(event, "capability") ?? "Tool execution started.";
        break;
      case "tool_finished":
        card.status = "running";
        card.phaseLabel = "Processing";
        card.recentAction = event.title;
        card.latestTool = summarizeToolResult(event);
        break;
      case "finding_created":
        card.status = "running";
        card.phaseLabel = "Writing Findings";
        card.recentAction = event.title;
        card.latestFinding =
          stringPayload(event, "claim") ?? "A finding was emitted.";
        break;
      case "patch_accepted":
        if (card.status !== "done") {
          card.status = "running";
          card.phaseLabel = "Validating";
        }
        card.recentAction = "Runtime validation accepted the latest graph patch.";
        card.latestPatch = "Accepted";
        card.patchTone = "clean";
        break;
      case "patch_rejected":
        card.status = "degraded";
        card.phaseLabel = "Partial";
        card.recentAction =
          "Validation did not fully pass. The run continued in degraded mode.";
        card.latestPatch = "Rejected";
        card.patchTone = "error";
        break;
      case "judge_synthesis_started":
        card.status = "running";
        card.phaseLabel = "Synthesizing";
        card.recentAction = event.title;
        break;
      case "agent_completed":
        card.status =
          stringPayload(event, "taskStatus") === "degraded" ? "degraded" : "done";
        card.phaseLabel = card.status === "done" ? "Complete" : "Partial";
        card.recentAction =
          stringPayload(event, "summary") ?? "Task completed.";
        break;
      case "agent_failed":
        card.status = "failed";
        card.phaseLabel = "Failed";
        card.recentAction =
          stringPayload(event, "summary") ??
          stringPayload(event, "error") ??
          "Task failed.";
        break;
      case "degraded_mode_entered":
        if (card.status !== "failed") {
          card.status = "degraded";
          card.phaseLabel = "Partial";
        }
        card.recentAction =
          summarizeReasons(event) ??
          "The task entered degraded mode and continued with partial output.";
        card.patchTone = "warning";
        break;
      case "report_ready":
        card.status = "done";
        card.phaseLabel = "Report Ready";
        card.recentAction = "Judge published the final structured report.";
        break;
      default:
        break;
    }
  }

  return agentKeys.map((agent) => {
    const card = cards.get(agent) as AgentCardState;
    const agentEvents = state.receivedEvents.filter(
      (event) => inferAgentKey(event) === agent,
    );
    const terminalLines = state.terminalLines[agent];

    card.transcriptLines =
      terminalLines.length > 0
        ? terminalLines.slice(-9).map((line) => ({
            id: line.lineId,
            prefix: line.prefix,
            text: line.text,
            kind: line.kind,
            tone: line.tone,
            ts: line.ts,
          }))
        : buildTranscriptLines(agentEvents);
    card.eventCount = agentEvents.length;
    card.isLive = card.status === "running";

    return card;
  });
}

export function selectTimelineState(state: AppState): TimelineItemViewState[] {
  return state.receivedEvents.slice(-12).reverse().map((event) => ({
    eventId: event.eventId,
    agentLabel: formatAgentLabel(inferAgentKey(event) ?? "judge"),
    timestampLabel: formatTime(event.ts),
    title: event.title,
    summary: summarizeTimelineEvent(event),
  }));
}

export function toggleCanvas(state: AppState): AppState {
  return {
    ...state,
    canvasCollapsed: !state.canvasCollapsed,
  };
}

export function updateComposerText(state: AppState, value: string): AppState {
  return {
    ...state,
    composerText: value,
  };
}

function collectDegradedReasons(state: AppState): string[] {
  const reasons = new Set<string>(state.run?.degradedReasons ?? []);

  for (const event of state.receivedEvents) {
    if (event.eventType !== "degraded_mode_entered") {
      continue;
    }

    const payloadReasons = event.payload.reasons;

    if (Array.isArray(payloadReasons)) {
      for (const reason of payloadReasons) {
        if (typeof reason === "string") {
          reasons.add(reason);
        }
      }
    }

    const error = stringPayload(event, "error");

    if (error) {
      reasons.add(error);
    }
  }

  return [...reasons];
}

function deriveConnectionStatusFromRun(
  run: RunRecord | null,
  previousStatus: ConnectionStatus,
  streamWarnings: Partial<Record<StreamKind, string>>,
): ConnectionStatus {
  if (!run) {
    return hasStreamWarnings(streamWarnings) ? "interrupted" : previousStatus;
  }

  if (run.status === "completed" || run.status === "failed" || run.status === "degraded") {
    return "completed";
  }

  if (hasStreamWarnings(streamWarnings)) {
    return "interrupted";
  }

  if (run.status === "created" || run.status === "planned") {
    return "connecting";
  }

  if (previousStatus === "creating" || previousStatus === "connecting") {
    return "connecting";
  }

  return "streaming";
}

function hasStreamWarnings(
  streamWarnings: Partial<Record<StreamKind, string>>,
): boolean {
  return Object.values(streamWarnings).some((warning) => Boolean(warning));
}

function summarizeStreamWarnings(
  streamWarnings: Partial<Record<StreamKind, string>>,
): string | null {
  if (streamWarnings.events) {
    return streamWarnings.events;
  }

  if (streamWarnings.terminal) {
    return streamWarnings.terminal;
  }

  return null;
}

function clearStreamWarning(
  streamWarnings: Partial<Record<StreamKind, string>>,
  stream: StreamKind,
): Partial<Record<StreamKind, string>> {
  if (!(stream in streamWarnings)) {
    return streamWarnings;
  }

  const nextWarnings = { ...streamWarnings };
  delete nextWarnings[stream];
  return nextWarnings;
}

function isRunSettled(run: RunRecord | null): boolean {
  return Boolean(
    run &&
      (run.status === "completed" ||
        run.status === "failed" ||
        run.status === "degraded"),
  );
}

function createEmptySections(runId = "run:pending"): ReportSectionRecord[] {
  return reportSectionKeys.map((key) => ({
    sectionId: `section:${runId}:${key}`,
    runId,
    sectionKey: key,
    title: reportSectionTitles[key],
    content: "",
    citationFindingRefs: [],
    citationEvidenceRefs: [],
    citationObjectRefs: [],
    status: "empty",
  }));
}

function createEmptyTerminalLines(): Record<AgentKey, TerminalLine[]> {
  return {
    thesis: [],
    liquidity: [],
    market_signal: [],
    judge: [],
  };
}

function formatAgentLabel(agent: AgentKey): string {
  switch (agent) {
    case "market_signal":
      return "Market Signal";
    case "thesis":
      return "Thesis";
    case "liquidity":
      return "Liquidity";
    case "judge":
      return "Judge";
    default:
      return agent;
  }
}

function inferAgentKey(event: RunEvent): AgentKey | null {
  const payloadAgent = event.payload.agentType;

  if (typeof payloadAgent === "string" && agentKeys.includes(payloadAgent as AgentKey)) {
    return payloadAgent as AgentKey;
  }

  const agentIdParts = event.agentId.split(":");
  const maybeAgent = agentIdParts[agentIdParts.length - 1];

  return agentKeys.includes(maybeAgent as AgentKey)
    ? (maybeAgent as AgentKey)
    : null;
}

function compactCitations(section: ReportSectionRecord): string[] {
  return [
    ...section.citationFindingRefs,
    ...section.citationEvidenceRefs,
  ].slice(0, 6);
}

function stringPayload(event: RunEvent, key: string): string | null {
  const value = event.payload[key];
  return typeof value === "string" ? value : null;
}

function summarizeToolResult(event: RunEvent): string {
  const parts = [
    stringPayload(event, "capability"),
    typeof event.payload.newsCount === "number"
      ? `${event.payload.newsCount} news items`
      : null,
    typeof event.payload.latestPrice === "number"
      ? `price ${event.payload.latestPrice}`
      : null,
    stringPayload(event, "regimeLabel"),
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : "Tool execution finished.";
}

function summarizeReasons(event: RunEvent): string | null {
  const payloadReasons = event.payload.reasons;

  if (Array.isArray(payloadReasons)) {
    const firstReason = payloadReasons.find(
      (reason): reason is string => typeof reason === "string",
    );

    if (firstReason) {
      return firstReason;
    }
  }

  return stringPayload(event, "error");
}

function summarizeTimelineEvent(event: RunEvent): string {
  switch (event.eventType) {
    case "task_assigned":
      return stringPayload(event, "goal") ?? "Task assigned.";
    case "tool_started":
    case "tool_finished":
      return summarizeToolResult(event);
    case "finding_created":
      return stringPayload(event, "claim") ?? "Finding created.";
    case "patch_accepted":
      return "Runtime validation accepted the latest graph patch.";
    case "patch_rejected":
      return "A graph patch was rejected. The run remained available in degraded mode.";
    case "agent_completed":
    case "agent_failed":
      return (
        stringPayload(event, "summary") ??
        stringPayload(event, "error") ??
        "Agent status updated."
      );
    case "degraded_mode_entered":
      return summarizeReasons(event) ?? "Run entered degraded mode.";
    case "report_ready":
      return stringPayload(event, "reportId") ?? "Final report ready.";
    default:
      return event.title;
  }
}

function buildTranscriptLines(
  events: readonly RunEvent[],
): TerminalLineState[] {
  return events.slice(-8).map((event) => ({
    id: event.eventId,
    prefix: terminalPrefix(event),
    text: summarizeTranscriptEvent(event),
    kind: inferTerminalKindFromEvent(event),
    tone: terminalTone(event),
    ts: event.ts,
  }));
}

function summarizeTranscriptEvent(event: RunEvent): string {
  switch (event.eventType) {
    case "task_assigned":
      return stringPayload(event, "goal") ?? event.title;
    case "tool_started":
      return `start ${stringPayload(event, "capability") ?? "tool capability"}`;
    case "tool_finished":
      return summarizeToolResult(event);
    case "finding_created":
      return stringPayload(event, "claim") ?? "Finding emitted.";
    case "patch_accepted":
      return "graph patch accepted";
    case "patch_rejected":
      return "graph validation rejected; degraded mode engaged";
    case "judge_synthesis_started":
      return "collecting upstream findings for fixed six-section report";
    case "agent_completed":
      return stringPayload(event, "summary") ?? "agent completed";
    case "agent_failed":
      return (
        stringPayload(event, "error") ??
        stringPayload(event, "summary") ??
        "agent failed"
      );
    case "degraded_mode_entered":
      return summarizeReasons(event) ?? "degraded mode entered";
    case "report_ready":
      return `final report ready · ${truncateLong(stringPayload(event, "reportId") ?? "report", 28)}`;
    default:
      return event.title;
  }
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

function terminalTone(
  event: RunEvent,
): TerminalLineState["tone"] {
  switch (event.eventType) {
    case "tool_started":
    case "tool_finished":
    case "judge_synthesis_started":
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

function inferTerminalKindFromEvent(
  event: RunEvent,
): TerminalLineState["kind"] {
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

function sanitizeTerminalLines(
  terminals: Record<AgentKey, TerminalLine[]>,
): Record<AgentKey, TerminalLine[]> {
  const next = createEmptyTerminalLines();

  for (const agent of agentKeys) {
    next[agent] = dedupeTerminalLines(terminals[agent] ?? []);
  }

  return next;
}

function appendTerminalChunk(
  terminalLines: Record<AgentKey, TerminalLine[]>,
  chunk: { agentType: AgentKey; line: TerminalLine },
): Record<AgentKey, TerminalLine[]> {
  const existing = terminalLines[chunk.agentType];

  if (existing.some((line) => line.lineId === chunk.line.lineId)) {
    return terminalLines;
  }

  return {
    ...terminalLines,
    [chunk.agentType]: [...existing, chunk.line],
  };
}

function dedupeTerminalLines(lines: TerminalLine[]): TerminalLine[] {
  const seen = new Set<string>();
  const next: TerminalLine[] = [];

  for (const line of lines) {
    if (seen.has(line.lineId)) {
      continue;
    }

    seen.add(line.lineId);
    next.push(line);
  }

  return next;
}

function truncateLong(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function formatTime(ts: string): string {
  const date = new Date(ts);

  return Number.isNaN(date.getTime())
    ? "--:--:--"
    : date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}
