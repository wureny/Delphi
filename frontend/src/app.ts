import {
  createRecordedFeedSource,
  createRuntimeRun,
  createSseFeedSource,
  type FeedConnection,
  type FeedMessage,
  type FeedMode,
  resolveRuntimeEndpoint,
  type RunFeedSource,
} from "./feeds.js";
import {
  renderDialogueFeed,
  renderApp,
  renderGraphSnapshot,
  renderRailMeta,
  renderReportSection,
  renderTerminalLine,
  renderTerminalLines,
  renderTimelineList,
} from "./render.js";
import {
  agentKeys,
  type AgentKey,
  reportSectionKeys,
  type ReportSectionKey,
  type TerminalStreamChunk,
} from "./run-contract.js";
import {
  createInitialState,
  createRestartState,
  reduceFeedMessage,
  renderComposerButtonLabel,
  selectGraphSnapshotViewState,
  selectResearchMapViewState,
  selectAgentCardStates,
  selectReportViewState,
  selectRunViewState,
  selectTimelineState,
  setWorkspaceSplitRatio,
  toggleCanvas,
  toggleCanvasPanel,
  toggleInsightFocus,
  toggleTerminalExpansion,
  updateComposerText,
  type AppState,
  type TerminalLineState,
} from "./state.js";

export interface DelphiAppConfig {
  root: HTMLElement;
  feedMode: FeedMode;
  recordedFixtureUrl: string;
  runtimeApiBaseUrl?: string;
  runtimeRunKey?: string;
  sseEventsUrl?: string;
  sseSnapshotUrl?: string;
  sseResearchMapUrl?: string;
  sseGraphSnapshotUrl?: string;
  sseTerminalsUrl?: string;
  sseTerminalStreamUrl?: string;
}

export class DelphiFrontendApp {
  private state: AppState;
  private readonly root: HTMLElement;
  private readonly config: DelphiAppConfig;
  private connection: FeedConnection | null = null;
  private readonly pausedTerminalAgents = new Set<AgentKey>();
  private readonly renderedTerminalLineIds = new Map<AgentKey, Set<string>>();
  private pauseDialogueAutoscroll = false;
  private lastInsightScrollTarget: string | null = null;
  private lastGraphFocusTarget: string | null = null;
  private graphPanState:
    | {
        stage: HTMLElement;
        pointerId: number;
        startX: number;
        startY: number;
        startLeft: number;
        startTop: number;
        moved: boolean;
      }
    | null = null;
  private dividerResizeState:
    | {
        shell: HTMLElement;
        divider: HTMLElement;
        pointerId: number;
        startX: number;
        startRatio: number;
      }
    | null = null;
  private ignoreGraphClickUntil = 0;
  private lastManualGraphPanAt = 0;

