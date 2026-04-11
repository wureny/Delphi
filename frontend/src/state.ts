import type { FeedMessage, FeedMode, StreamKind } from "./feeds.js";
import {
  agentKeys,
  type GraphSnapshot,
  type GraphSnapshotEdge,
  type GraphSnapshotNode,
  type ResearchMapCard,
  type ResearchMapSnapshot,
  type ResearchMapStatus,
  type ResearchMapTone,
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
  pendingSubmittedQuestion: string | null;
  canvasCollapsed: boolean;
  workspaceSplitRatio: number;
  activeOutputPanel: "report" | "research_map";
  activeCanvasPanel: "terminals" | "graph";
  selectedInsight:
    | { kind: "report_section"; key: ReportSectionKey }
    | { kind: "research_card"; cardId: string }
    | { kind: "graph_node"; nodeId: string }
    | null;
  expandedTerminalAgent: AgentKey | null;
  graphZoom: number;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  infoMessage: string | null;
  streamWarnings: Partial<Record<StreamKind, string>>;
  run: RunRecord | null;
  reportSections: ReportSectionRecord[];
  researchMapSnapshot: ResearchMapSnapshot | null;
  graphSnapshot: GraphSnapshot | null;
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
  emphasis: "none" | "selected" | "related";
}

export interface ReportViewState {
  sections: ReportSectionViewState[];
  degraded: boolean;
  degradedMessage: string | null;
}

export interface ResearchMapCardViewState {
  cardId: string;
  label: string;
  tone: ResearchMapTone;
  status: ResearchMapStatus;
  summary: string;
  meta: string;
  isPrimary: boolean;
  emphasis: "none" | "selected" | "related";
}

export interface ResearchMapViewState {
  headline: string;
  summary: string;
  cards: ResearchMapCardViewState[];
  evidenceTrail: string[];
  updatedAtLabel: string | null;
}

export interface GraphNodeViewState {
  nodeId: string;
  label: string;
  kind: GraphSnapshotNode["kind"];
  summary: string;
  x: number;
  y: number;
  width: number;
  height: number;
  emphasis: GraphSnapshotNode["emphasis"];
  focus: "none" | "selected" | "related";
}

export interface GraphEdgeViewState {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label: string;
  focus: "none" | "selected" | "related";
}

export interface GraphNodeDetail {
  nodeId: string;
  label: string;
  kind: GraphSnapshotNode["kind"];
  emphasis: GraphSnapshotNode["emphasis"];
  summary: string;
  incomingEdges: { fromLabel: string; edgeLabel: string }[];
  outgoingEdges: { toLabel: string; edgeLabel: string }[];
}

