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
  renderRailMeta,
  renderTerminalLine,
  renderTerminalLines,
  renderTimelineList,
} from "./render.js";
import {
  agentKeys,
  type AgentKey,
  reportSectionKeys,
  type TerminalStreamChunk,
} from "./run-contract.js";
import {
  createInitialState,
  createRestartState,
  reduceFeedMessage,
  renderComposerButtonLabel,
  selectResearchMapViewState,
  selectAgentCardStates,
  selectReportViewState,
  selectRunViewState,
  selectTimelineState,
  toggleCanvas,
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
  }

  mount(): void {
    this.root.addEventListener("submit", this.handleSubmit);
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("input", this.handleInput);
    this.root.addEventListener("scroll", this.handleScroll, true);
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

    this.syncView({
      forceTerminalRefresh: message.kind === "terminal_snapshot",
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

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionNode = target.closest<HTMLElement>("[data-action]");

    if (!actionNode) {
      return;
    }

    if (actionNode.dataset.action === "toggle-canvas") {
      this.state = toggleCanvas(this.state);
      this.renderShell();
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
      }
    }

  }

  private handleInput(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLTextAreaElement) || target.name !== "question") {
      return;
    }

    this.state = updateComposerText(this.state, target.value);
  }

  private handleScroll(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLElement) || target.dataset.role !== "terminal-scroll") {
      return;
    }

    const agent = target.dataset.agent;

    if (!isAgentKey(agent)) {
      return;
    }

    const followThreshold = 18;
    const isNearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight <= followThreshold;

    if (isNearBottom) {
      this.pausedTerminalAgents.delete(agent);
    } else {
      this.pausedTerminalAgents.add(agent);
    }

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
        `Submitting live query to ${this.config.runtimeApiBaseUrl} via POST /runs.`,
      ),
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
        connectionStatus: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Live run submission failed.",
      };
      this.syncView();
    }
  }

  private renderShell(): void {
    this.root.innerHTML = renderApp({
      state: this.state,
      config: this.config,
      run: selectRunViewState(this.state),
      report: selectReportViewState(this.state),
      researchMap: selectResearchMapViewState(this.state),
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
  }): void {
    const run = selectRunViewState(this.state);
    const report = selectReportViewState(this.state);
    const researchMap = selectResearchMapViewState(this.state);
    const agentCards = selectAgentCardStates(this.state);
    const timeline = selectTimelineState(this.state);

    const railMeta = this.root.querySelector<HTMLElement>('[data-role="rail-meta"]');
    if (railMeta) {
      railMeta.innerHTML = renderRailMeta(run, this.config);
    }

    const composerNote = this.root.querySelector<HTMLElement>('[data-role="composer-note"]');
    if (composerNote) {
      composerNote.textContent =
        this.state.errorMessage ?? run.streamWarning ?? this.state.infoMessage ?? "";
    }

    const dialogueFeed = this.root.querySelector<HTMLElement>('[data-role="dialogue-feed"]');
    if (dialogueFeed) {
      dialogueFeed.innerHTML = renderDialogueFeed(this.state, run, report, researchMap);
    }

    const submitButton = this.root.querySelector<HTMLButtonElement>('[data-role="submit-button"]');
    if (submitButton) {
      submitButton.textContent = renderComposerButtonLabel(this.state);
      submitButton.disabled = this.state.connectionStatus === "creating";
    }

    const queryInput = this.root.querySelector<HTMLTextAreaElement>("#query-input");
    if (queryInput) {
      queryInput.disabled = this.state.connectionStatus === "creating";
    }

    const timelineList = this.root.querySelector<HTMLElement>('[data-role="timeline-list"]');
    if (timelineList) {
      timelineList.innerHTML = renderTimelineList(timeline);
    }

    this.syncAgentCards(agentCards, options);
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
        eventCount.textContent = `${card.eventCount} events`;
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

function buildFeedInfoMessage(config: DelphiAppConfig): string {
  if (config.feedMode === "sse") {
    const runKey = config.runtimeRunKey ?? inferRunKeyFromUrl(config.sseEventsUrl);
    const runtimeBase =
      config.runtimeApiBaseUrl ??
      inferRuntimeBase(config.sseEventsUrl) ??
      "http://127.0.0.1:8787";

    if (runKey) {
      return `Live mode uses POST /runs for new submissions and is currently replaying run "${runKey}" from ${runtimeBase}, including report, events, and controlled terminal transport.`;
    }

    return `Live mode submits your question to ${runtimeBase} via POST /runs, then hydrates report + terminal snapshots and streams both events and terminal lines.`;
  }

  return "Recorded mode replays the committed AAPL demo fixture. This is explicit demo input, not a live backend run.";
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
  url.searchParams.delete("terminals");
  url.searchParams.delete("terminalStream");
  window.history.replaceState(null, "", url);
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