  constructor(config: DelphiAppConfig) {
    this.config = config;
    this.root = config.root;
    this.state = createInitialState(
      config.feedMode,
      buildFeedInfoMessage(config),
    );
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  mount(): void {
    this.root.addEventListener("submit", this.handleSubmit);
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("input", this.handleInput);
    this.root.addEventListener("scroll", this.handleScroll, true);
    this.root.addEventListener("keydown", this.handleKeyDown);
    this.root.addEventListener("pointerdown", this.handlePointerDown);
    this.root.addEventListener("pointermove", this.handlePointerMove);
    this.root.addEventListener("pointerup", this.handlePointerUp);
    this.root.addEventListener("pointercancel", this.handlePointerUp);
    this.renderShell();

    if (this.shouldAutoStartFeed()) {
      this.startFeed();
    }
  }

  private startFeed(): void {
    this.connection?.close();
    this.connection = null;
    this.resetTerminalUiState();
    this.state = createRestartState(
      this.state,
      buildFeedInfoMessage(this.config),
    );
    this.renderShell();

    const source = this.createFeedSource();
    this.connection = source.connect({
      onMessage: (message) => {
        this.applyFeedMessage(message);
      },
    });
  }

  private applyFeedMessage(message: FeedMessage): void {
    this.state = reduceFeedMessage(this.state, message);

    if (message.kind === "terminal_chunk") {
      this.syncView({
        appendTerminalChunk: message.chunk,
      });
      return;
    }

    const reportSectionKey =
      message.kind === "event" && message.event.eventType === "report_section_ready"
        ? readReportSectionKey(message.event.payload.sectionKey)
        : undefined;

    this.syncView({
      forceTerminalRefresh: message.kind === "terminal_snapshot",
      ...(reportSectionKey ? { reportSectionKey } : {}),
    });
  }

  private createFeedSource(): RunFeedSource {
    if (this.config.feedMode === "sse") {
      if (!this.config.sseEventsUrl) {
        return {
          connect: (handlers) => {
            handlers.onMessage({
              kind: "connected",
              label: "Live SSE Feed",
            });
            handlers.onMessage({
              kind: "error",
              message:
                "Live mode needs a run events endpoint. Submit a query first, or pass `?source=sse&run=<id>` / `?events=/runs/<id>/events`.",
            });

            return {
              close() {},
            };
          },
        };
      }

      return createSseFeedSource({
        eventsUrl: this.config.sseEventsUrl,
        ...(this.config.sseSnapshotUrl
          ? { snapshotUrl: this.config.sseSnapshotUrl }
          : {}),
        ...(this.config.sseResearchMapUrl
          ? { researchMapUrl: this.config.sseResearchMapUrl }
          : {}),
        ...(this.config.sseGraphSnapshotUrl
          ? { graphSnapshotUrl: this.config.sseGraphSnapshotUrl }
          : {}),
        ...(this.config.sseTerminalsUrl
          ? { terminalsUrl: this.config.sseTerminalsUrl }
          : {}),
        ...(this.config.sseTerminalStreamUrl
          ? { terminalStreamUrl: this.config.sseTerminalStreamUrl }
          : {}),
      });
    }

    return createRecordedFeedSource({
      fixtureUrl: this.config.recordedFixtureUrl,
    });
  }

  private handleSubmit(event: Event): void {
    const form = event.target;

    if (!(form instanceof HTMLFormElement) || form.dataset.role !== "query-form") {
      return;
    }

    event.preventDefault();

    if (this.config.feedMode === "sse") {
      void this.submitLiveRun();
      return;
    }

    this.startFeed();
  }

  private handleClick(event: Event): void {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const actionNode = target.closest("[data-action]");

    if (!(actionNode instanceof HTMLElement) && !(actionNode instanceof SVGElement)) {
      return;
    }

    if (
      Date.now() < this.ignoreGraphClickUntil &&
      actionNode.closest(".graph-stage")
    ) {
      return;
    }

    if (actionNode.dataset.action === "toggle-canvas") {
      this.state = toggleCanvas(this.state);
      this.renderShell();
      return;
    }

    if (actionNode.dataset.action === "apply-example-query") {
      const exampleQuery = actionNode.dataset.exampleQuery;

      if (!exampleQuery) {
        return;
      }

      this.state = updateComposerText(this.state, exampleQuery);
      this.renderShell();
      this.root.querySelector<HTMLTextAreaElement>("#query-input")?.focus();
      return;
    }

    if (actionNode.dataset.action === "toggle-terminal") {
      const agent = actionNode.dataset.agent;

      if (!isAgentKey(agent)) {
        return;
      }

      this.state = toggleTerminalExpansion(this.state, agent);
      this.renderShell();
      return;
    }

    if (actionNode.dataset.action === "toggle-canvas-panel") {
      const panel = actionNode.dataset.panel;

      if (panel !== "terminals" && panel !== "graph") {
        return;
      }

      this.state = toggleCanvasPanel(this.state, panel);
      this.renderShell();
      return;
    }

    if (actionNode.dataset.action === "center-graph") {
      const graphStage = this.root.querySelector<HTMLElement>(".graph-stage");

      if (!graphStage) {
        return;
      }

      this.centerGraphStage(graphStage);
      return;
    }

    if (actionNode.dataset.action === "toggle-insight-focus") {
      const focusKind = actionNode.dataset.focusKind;

      if (focusKind === "report_section") {
        const sectionKey = actionNode.dataset.sectionKey;

        if (
          !sectionKey ||
          !reportSectionKeys.includes(sectionKey as (typeof reportSectionKeys)[number])
        ) {
          return;
        }

        this.state = toggleInsightFocus(this.state, {
          kind: "report_section",
          key: sectionKey as (typeof reportSectionKeys)[number],
        });
        this.syncView();
        return;
      }

      if (focusKind === "research_card") {
        const cardId = actionNode.dataset.cardId;

        if (!cardId) {
          return;
        }

        this.state = toggleInsightFocus(this.state, {
          kind: "research_card",
          cardId,
        });
        this.syncView();
        return;
      }

      if (focusKind === "graph_node") {
        const nodeId = actionNode.dataset.nodeId;

        if (!nodeId) {
          return;
        }

        this.state = toggleInsightFocus(this.state, {
          kind: "graph_node",
          nodeId,
        });
        this.syncView();
      }
    }

  }

  private handleInput(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLTextAreaElement) || target.name !== "question") {
      return;
    }