export interface GraphSnapshotViewState {
  headline: string;
  summary: string;
  updatedAtLabel: string | null;
  nodeCount: number;
  edgeCount: number;
  nodes: GraphNodeViewState[];
  edges: GraphEdgeViewState[];
  selectedNodeDetail: GraphNodeDetail | null;
  canvasWidth: number;
  canvasHeight: number;
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
  expanded: boolean;
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
    pendingSubmittedQuestion: null,
    canvasCollapsed: false,
    workspaceSplitRatio: 0.5,
    activeOutputPanel: "report",
    activeCanvasPanel: "terminals",
    selectedInsight: null,
    expandedTerminalAgent: null,
    graphZoom: 1,
    connectionStatus: "idle",
    errorMessage: null,
    infoMessage:
      infoMessage ??
      (feedMode === "recorded"
        ? "Replay the recorded AAPL demo run."
        : "Ask one stock question to start a live run."),
    streamWarnings: {},
    run: null,
    reportSections: createEmptySections(),
    researchMapSnapshot: null,
    graphSnapshot: null,
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
    pendingSubmittedQuestion: null,
    canvasCollapsed: previous.canvasCollapsed,
    workspaceSplitRatio: previous.workspaceSplitRatio,
    activeOutputPanel: previous.activeOutputPanel,
    activeCanvasPanel: previous.activeCanvasPanel,
    selectedInsight: null,
    expandedTerminalAgent: null,
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
        pendingSubmittedQuestion: null,
        run: message.run,
        reportSections: message.reportSections.length
          ? message.reportSections
          : createEmptySections(message.run.runId),
        finalReportReady: state.finalReportReady || Boolean(message.finalReport),
      };
    case "research_map_snapshot":
      return {
        ...state,
        researchMapSnapshot: message.snapshot,
      };
    case "graph_snapshot":
      return {
        ...state,
        graphSnapshot: message.snapshot,
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
        reportSections:
          message.event.eventType === "report_section_ready"
            ? upsertReportSection(state.reportSections, message.event)
            : state.reportSections,
        finalReportReady:
          state.finalReportReady ||
          message.event.eventType === "report_ready",
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
  const hasReportSectionReady = state.receivedEvents.some(
    (event) => event.eventType === "report_section_ready",
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
    stageLabel = "Getting Started";
    stageDetail = "Sending your question and opening the research workspace.";
    statusTone = "running";
  } else if (state.connectionStatus === "connecting" && state.pendingSubmittedQuestion) {
    stageLabel = "Opening Live Desk";
    stageDetail =
      "Connecting to the live analysis stream and loading the first research snapshot.";
    statusTone = "running";
  } else if (state.connectionStatus === "error") {
    stageLabel = "Connection Error";
    stageDetail = state.errorMessage ?? "The feed could not be established.";
    statusTone = "failed";
  } else if (state.connectionStatus === "interrupted") {
    stageLabel = "Reconnecting";
    stageDetail =
      streamWarning ??
      "The live stream dropped for a moment. Your latest answer stays on screen while Delphi reconnects.";
    statusTone = "degraded";
  } else if (state.connectionStatus === "connecting" && state.run) {
    stageLabel = "Loading Context";
    stageDetail =
      "Loading the latest answer snapshot and specialist activity before live updates continue.";
    statusTone = "running";
  } else if (runStatus === "failed") {
    stageLabel = degradedReasons.length > 0 ? "Run Failed" : "Runtime Failed";
    stageDetail =
      degradedReasons[0] ??
      "The runtime failed before a usable structured report was produced.";
    statusTone = "failed";
  } else if (runStatus === "completed" || runStatus === "degraded" || hasReportReady) {
    stageLabel = degradedReasons.length > 0 ? "Partial Result" : "Answer Ready";
    stageDetail =
      degradedReasons.length > 0
        ? "The answer is usable, but some evidence or validation steps were incomplete."
        : "The final answer has been assembled and linked back to its supporting structure.";
    statusTone = degradedReasons.length > 0 ? "degraded" : "completed";
  } else if (hasJudgeStarted) {
    stageLabel = "Writing Answer";
    stageDetail = hasReportSectionReady
      ? "The answer is being published section by section."
      : "Delphi is turning the specialists' findings into one coherent answer.";
    statusTone = "running";
  } else if (activeCards.length > 0) {
    stageLabel = "Gathering Evidence";
    stageDetail = `${activeCards.map((card) => card.label).join(", ")} are actively updating the current view.`;
    statusTone = "running";
  } else if (hasPlan) {
    stageLabel = "Breaking Down The Question";
    stageDetail = "Delphi has split the question into company, liquidity, market, and synthesis work.";
    statusTone = "running";
  } else if (state.receivedEvents.length > 0) {
    stageLabel = "Question Received";
    stageDetail = "The research run is open and the first steps are now being prepared.";
    statusTone = "running";
  }

  return {
    ticker: state.run?.query.ticker ?? "AAPL",
    horizon: state.run?.query.timeHorizon ?? "3m",
    queryLabel:
      state.run?.query.userQuestion ??
      state.pendingSubmittedQuestion ??
      state.composerText,
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
  const hasPartialReport = state.reportSections.some(
    (section) => section.status !== "empty" || section.content.trim().length > 0,
  );
  const hasReport = state.finalReportReady || hasPartialReport;
  const isSynthesizing = state.receivedEvents.some(
    (event) => event.eventType === "judge_synthesis_started",
  );
  const runFailed = state.run?.status === "failed";

  const sections = hasReport
    ? state.reportSections.map((section) => {
        const citations = compactCitations(section);

        return {
          key: section.sectionKey,
          title: section.title,
          content: section.content,
          status:
            degradedReasons.length > 0 && !section.content
              ? "degraded"
              : section.status,
          citations,
          isSkeleton:
            !state.finalReportReady &&
            section.status === "empty" &&
            section.content.trim().length === 0,
          highlight: section.sectionKey === "final_judgment",
          emphasis: deriveReportSectionEmphasis(state.selectedInsight, section.sectionKey, citations, state),
        };
      })
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
        emphasis: deriveReportSectionEmphasis(state.selectedInsight, section.sectionKey, [], state),
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

export function selectResearchMapViewState(state: AppState): ResearchMapViewState {
  const snapshot =
    state.researchMapSnapshot ??
    deriveResearchMapSnapshot(
      state.run,
      state.reportSections,
      state.receivedEvents,
    );

  return {
    headline: snapshot.headline,
    summary: snapshot.summary,
    cards: snapshot.cards.map((card) => ({
      cardId: card.cardId,
      label: card.label,
      tone: card.tone,
      status: card.status,
      summary: card.summary,
      meta: summarizeResearchMapCardMeta(card),
      isPrimary: card.cardId === "current_view",
      emphasis: deriveResearchMapCardEmphasis(state.selectedInsight, card, state),
    })),
    evidenceTrail: snapshot.evidenceTrail,
    updatedAtLabel: snapshot.updatedAt ? formatTime(snapshot.updatedAt) : null,
  };
}

export function selectGraphSnapshotViewState(state: AppState): GraphSnapshotViewState {
  const snapshot =
    state.graphSnapshot ??
    deriveGraphSnapshot(state.run, state.reportSections, state.receivedEvents);
  const layout = layoutGraph(snapshot.nodes, snapshot.edges);
  const nodes = layout.nodes.map((node) => ({
    ...node,
    focus: deriveGraphNodeFocus(state.selectedInsight, node, state),
  }));
  const nodeFocusById = new Map(nodes.map((node) => [node.nodeId, node.focus]));

  const edges: GraphEdgeViewState[] = layout.edges.map((edge) => ({
    ...edge,
    focus:
      nodeFocusById.get(edge.fromNodeId) === "selected" ||
      nodeFocusById.get(edge.toNodeId) === "selected"
        ? ("selected" as const)
        : nodeFocusById.get(edge.fromNodeId) === "related" ||
            nodeFocusById.get(edge.toNodeId) === "related"
          ? ("related" as const)
          : ("none" as const),
  }));

  let selectedNodeDetail: GraphNodeDetail | null = null;
  if (
    state.selectedInsight?.kind === "graph_node"
  ) {
    const selectedId = state.selectedInsight.nodeId;
    const selectedRawNode = snapshot.nodes.find((n) => n.nodeId === selectedId);
    if (selectedRawNode) {
      const nodeLabels = new Map(snapshot.nodes.map((n) => [n.nodeId, n.label]));
      selectedNodeDetail = {
        nodeId: selectedRawNode.nodeId,
        label: selectedRawNode.label,
        kind: selectedRawNode.kind,
        emphasis: selectedRawNode.emphasis,
        summary: selectedRawNode.summary,
        incomingEdges: snapshot.edges
          .filter((e) => e.to === selectedId)
          .map((e) => ({ fromLabel: nodeLabels.get(e.from) ?? e.from, edgeLabel: e.label })),
        outgoingEdges: snapshot.edges
          .filter((e) => e.from === selectedId)
          .map((e) => ({ toLabel: nodeLabels.get(e.to) ?? e.to, edgeLabel: e.label })),
      };
    }
  }

  const maxY = nodes.reduce((max, n) => Math.max(max, n.y + n.height), 0);
  const maxX = nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0);
  const canvasWidth = Math.max(maxX + 80, 1680);
  const canvasHeight = Math.max(maxY + 80, 600);

  return {
    headline: snapshot.headline,
    summary: snapshot.summary,
    updatedAtLabel: snapshot.updatedAt ? formatTime(snapshot.updatedAt) : null,
    nodeCount: snapshot.nodes.length,
    edgeCount: snapshot.edges.length,
    nodes,
    edges,
    selectedNodeDetail,
    canvasWidth,
    canvasHeight,
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
        expanded: false,
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
        card.recentAction = stringPayload(event, "goal") ?? event.title;
        break;
      case "tool_started":
        card.status = "running";
        card.phaseLabel = "Running";
        card.recentAction = `Starting ${humanizeCapability(stringPayload(event, "capability") ?? "the next step")}.`;
        card.latestTool = humanizeCapability(
          stringPayload(event, "capability") ?? "the next step",
        );
        break;
      case "tool_finished":
        card.status = "running";
        card.phaseLabel = "Processing";
        card.recentAction = summarizeToolResult(event);
        card.latestTool = summarizeToolResult(event);
        break;
      case "finding_created": {
        card.status = "running";
        card.phaseLabel = "Writing Findings";
        card.recentAction = event.title;
        const claim = stringPayload(event, "claim") ?? "A finding was emitted.";
        const alignment = stringPayload(event, "priorAlignment");
        const alignmentTag = alignment && alignment !== "new" ? ` [${alignment}]` : "";
        card.latestFinding = `${claim}${alignmentTag}`;
        break;
      }
      case "patch_accepted":
        if (card.status !== "done") {
          card.status = "running";
          card.phaseLabel = "Validating";
        }
        card.recentAction = "Saved structured update.";
        card.latestPatch = "Saved";
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
        card.recentAction = "Weighing the specialist views.";
        break;
      case "report_section_ready":
        card.status = "running";
        card.phaseLabel = "Publishing";
        card.recentAction = summarizeReportSection(event) ?? event.title;
        card.latestPatch = `${reportSectionLabelFromEvent(event)} ready`;
        card.patchTone = "clean";
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
        card.recentAction = "Final report ready.";
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
        ? terminalLines.map((line) => ({
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
    card.expanded = state.expandedTerminalAgent === agent;

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

export function setWorkspaceSplitRatio(
  state: AppState,
  ratio: number,
): AppState {
  return {
    ...state,
    workspaceSplitRatio: ratio,
  };
}

export function toggleOutputPanel(
  state: AppState,
  panel: "report" | "research_map",
): AppState {
  return {
    ...state,
    activeOutputPanel: panel,
  };
}

export function toggleCanvasPanel(
  state: AppState,
  panel: "terminals" | "graph",
): AppState {
  return {
    ...state,
    activeCanvasPanel: panel,
  };
}

export function toggleInsightFocus(
  state: AppState,
  focus:
    | { kind: "report_section"; key: ReportSectionKey }
    | { kind: "research_card"; cardId: string }
    | { kind: "graph_node"; nodeId: string },
): AppState {
  const current = state.selectedInsight;
  const sameFocus =
    focus.kind === "report_section"
      ? current?.kind === "report_section" && current.key === focus.key
      : focus.kind === "research_card"
        ? current?.kind === "research_card" && current.cardId === focus.cardId
        : current?.kind === "graph_node" && current.nodeId === focus.nodeId;

  return {
    ...state,
    selectedInsight: sameFocus ? null : focus,
  };
}

export function toggleTerminalExpansion(
  state: AppState,
  agent: AgentKey,
): AppState {
  return {
    ...state,
    expandedTerminalAgent:
      state.expandedTerminalAgent === agent ? null : agent,
  };
}

export function setGraphZoom(state: AppState, zoom: number): AppState {
  return {
    ...state,
    graphZoom: Math.max(0.4, Math.min(2.0, zoom)),
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
    ...section.citationObjectRefs,
  ].slice(0, 6);
}

function stringPayload(event: RunEvent, key: string): string | null {
  const value = event.payload[key];
  return typeof value === "string" ? value : null;
}

function upsertReportSection(
  sections: ReportSectionRecord[],
  event: RunEvent,
): ReportSectionRecord[] {
  const update = readReportSectionUpdate(event);

  if (!update) {
    return sections;
  }

  const index = sections.findIndex((section) => section.sectionKey === update.sectionKey);

  if (index === -1) {
    return sections;
  }

  const next = [...sections];
  const existing = next[index];

  if (!existing) {
    return sections;
  }

  next[index] = mergeReportSection(existing, update);
  return next;
}

function mergeReportSection(
  existing: ReportSectionRecord,
  update: Partial<ReportSectionRecord> & Pick<ReportSectionRecord, "sectionKey">,
): ReportSectionRecord {
  return {
    ...existing,
    ...update,
    sectionId: update.sectionId ?? existing.sectionId,
    runId: existing.runId,
    sectionKey: existing.sectionKey,
    title: update.title ?? existing.title,
    content: update.content ?? existing.content,
    citationFindingRefs: update.citationFindingRefs ?? existing.citationFindingRefs,
    citationEvidenceRefs: update.citationEvidenceRefs ?? existing.citationEvidenceRefs,
    citationObjectRefs: update.citationObjectRefs ?? existing.citationObjectRefs,
    status: update.status ?? existing.status,
  };
}

function readReportSectionUpdate(
  event: RunEvent,
): (Partial<ReportSectionRecord> & Pick<ReportSectionRecord, "sectionKey">) | null {
  const payload = readRecord(event.payload.section) ?? event.payload;
  const sectionKey = recordStringPayload(payload, "sectionKey");

  if (!sectionKey || !reportSectionKeys.includes(sectionKey as ReportSectionKey)) {
    return null;
  }

  const content = recordStringPayload(payload, "content");

  if (content === null) {
    return null;
  }

  return {
    sectionKey: sectionKey as ReportSectionKey,
    ...(recordStringPayload(payload, "sectionId")
      ? { sectionId: recordStringPayload(payload, "sectionId") ?? "" }
      : {}),
    ...(recordStringPayload(payload, "title")
      ? { title: recordStringPayload(payload, "title") ?? "" }
      : {}),
    content,
    ...(recordStringArrayPayload(payload, "citationFindingRefs")
      ? {
          citationFindingRefs: recordStringArrayPayload(payload, "citationFindingRefs") ?? [],
        }
      : {}),
    ...(recordStringArrayPayload(payload, "citationEvidenceRefs")
      ? {
          citationEvidenceRefs: recordStringArrayPayload(payload, "citationEvidenceRefs") ?? [],
        }
      : {}),
    ...(recordStringArrayPayload(payload, "citationObjectRefs")
      ? {
          citationObjectRefs: recordStringArrayPayload(payload, "citationObjectRefs") ?? [],
        }
      : {}),
    status: normalizeReportSectionStatus(recordStringPayload(payload, "status")),
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function recordStringPayload(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
}

function recordStringArrayPayload(
  value: Record<string, unknown>,
  key: string,
): string[] | null {
  const candidate = value[key];

  if (!Array.isArray(candidate)) {
    return null;
  }

  const strings = candidate.filter((item): item is string => typeof item === "string");

  return strings.length === candidate.length ? strings : null;
}

function normalizeReportSectionStatus(
  value: string | null,
): ReportSectionStatus {
  switch (value) {
    case "ready":
    case "empty":
    case "degraded":
      return value;
    default:
      return "ready";
  }
}

function summarizeReportSection(event: RunEvent): string | null {
  const payload = readRecord(event.payload.section) ?? event.payload;
  const sectionKey = recordStringPayload(payload, "sectionKey");

  if (!sectionKey || !reportSectionKeys.includes(sectionKey as ReportSectionKey)) {
    return null;
  }

  const label = reportSectionLabel(sectionKey as ReportSectionKey, payload);
  return `${label} section ready.`;
}

function reportSectionLabelFromEvent(event: RunEvent): string {
  const payload = readRecord(event.payload.section) ?? event.payload;
  const sectionKey = recordStringPayload(payload, "sectionKey");

  if (!sectionKey || !reportSectionKeys.includes(sectionKey as ReportSectionKey)) {
    return "report section";
  }

  return reportSectionLabel(sectionKey as ReportSectionKey, payload);
}

function reportSectionLabel(
  sectionKey: ReportSectionKey,
  payload: Record<string, unknown> | null = null,
): string {
  if (payload) {
    const title = recordStringPayload(payload, "title");
    if (title) {
      return title;
    }
  }

  return reportSectionTitles[sectionKey];
}

function summarizeToolResult(event: RunEvent): string {
  const capability = stringPayload(event, "capability") ?? "the next step";

  if (typeof event.payload.newsCount === "number") {
    return `Reviewed ${event.payload.newsCount} news items.`;
  }

  if (typeof event.payload.latestPrice === "number") {
    return `Latest price read: ${event.payload.latestPrice.toFixed(2)}.`;
  }

  if (typeof stringPayload(event, "regimeLabel") === "string") {
    return `Read the regime as ${stringPayload(event, "regimeLabel")}.`;
  }

  return `Finished ${humanizeCapability(capability)}.`;
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
      return `Starting ${humanizeCapability(stringPayload(event, "capability") ?? "the next step")}.`;
    case "tool_finished":
      return summarizeToolResult(event);
    case "finding_created":
      return stringPayload(event, "claim") ?? "Finding created.";
    case "patch_accepted":
      return "Saved the latest structured update.";
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
    case "report_section_ready":
      return summarizeReportSection(event) ?? "Report section ready.";
    case "report_ready":
      return stringPayload(event, "reportId") ?? "Final report ready.";
    default:
      return event.title;
  }
}

function buildTranscriptLines(
  events: readonly RunEvent[],
): TerminalLineState[] {
  return events.map((event) => ({
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
      return "Synthesizing the answer from the specialist findings.";
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
    case "report_section_ready":
      return summarizeReportSection(event) ?? "report section ready";
    case "report_ready":
      return "Final report ready.";
    default:
      return event.title;
  }
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

function terminalTone(
  event: RunEvent,
): TerminalLineState["tone"] {
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

function deriveResearchMapSnapshot(
  run: RunRecord | null,
  reportSections: readonly ReportSectionRecord[],
  events: readonly RunEvent[],
): ResearchMapSnapshot {
  const latestFindings = collectLatestFindingClaims(events);
  const finalJudgment = findSection(reportSections, "final_judgment");
  const coreThesis = findSection(reportSections, "core_thesis");
  const liquidityContext = findSection(reportSections, "liquidity_context");
  const keyRisks = findSection(reportSections, "key_risks");
  const watchpoints = findSection(reportSections, "what_changes_the_view");
  const supportingEvidence = findSection(reportSections, "supporting_evidence");

  return {
    runId: run?.runId ?? "run:pending",
    caseId: run?.caseId ?? "case:pending",
    status: run?.status ?? "created",
    headline: summarizeLeadText(
      finalJudgment.content.trim() || supportingEvidence.content.trim(),
      "Delphi is still assembling the current view.",
    ),
    summary:
      run?.status === "completed" || run?.status === "degraded"
        ? "Current view: thesis, market signal, liquidity, and the evidence trail."
        : "This map updates as each research lane contributes to the final view.",
    updatedAt: run?.updatedAt ?? "",
    cards: [
      createResearchMapCard("current_view", "Current View", "primary", finalJudgment, run?.status, latestFindings.thesis ?? latestFindings.market_signal ?? latestFindings.liquidity),
      createResearchMapCard("core_thesis", "Core Thesis", "supporting", coreThesis, run?.status, latestFindings.thesis),
      createResearchMapCard("market_signal", "Market Signal", "signal", createEmptyResearchMapSection("Market Signal"), run?.status, latestFindings.market_signal),
      createResearchMapCard(
        "liquidity_context",
        "Liquidity Context",
        "supporting",
        liquidityContext,
        run?.status,
        latestFindings.liquidity,
      ),
      createResearchMapCard("key_risks", "Key Risks", "caution", keyRisks, run?.status),
      createResearchMapCard(
        "watchpoints",
        "What Would Change the View",
        "watch",
        watchpoints,
        run?.status,
      ),
    ],
    evidenceTrail: [
      ...supportingEvidence.citationFindingRefs,
      ...supportingEvidence.citationEvidenceRefs,
      ...supportingEvidence.citationObjectRefs,
    ].slice(0, 8),
  };
}

function deriveGraphSnapshot(
  run: RunRecord | null,
  reportSections: readonly ReportSectionRecord[],
  events: readonly RunEvent[],
): GraphSnapshot {
  const nodes = new Map<string, GraphSnapshotNode>();
  const edges = new Map<string, GraphSnapshotEdge>();
  const caseId = run?.caseId ?? "case:pending";
  const finalJudgment = findSection(reportSections, "final_judgment");

  const putNode = (node: GraphSnapshotNode): void => {
    if (!nodes.has(node.nodeId)) {
      nodes.set(node.nodeId, node);
    }
  };

  const putEdge = (edge: GraphSnapshotEdge): void => {
    if (!edges.has(edge.edgeId)) {
      edges.set(edge.edgeId, edge);
    }
  };

    putNode({
      nodeId: caseId,
      label: run ? `${run.query.ticker} · ${run.query.timeHorizon}` : "Current Case",
      kind: "case",
      summary: run?.query.userQuestion ?? "Waiting for a live run.",
    emphasis: "primary",
  });

  for (const section of reportSections) {
    if (section.content.trim().length === 0 && section.status === "empty") {
      continue;
    }

    putNode({
      nodeId: section.sectionId,
      label: section.title,
      kind: "section",
      summary: section.content.trim() || `${section.title} is still being assembled.`,
      emphasis: section.sectionKey === "final_judgment" ? "primary" : "supporting",
    });
    putEdge({
      edgeId: `edge:${caseId}:${section.sectionId}:section`,
      from: caseId,
      to: section.sectionId,
      label: "section",
    });

    for (const findingRef of section.citationFindingRefs) {
      const finding = findFindingById(events, findingRef);
      putNode({
        nodeId: findingRef,
        label: formatGraphFindingLabel(finding?.agentType),
        kind: "finding",
        summary:
          finding?.claim ?? "A structured research point feeding the current answer.",
        emphasis: "supporting",
      });
      putEdge({
        edgeId: `edge:${section.sectionId}:${findingRef}:finding`,
        from: section.sectionId,
        to: findingRef,
        label: "cites",
      });
    }

    for (const objectRef of section.citationObjectRefs) {
      putNode({
        nodeId: objectRef,
        label: formatGraphObjectLabel(objectRef),
        kind: "object",
        summary: summarizeGraphObjectRef(objectRef),
        emphasis: objectRef.startsWith("risk:") ? "caution" : "supporting",
      });
      putEdge({
        edgeId: `edge:${section.sectionId}:${objectRef}:object`,
        from: section.sectionId,
        to: objectRef,
        label: "tracks",
      });
    }

    for (const evidenceRef of section.citationEvidenceRefs) {
      putNode({
        nodeId: evidenceRef,
        label: "Supporting Evidence",
        kind: "evidence",
        summary: "Evidence captured during the run and linked back to the answer.",
        emphasis: "neutral",
      });
      putEdge({
        edgeId: `edge:${section.sectionId}:${evidenceRef}:evidence`,
        from: section.sectionId,
        to: evidenceRef,
        label: "grounds",
      });
    }
  }

  return {
    runId: run?.runId ?? "run:pending",
    caseId,
    status: run?.status ?? "created",
    headline:
      finalJudgment.content.trim() ||
      "This structure updates as Delphi connects the current investment case.",
    summary:
      "This view shows how Delphi links the case, the live report sections, the key findings, and the supporting evidence behind the current answer.",
    updatedAt: run?.updatedAt ?? "",
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
}

function formatGraphFindingLabel(agentType?: string): string {
  if (agentType === "thesis") return "Core Thesis";
  if (agentType === "liquidity") return "Liquidity Read";
  if (agentType === "market_signal") return "Market Signal";
  if (agentType === "judge") return "Judge Synthesis";
  return "Research Finding";
}

function findFindingById(
  events: readonly RunEvent[],
  findingId: string,
): { claim: string; agentType: string } | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (!event || event.eventType !== "finding_created") {
      continue;
    }

    if (stringPayload(event, "findingId") !== findingId) {
      continue;
    }

    return {
      claim: stringPayload(event, "claim") ?? findingId,
      agentType: stringPayload(event, "agentType") ?? "agent",
    };
  }

  return null;
}

function formatGraphObjectLabel(objectRef: string): string {
  if (objectRef.startsWith("thesis:")) return "Core Thesis";
  if (objectRef.startsWith("risk:")) return "Key Risk";
  if (objectRef.startsWith("liquidityregime:")) return "Liquidity Context";
  if (objectRef.startsWith("liquidityfactor:")) return "Liquidity Factor";
  if (objectRef.startsWith("macroactoraction:")) return "Macro Driver";
  if (objectRef.startsWith("marketsignal:")) return "Market Signal";
  if (objectRef.startsWith("judgment:")) return "Stored View";
  return "Structured Insight";
}

function summarizeGraphObjectRef(objectRef: string): string {
  if (objectRef.startsWith("thesis:")) {
    return "The durable thesis object supporting the current investment view.";
  }

  if (objectRef.startsWith("risk:")) {
    return "A persistent risk object that can weaken the current view.";
  }

  if (objectRef.startsWith("liquidityregime:")) {
    return "The liquidity regime Delphi believes is shaping positioning risk.";
  }

  if (objectRef.startsWith("liquidityfactor:")) {
    return "A liquidity factor influencing the near-term setup.";
  }

  if (objectRef.startsWith("macroactoraction:")) {
    return "A macro driver or policy action feeding the liquidity read.";
  }

  if (objectRef.startsWith("marketsignal:")) {
    return "A market signal object tied to trend, positioning, or sentiment.";
  }

  if (objectRef.startsWith("judgment:")) {
    return "A stored judgment from this case that can be reused later.";
  }

  return "A structured research object linked to this run.";
}

function layoutGraph(
  nodes: readonly GraphSnapshotNode[],
  edges: readonly GraphSnapshotEdge[],
): {
  nodes: GraphNodeViewState[];
  edges: GraphEdgeViewState[];
} {
  const laneOrder: GraphSnapshotNode["kind"][] = [
    "case",
    "section",
    "finding",
    "object",
    "evidence",
  ];
  const xByLane: Record<GraphSnapshotNode["kind"], number> = {
    case: 140,
    section: 430,
    finding: 770,
    object: 1110,
    evidence: 1430,
  };
  const widthByLane: Record<GraphSnapshotNode["kind"], number> = {
    case: 240,
    section: 250,
    finding: 250,
    object: 230,
    evidence: 210,
  };
  const grouped = new Map<GraphSnapshotNode["kind"], GraphSnapshotNode[]>();

  for (const lane of laneOrder) {
    grouped.set(lane, []);
  }

  for (const node of nodes) {
    grouped.get(node.kind)?.push(node);
  }

  const laidOutNodes: GraphNodeViewState[] = [];

  for (const lane of laneOrder) {
    const laneNodes = grouped.get(lane) ?? [];
    laneNodes.forEach((node, index) => {
      const width = widthByLane[lane];
      const height = lane === "case" ? 100 : 92;
      laidOutNodes.push({
        nodeId: node.nodeId,
        label: node.label,
        kind: node.kind,
        summary: truncateLong(node.summary, lane === "case" ? 160 : 130),
        x: xByLane[lane],
        y: 64 + index * 120,
        width,
        height,
        emphasis: node.emphasis,
        focus: "none",
      });
    });
  }

  const nodeById = new Map(laidOutNodes.map((node) => [node.nodeId, node]));
  const laidOutEdges: GraphEdgeViewState[] = edges.flatMap((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);

    if (!from || !to) {
      return [];
    }

    return [{
      edgeId: edge.edgeId,
      fromNodeId: edge.from,
      toNodeId: edge.to,
      fromX: from.x + from.width,
      fromY: from.y + from.height / 2,
      toX: to.x,
      toY: to.y + to.height / 2,
      label: edge.label,
      focus: "none",
    }];
  });

  return {
    nodes: laidOutNodes,
    edges: laidOutEdges,
  };
}

function createResearchMapCard(
  cardId: string,
  label: string,
  tone: ResearchMapTone,
  section: ReportSectionRecord,
  runStatus?: RunRecord["status"],
  fallback?: {
    claim: string;
    findingRefs: string[];
    evidenceRefs: string[];
    objectRefs: string[];
  },
): ResearchMapCard {
  const summary = section.content.trim();
  const fallbackSummary = fallback?.claim.trim() ?? "";
  const isSettledRun = runStatus === "completed" || runStatus === "degraded";
  const isReady =
    section.status === "ready" ||
    (isSettledRun && (summary.length > 0 || fallbackSummary.length > 0));

  return {
    cardId,
    label,
    tone,
    status: isReady ? "ready" : summary.length > 0 || fallbackSummary.length > 0 ? "partial" : "waiting",
    summary: summary || fallbackSummary || `${label} is still being assembled.`,
    findingRefs: section.citationFindingRefs.length > 0 ? section.citationFindingRefs : fallback?.findingRefs ?? [],
    evidenceRefs: section.citationEvidenceRefs.length > 0 ? section.citationEvidenceRefs : fallback?.evidenceRefs ?? [],
    objectRefs: section.citationObjectRefs.length > 0 ? section.citationObjectRefs : fallback?.objectRefs ?? [],
  };
}

function createEmptyResearchMapSection(title: string): ReportSectionRecord {
  return {
    sectionId: `section:pending:${title.toLowerCase().replace(/\s+/g, "_")}`,
    runId: "run:pending",
    sectionKey: "supporting_evidence",
    title,
    content: "",
    citationFindingRefs: [],
    citationEvidenceRefs: [],
    citationObjectRefs: [],
    status: "empty",
  };
}

function collectLatestFindingClaims(
  events: readonly RunEvent[],
): Partial<
  Record<
    "thesis" | "liquidity" | "market_signal",
    { claim: string; findingRefs: string[]; evidenceRefs: string[]; objectRefs: string[] }
  >
> {
  const latest: Partial<
    Record<
      "thesis" | "liquidity" | "market_signal",
      { claim: string; findingRefs: string[]; evidenceRefs: string[]; objectRefs: string[] }
    >
  > = {};

  for (const event of events) {
    if (event.eventType !== "finding_created") {
      continue;
    }

    const agent = stringPayload(event, "agentType");
    const claim = stringPayload(event, "claim");

    if (
      (agent === "thesis" ||
        agent === "liquidity" ||
        agent === "market_signal") &&
      claim
    ) {
      latest[agent] = {
        claim,
        findingRefs: stringPayload(event, "findingId")
          ? [stringPayload(event, "findingId") as string]
          : [],
        evidenceRefs: readStringArrayFromPayload(event.payload, "evidenceRefs"),
        objectRefs: readStringArrayFromPayload(event.payload, "objectRefs"),
      };
    }
  }

  return latest;
}

function findSection(
  sections: readonly ReportSectionRecord[],
  sectionKey: ReportSectionKey,
): ReportSectionRecord {
  return (
    sections.find((section) => section.sectionKey === sectionKey) ??
    createEmptySections()[reportSectionKeys.indexOf(sectionKey)]!
  );
}

function summarizeResearchMapCardMeta(card: ResearchMapCard): string {
  const parts = [
    card.findingRefs.length > 0 ? `${card.findingRefs.length} signal` : null,
    card.evidenceRefs.length > 0 ? `${card.evidenceRefs.length} source` : null,
    card.objectRefs.length > 0 ? `${card.objectRefs.length} linked view` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : "Live view";
}

function summarizeLeadText(value: string, fallback: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return fallback;
  }

  const normalized = trimmed.replace(/^Verdict:\s*/i, "").trim();
  const sentenceEnd = normalized.search(/[.!?](?:\s|$)/);

  if (sentenceEnd > 0 && sentenceEnd < 180) {
    return normalized.slice(0, sentenceEnd + 1).trim();
  }

  return normalized.length > 180 ? `${normalized.slice(0, 177).trim()}…` : normalized;
}

function deriveReportSectionEmphasis(
  selectedInsight: AppState["selectedInsight"],
  sectionKey: ReportSectionKey,
  citations: readonly string[],
  state: AppState,
): ReportSectionViewState["emphasis"] {
  if (!selectedInsight) {
    return "none";
  }

  if (
    selectedInsight.kind === "report_section" &&
    selectedInsight.key === sectionKey
  ) {
    return "selected";
  }

  if (selectedInsight.kind === "research_card") {
    const card = findResearchMapCard(state, selectedInsight.cardId);

    if (card && hasSharedRef(citations, collectResearchCardRefs(card))) {
      return "related";
    }
  }

  if (selectedInsight.kind === "graph_node") {
    const section = state.reportSections.find((current) => current.sectionKey === sectionKey);

    if (section && sectionMatchesGraphNode(section, selectedInsight.nodeId, state.run?.caseId ?? null)) {
      return "related";
    }
  }

  return "none";
}

function deriveResearchMapCardEmphasis(
  selectedInsight: AppState["selectedInsight"],
  card: ResearchMapCard,
  state: AppState,
): ResearchMapCardViewState["emphasis"] {
  if (!selectedInsight) {
    return "none";
  }

  if (
    selectedInsight.kind === "research_card" &&
    selectedInsight.cardId === card.cardId
  ) {
    return "selected";
  }

  if (selectedInsight.kind === "report_section") {
    const section = state.reportSections.find(
      (current) => current.sectionKey === selectedInsight.key,
    );

    if (section && hasSharedRef(compactCitations(section), collectResearchCardRefs(card))) {
      return "related";
    }
  }

  if (selectedInsight.kind === "graph_node") {
    if (collectResearchCardRefs(card).includes(selectedInsight.nodeId)) {
      return "related";
    }
  }

  return "none";
}

function deriveGraphNodeFocus(
  selectedInsight: AppState["selectedInsight"],
  node: GraphNodeViewState,
  state: AppState,
): GraphNodeViewState["focus"] {
  if (!selectedInsight) {
    return "none";
  }

  if (selectedInsight.kind === "graph_node") {
    return selectedInsight.nodeId === node.nodeId ? "selected" : "none";
  }

  if (selectedInsight.kind === "report_section") {
    const section = state.reportSections.find(
      (current) => current.sectionKey === selectedInsight.key,
    );

    if (section && sectionMatchesGraphNode(section, node.nodeId, state.run?.caseId ?? null)) {
      return "related";
    }
  }

  if (selectedInsight.kind === "research_card") {
    const card = findResearchMapCard(state, selectedInsight.cardId);

    if (card && collectResearchCardRefs(card).includes(node.nodeId)) {
      return "related";
    }
  }

  return "none";
}

function findResearchMapCard(
  state: AppState,
  cardId: string,
): ResearchMapCard | null {
  const snapshot =
    state.researchMapSnapshot ??
    deriveResearchMapSnapshot(state.run, state.reportSections, state.receivedEvents);

  return snapshot.cards.find((card) => card.cardId === cardId) ?? null;
}

function collectResearchCardRefs(card: ResearchMapCard): string[] {
  return [...card.findingRefs, ...card.evidenceRefs, ...card.objectRefs];
}

function sectionMatchesGraphNode(
  section: ReportSectionRecord,
  nodeId: string,
  caseId: string | null,
): boolean {
  if (section.sectionId === nodeId) {
    return true;
  }

  if (caseId && caseId === nodeId) {
    return true;
  }

  return compactCitations(section).includes(nodeId);
}

function hasSharedRef(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function readStringArrayFromPayload(
  payload: Record<string, unknown>,
  key: string,
): string[] {
  const value = payload[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
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