    this.state = updateComposerText(this.state, target.value);
    resizeComposerInput(target);
  }

  private handleScroll(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const followThreshold = 18;

    if (target.dataset.role === "dialogue-feed") {
      this.pauseDialogueAutoscroll =
        target.scrollHeight - target.scrollTop - target.clientHeight > followThreshold;
      return;
    }

    if (target.dataset.role !== "terminal-scroll") {
      return;
    }

    const agent = target.dataset.agent;

    if (!isAgentKey(agent)) {
      return;
    }

    const isNearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight <= followThreshold;

    if (isNearBottom) {
      this.pausedTerminalAgents.delete(agent);
    } else {
      this.pausedTerminalAgents.add(agent);
    }

  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement) && !(target instanceof SVGElement)) {
      return;
    }

    const actionNode = target.closest("[data-action]");

    if (!(actionNode instanceof HTMLElement) && !(actionNode instanceof SVGElement)) {
      return;
    }

    event.preventDefault();
    actionNode.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
      }),
    );
  }

  private shouldAutoStartFeed(): boolean {
    return this.config.feedMode === "recorded" || Boolean(this.config.sseEventsUrl);
  }

  private async submitLiveRun(): Promise<void> {
    const userQuestion = this.state.composerText.trim();

    if (!userQuestion) {
      this.state = {
        ...this.state,
        errorMessage: "Question is required before creating a live run.",
      };
      this.syncView();
      return;
    }

    if (!this.config.runtimeApiBaseUrl) {
      this.state = {
        ...this.state,
        errorMessage: "Missing runtime API base URL for live submission.",
      };
      this.syncView();
      return;
    }

    this.connection?.close();
    this.connection = null;
    this.resetTerminalUiState();
    this.state = {
      ...createRestartState(
        this.state,
        "Starting a fresh live analysis.",
      ),
      composerText: "",
      pendingSubmittedQuestion: userQuestion,
      connectionStatus: "creating",
    };
    this.renderShell();

    try {
      const submission = await createRuntimeRun({
        runtimeApiBaseUrl: this.config.runtimeApiBaseUrl,
        payload: {
          query: {
            userQuestion,
          },
        },
      });

      this.config.runtimeRunKey = submission.runKey;
      this.config.sseEventsUrl = resolveRuntimeEndpoint(
        this.config.runtimeApiBaseUrl,
        submission.endpoints.events,
      );
      this.config.sseSnapshotUrl = resolveRuntimeEndpoint(
        this.config.runtimeApiBaseUrl,
        submission.endpoints.report,
      );
      this.config.sseResearchMapUrl = resolveRuntimeEndpoint(
        this.config.runtimeApiBaseUrl,
        submission.endpoints.researchMap,
      );
      this.config.sseGraphSnapshotUrl = resolveRuntimeEndpoint(
        this.config.runtimeApiBaseUrl,
        submission.endpoints.graphSnapshot,
      );
      this.config.sseTerminalsUrl = resolveRuntimeEndpoint(
        this.config.runtimeApiBaseUrl,
        submission.endpoints.terminals,
      );
      this.config.sseTerminalStreamUrl = resolveRuntimeEndpoint(
        this.config.runtimeApiBaseUrl,
        submission.endpoints.terminalStream,
      );

      syncLiveLocation(this.config.runtimeApiBaseUrl, submission.runKey);
      this.startFeed();
    } catch (error) {
      this.state = {
        ...this.state,
        composerText: userQuestion,
        pendingSubmittedQuestion: null,
        connectionStatus: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Live run submission failed.",
      };
      this.syncView();
    }
  }

  private handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const divider = target.closest<HTMLElement>('[data-role="workspace-divider"]');

    if (divider) {
      const shell = divider.closest<HTMLElement>(".workspace-shell");

      if (!shell) {
        return;
      }

      this.dividerResizeState = {
        shell,
        divider,
        pointerId: event.pointerId,
        startX: event.clientX,
        startRatio: this.state.workspaceSplitRatio,
      };
      divider.classList.add("is-dragging");
      divider.setPointerCapture(event.pointerId);
      return;
    }

    const stage = target.closest<HTMLElement>(".graph-stage");

    if (!stage) {
      return;
    }

    this.graphPanState = {
      stage,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: stage.scrollLeft,
      startTop: stage.scrollTop,
      moved: false,
    };
    stage.classList.add("is-panning");
    stage.setPointerCapture(event.pointerId);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (this.dividerResizeState && this.dividerResizeState.pointerId === event.pointerId) {
      const { shell, startX, startRatio } = this.dividerResizeState;
      const shellRect = shell.getBoundingClientRect();
      const nextRatio = clampWorkspaceSplit(
        startRatio + (event.clientX - startX) / shellRect.width,
      );

      shell.style.setProperty("--workspace-left", `${Math.round(nextRatio * 1000) / 10}%`);
      return;
    }

    if (!this.graphPanState || this.graphPanState.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - this.graphPanState.startX;
    const dy = event.clientY - this.graphPanState.startY;

    if (!this.graphPanState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      this.graphPanState.moved = true;
    }

    this.graphPanState.stage.scrollLeft = this.graphPanState.startLeft - dx;
    this.graphPanState.stage.scrollTop = this.graphPanState.startTop - dy;
  }

  private handlePointerUp(event: PointerEvent): void {
    if (this.dividerResizeState && this.dividerResizeState.pointerId === event.pointerId) {
      const { shell, divider } = this.dividerResizeState;
      const workspaceLeft = shell.style.getPropertyValue("--workspace-left").trim();
      const nextRatio = workspaceLeft.endsWith("%")
        ? clampWorkspaceSplit(Number.parseFloat(workspaceLeft) / 100)
        : this.state.workspaceSplitRatio;

      divider.classList.remove("is-dragging");

      if (divider.hasPointerCapture(event.pointerId)) {
        divider.releasePointerCapture(event.pointerId);
      }

      this.dividerResizeState = null;
      this.state = setWorkspaceSplitRatio(this.state, nextRatio);
      return;
    }

    if (!this.graphPanState || this.graphPanState.pointerId !== event.pointerId) {
      return;
    }

    const { stage, moved } = this.graphPanState;

    stage.classList.remove("is-panning");

    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }

    this.graphPanState = null;

    if (moved) {
      this.lastManualGraphPanAt = Date.now();
      this.ignoreGraphClickUntil = Date.now() + 160;
    }
  }

  private renderShell(): void {
    this.root.innerHTML = renderApp({
      state: this.state,
      config: this.config,
      run: selectRunViewState(this.state),
      report: selectReportViewState(this.state),
      researchMap: selectResearchMapViewState(this.state),
      graphSnapshot: selectGraphSnapshotViewState(this.state),
      agentCards: selectAgentCardStates(this.state),
      timeline: selectTimelineState(this.state),
    });
    this.syncView({
      forceTerminalRefresh: true,
    });
  }

  private syncView(options?: {
    forceTerminalRefresh?: boolean;
    appendTerminalChunk?: TerminalStreamChunk;
    reportSectionKey?: ReportSectionKey;
  }): void {
    const run = selectRunViewState(this.state);
    const report = selectReportViewState(this.state);
    const researchMap = selectResearchMapViewState(this.state);
    const graphSnapshot = selectGraphSnapshotViewState(this.state);
    const agentCards = selectAgentCardStates(this.state);
    const timeline = selectTimelineState(this.state);

    const railMeta = this.root.querySelector<HTMLElement>('[data-role="rail-meta"]');
    if (railMeta) {
      railMeta.innerHTML = renderRailMeta(run, this.config);
    }

    const composerNote = this.root.querySelector<HTMLElement>('[data-role="composer-note"]');
    if (composerNote) {
      const noteText =
        this.state.errorMessage ?? run.streamWarning ?? this.state.infoMessage ?? "";

      composerNote.textContent = noteText;
      composerNote.dataset.tone = this.state.errorMessage
        ? "error"
        : run.streamWarning
          ? "warning"
          : noteText
            ? "info"
            : "idle";
    }

    const dialogueFeed = this.root.querySelector<HTMLElement>('[data-role="dialogue-feed"]');
    if (dialogueFeed) {
      if (
        options?.reportSectionKey &&
        this.state.run &&
        this.patchReportSection(dialogueFeed, report, options.reportSectionKey)
      ) {
        // Keep existing DOM and only patch the changed section.
      } else {
        const nextDialogue = renderDialogueFeed(this.state, run, report, researchMap);

        if (dialogueFeed.innerHTML !== nextDialogue) {
          dialogueFeed.innerHTML = nextDialogue;
        }
      }

      if (!this.pauseDialogueAutoscroll) {
        dialogueFeed.scrollTop = dialogueFeed.scrollHeight;
      }

      this.syncInsightScroll(dialogueFeed);
    }

    const submitButton = this.root.querySelector<HTMLButtonElement>('[data-role="submit-button"]');
    if (submitButton) {
      submitButton.textContent = renderComposerButtonLabel(this.state);
      submitButton.disabled = this.state.connectionStatus === "creating";
    }

    const queryInput = this.root.querySelector<HTMLTextAreaElement>("#query-input");
    if (queryInput) {
      queryInput.disabled = this.state.connectionStatus === "creating";
      if (queryInput.value !== this.state.composerText) {
        queryInput.value = this.state.composerText;
      }
      resizeComposerInput(queryInput);
    }

    const timelineList = this.root.querySelector<HTMLElement>('[data-role="timeline-list"]');
    if (timelineList) {
      timelineList.innerHTML = renderTimelineList(timeline);
    }

    const canvasPanelBody = this.root.querySelector<HTMLElement>('[data-role="canvas-panel-body"]');
    if (canvasPanelBody) {
      const panel = this.state.activeCanvasPanel;

      if (canvasPanelBody.dataset.panel !== panel) {
        this.renderShell();
        return;
      }

      if (panel === "graph") {
        if (this.graphPanState) {
          return;
        }

        const previousStage = canvasPanelBody.querySelector<HTMLElement>(".graph-stage");
        const previousScrollLeft = previousStage?.scrollLeft ?? 0;
        const previousScrollTop = previousStage?.scrollTop ?? 0;

        canvasPanelBody.innerHTML = renderGraphSnapshot(graphSnapshot);
        const nextStage = canvasPanelBody.querySelector<HTMLElement>(".graph-stage");

        if (nextStage) {
          nextStage.scrollLeft = previousScrollLeft;
          nextStage.scrollTop = previousScrollTop;
        }

        this.syncGraphViewport(canvasPanelBody);
      }
    }

    this.syncAgentCards(agentCards, options);
  }

  private patchReportSection(
    dialogueFeed: HTMLElement,
    report: ReturnType<typeof selectReportViewState>,
    sectionKey: ReportSectionKey,
  ): boolean {
    const answerSections = dialogueFeed.querySelector<HTMLElement>(".answer-sections");
    const nextSection = report.sections.find((section) => section.key === sectionKey);

    if (!answerSections || !nextSection) {
      return false;
    }

    const existingSection = answerSections.querySelector<HTMLElement>(
      `[data-section="${sectionKey}"]`,
    );
    const sectionMarkup = renderReportSection(nextSection);

    if (existingSection) {
      existingSection.outerHTML = sectionMarkup;
      return true;
    }

    const nextSectionIndex = report.sections.findIndex((section) => section.key === sectionKey);
    const followingSection = report.sections
      .slice(nextSectionIndex + 1)
      .find((section) => answerSections.querySelector<HTMLElement>(`[data-section="${section.key}"]`));

    if (followingSection) {
      const anchor = answerSections.querySelector<HTMLElement>(`[data-section="${followingSection.key}"]`);

      if (anchor) {
        anchor.insertAdjacentHTML("beforebegin", sectionMarkup);
      } else {
        answerSections.insertAdjacentHTML("beforeend", sectionMarkup);
      }
    } else {
      answerSections.insertAdjacentHTML("beforeend", sectionMarkup);
    }

    const pending = dialogueFeed.querySelector<HTMLElement>(".answer-pending");
    pending?.remove();
    return true;
  }

  private syncInsightScroll(dialogueFeed: HTMLElement): void {
    const targetSectionKey = resolveInsightSectionKey(this.state);

    if (!targetSectionKey) {
      this.lastInsightScrollTarget = null;
      return;
    }

    if (this.lastInsightScrollTarget === targetSectionKey) {
      return;
    }

    const targetSection = dialogueFeed.querySelector<HTMLElement>(
      `[data-section="${targetSectionKey}"]`,
    );

    if (!targetSection) {
      return;
    }

    if (this.pauseDialogueAutoscroll && this.state.selectedInsight?.kind !== "report_section") {
      return;
    }

    this.lastInsightScrollTarget = targetSectionKey;
    targetSection.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }

  private syncGraphViewport(canvasPanelBody: HTMLElement): void {
    const graphStage = canvasPanelBody.querySelector<HTMLElement>(".graph-stage");

    if (!graphStage) {
      this.lastGraphFocusTarget = null;
      return;
    }

    const selectedNode =
      graphStage.querySelector<Element>(".graph-node.focus-selected") ??
      graphStage.querySelector<Element>(".graph-node.focus-related");

    if (!selectedNode) {
      this.lastGraphFocusTarget = null;
      return;
    }

    const targetNodeId =
      selectedNode.getAttribute("data-node-id") ??
      selectedNode.getAttribute("id");

    if (!targetNodeId || this.lastGraphFocusTarget === targetNodeId) {
      return;
    }

    if (Date.now() - this.lastManualGraphPanAt < 1200) {
      return;
    }

    this.lastGraphFocusTarget = targetNodeId;

    const nodeRect = selectedNode.getBoundingClientRect();
    const stageRect = graphStage.getBoundingClientRect();
    const nextLeft =
      graphStage.scrollLeft +
      (nodeRect.left - stageRect.left) -
      (stageRect.width / 2 - nodeRect.width / 2);
    const nextTop =
      graphStage.scrollTop +
      (nodeRect.top - stageRect.top) -
      (stageRect.height / 2 - nodeRect.height / 2);

    graphStage.scrollTo({
      left: Math.max(nextLeft, 0),
      top: Math.max(nextTop, 0),
      behavior: "smooth",
    });
  }

  private centerGraphStage(graphStage: HTMLElement): void {
    const svg = graphStage.querySelector<SVGElement>(".graph-svg");

    if (!svg) {
      return;
    }

    const nextLeft = Math.max((svg.clientWidth - graphStage.clientWidth) / 2, 0);
    const nextTop = Math.max((svg.clientHeight - graphStage.clientHeight) / 2, 0);

    graphStage.scrollTo({
      left: nextLeft,
      top: nextTop,
      behavior: "smooth",
    });
  }

  private syncAgentCards(
    agentCards: ReturnType<typeof selectAgentCardStates>,
    options?: {
      forceTerminalRefresh?: boolean;
      appendTerminalChunk?: TerminalStreamChunk;
    },
  ): void {
    for (const card of agentCards) {
      const cardElement = this.root.querySelector<HTMLElement>(
        `[data-agent-card="${card.agent}"]`,
      );

      if (!cardElement) {
        continue;
      }

      cardElement.classList.toggle("running", card.status === "running");
      cardElement.classList.toggle("degraded", card.status === "degraded");
      cardElement.classList.toggle("failed", card.status === "failed");
      cardElement.classList.toggle("expanded", card.expanded);

      const liveIndicator = cardElement.querySelector<HTMLElement>('[data-field="live-indicator"]');
      if (liveIndicator) {
        liveIndicator.classList.toggle("is-live", card.isLive);
        liveIndicator.innerHTML = `<span class="terminal-live-dot"></span>${card.isLive ? "Live" : "Idle"}`;
      }

      const phaseLabel = cardElement.querySelector<HTMLElement>('[data-field="phase-label"]');
      if (phaseLabel) {
        phaseLabel.textContent = card.phaseLabel;
      }

      const statusInline = cardElement.querySelector<HTMLElement>('[data-field="status-inline"] .dot');
      if (statusInline) {
        statusInline.setAttribute("style", `color:${agentStatusColor(card.status)}`);
      }

      const statusLabel = cardElement.querySelector<HTMLElement>('[data-field="status-label"]');
      if (statusLabel) {
        statusLabel.textContent = card.status;
      }

      const eventCount = cardElement.querySelector<HTMLElement>('[data-field="event-count"]');
      if (eventCount) {
        eventCount.textContent = `${card.eventCount} updates`;
      }

      const currentTask = cardElement.querySelector<HTMLElement>('[data-field="current-task"]');
      if (currentTask) {
        currentTask.textContent = card.currentTask;
      }

      const recentAction = cardElement.querySelector<HTMLElement>('[data-field="recent-action"]');
      if (recentAction) {
        recentAction.textContent = card.recentAction;
      }

      const latestFinding = cardElement.querySelector<HTMLElement>('[data-field="latest-finding"]');
      if (latestFinding) {
        latestFinding.textContent = card.latestFinding;
      }

      const latestTool = cardElement.querySelector<HTMLElement>('[data-field="latest-tool"]');
      if (latestTool) {
        latestTool.textContent = card.latestTool;
      }

      const latestPatch = cardElement.querySelector<HTMLElement>('[data-field="latest-patch"]');
      if (latestPatch) {
        latestPatch.textContent = card.latestPatch;
        latestPatch.classList.remove("tag-clean", "tag-warning", "tag-error");
        latestPatch.classList.add(patchClass(card.patchTone));
      }

      const terminalScreen = cardElement.querySelector<HTMLElement>('[data-field="terminal-screen"]');
      if (terminalScreen) {
        terminalScreen.classList.toggle("live", card.isLive);
      }

      const screenMeta = cardElement.querySelector<HTMLElement>('[data-field="screen-meta"]');
      if (screenMeta) {
        screenMeta.textContent = card.phaseLabel;
      }

      const terminalToggle = cardElement.querySelector<HTMLButtonElement>(
        '[data-action="toggle-terminal"]',
      );
      if (terminalToggle) {
        terminalToggle.textContent = card.expanded ? "Collapse" : "Expand";
        terminalToggle.setAttribute("aria-pressed", card.expanded ? "true" : "false");
      }

      const cursorRow = cardElement.querySelector<HTMLElement>(`[data-role="terminal-cursor"][data-agent="${card.agent}"]`);
      if (cursorRow) {
        cursorRow.classList.toggle("is-hidden", !card.isLive);
      }

      if (options?.forceTerminalRefresh) {
        this.replaceTerminalLines(card.agent, card.transcriptLines);
      }

    }

    if (options?.appendTerminalChunk) {
      this.appendTerminalChunk(options.appendTerminalChunk);
    }
  }

  private replaceTerminalLines(agent: AgentKey, lines: TerminalLineState[]): void {
    const linesContainer = this.root.querySelector<HTMLElement>(
      `[data-role="terminal-scroll"][data-agent="${agent}"]`,
    );

    if (!linesContainer) {
      return;
    }

    linesContainer.innerHTML = renderTerminalLines(lines);
    this.renderedTerminalLineIds.set(
      agent,
      new Set(lines.map((line) => line.id)),
    );

    if (!this.pausedTerminalAgents.has(agent)) {
      this.scrollTerminalToBottom(agent);
    }
  }

  private appendTerminalChunk(chunk: TerminalStreamChunk): void {
    const agent = chunk.agentType;
    const renderedIds = this.renderedTerminalLineIds.get(agent) ?? new Set<string>();

    if (renderedIds.has(chunk.line.lineId)) {
      return;
    }

    const linesContainer = this.root.querySelector<HTMLElement>(
      `[data-role="terminal-scroll"][data-agent="${agent}"]`,
    );

    if (!linesContainer) {
      return;
    }

    linesContainer.querySelector('[data-role="terminal-placeholder"]')?.remove();
    linesContainer.insertAdjacentHTML(
      "beforeend",
      renderTerminalLine({
        id: chunk.line.lineId,
        prefix: chunk.line.prefix,
        text: chunk.line.text,
        kind: chunk.line.kind,
        tone: chunk.line.tone,
        ts: chunk.line.ts,
      }),
    );

    const appendedLine = linesContainer.lastElementChild as HTMLElement | null;
    appendedLine?.classList.add("is-streamed");

    renderedIds.add(chunk.line.lineId);
    this.renderedTerminalLineIds.set(agent, renderedIds);

    if (!this.pausedTerminalAgents.has(agent)) {
      this.scrollTerminalToBottom(agent);
    }

  }

  private scrollTerminalToBottom(agent: AgentKey): void {
    const terminalScroll = this.root.querySelector<HTMLElement>(
      `[data-role="terminal-scroll"][data-agent="${agent}"]`,
    );

    if (!terminalScroll) {
      return;
    }

    terminalScroll.scrollTop = terminalScroll.scrollHeight;
  }

  private resetTerminalUiState(): void {
    this.pausedTerminalAgents.clear();
    this.renderedTerminalLineIds.clear();
  }
}

function readReportSectionKey(value: unknown): ReportSectionKey | undefined {
  return typeof value === "string" && reportSectionKeys.includes(value as ReportSectionKey)
    ? (value as ReportSectionKey)
    : undefined;
}

function resolveInsightSectionKey(state: AppState): ReportSectionKey | null {
  const insight = state.selectedInsight;

  if (!insight) {
    return null;
  }

  if (insight.kind === "report_section") {
    return insight.key;
  }

  if (insight.kind === "research_card") {
    return resolveSectionKeyFromResearchCard(insight.cardId);
  }

  return resolveSectionKeyFromNodeId(state, insight.nodeId);
}

function resolveSectionKeyFromResearchCard(cardId: string): ReportSectionKey | null {
  if (cardId === "current_view") return "final_judgment";
  if (cardId === "watchpoints") return "what_changes_the_view";
  if (reportSectionKeys.includes(cardId as ReportSectionKey)) {
    return cardId as ReportSectionKey;
  }

  return null;
}

function resolveSectionKeyFromNodeId(
  state: AppState,
  nodeId: string,
): ReportSectionKey | null {
  if (state.run?.caseId === nodeId) {
    return "final_judgment";
  }

  for (const section of state.reportSections) {
    if (section.sectionId === nodeId) {
      return section.sectionKey;
    }

    if (
      section.citationFindingRefs.includes(nodeId) ||
      section.citationEvidenceRefs.includes(nodeId) ||
      section.citationObjectRefs.includes(nodeId)
    ) {
      return section.sectionKey;
    }
  }

  return null;
}

function resizeComposerInput(textarea: HTMLTextAreaElement): void {
  textarea.style.height = "0px";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
}

function buildFeedInfoMessage(config: DelphiAppConfig): string {
  if (config.feedMode === "sse") {
    const runKey = config.runtimeRunKey ?? inferRunKeyFromUrl(config.sseEventsUrl);

    if (runKey) {
      return "Showing the latest live analysis.";
    }

    return "Ask one stock question and Delphi will stream the answer, the analyst notes, and the case structure.";
  }

  return "Recorded mode replays a saved AAPL case so you can inspect the product without starting a live run.";
}

function inferRunKeyFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(/\/runs\/([^/]+)\/events$/);
  return match?.[1] ?? null;
}

function inferRuntimeBase(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function syncLiveLocation(runtimeApiBaseUrl: string, runKey: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("source", "sse");
  url.searchParams.set("runtime", runtimeApiBaseUrl);
  url.searchParams.set("run", runKey);
  url.searchParams.delete("events");
  url.searchParams.delete("snapshot");
  url.searchParams.delete("graphSnapshot");
  url.searchParams.delete("terminals");
  url.searchParams.delete("terminalStream");
  window.history.replaceState(null, "", url);
}

function clampWorkspaceSplit(value: number): number {
  return Math.min(Math.max(value, 0.36), 0.64);
}

function patchClass(tone: "clean" | "warning" | "error"): string {
  switch (tone) {
    case "error":
      return "tag-error";
    case "warning":
      return "tag-warning";
    default:
      return "tag-clean";
  }
}

function agentStatusColor(status: "idle" | "running" | "blocked" | "done" | "degraded" | "failed"): string {
  switch (status) {
    case "running":
      return "var(--running)";
    case "done":
      return "var(--done)";
    case "degraded":
      return "var(--degraded)";
    case "failed":
      return "var(--failed)";
    case "blocked":
      return "var(--degraded)";
    default:
      return "var(--idle)";
  }
}

function isAgentKey(value: string | undefined): value is AgentKey {
  return typeof value === "string" && agentKeys.includes(value as AgentKey);
}
