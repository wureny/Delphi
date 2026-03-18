import {
  createRecordedFeedSource,
  createSseFeedSource,
  type FeedConnection,
  type FeedMode,
  type RunFeedSource,
} from "./feeds.js";
import { renderApp } from "./render.js";
import {
  createInitialState,
  createRestartState,
  reduceFeedMessage,
  selectAgentCardStates,
  selectReportViewState,
  selectRunViewState,
  selectTimelineState,
  toggleCanvas,
  updateComposerText,
  type AppState,
} from "./state.js";

export interface DelphiAppConfig {
  root: HTMLElement;
  feedMode: FeedMode;
  recordedFixtureUrl: string;
  runtimeApiBaseUrl?: string;
  runtimeRunKey?: string;
  sseEventsUrl?: string;
  sseSnapshotUrl?: string;
}

export class DelphiFrontendApp {
  private state: AppState;
  private readonly root: HTMLElement;
  private readonly config: DelphiAppConfig;
  private connection: FeedConnection | null = null;

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
  }

  mount(): void {
    this.root.addEventListener("submit", this.handleSubmit);
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("input", this.handleInput);
    this.render();
    this.startFeed();
  }

  private startFeed(): void {
    this.connection?.close();
    this.state = createRestartState(
      this.state,
      buildFeedInfoMessage(this.config),
    );
    this.render();

    const source = this.createFeedSource();
    this.connection = source.connect({
      onMessage: (message) => {
        this.state = reduceFeedMessage(this.state, message);
        this.render();
      },
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
                "SSE mode is selected, but no `events` endpoint was provided. Pass `?source=sse&events=/runs/<id>/events` and optionally `&snapshot=/runs/<id>/report`.",
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
      this.render();
    }
  }

  private handleInput(event: Event): void {
    const target = event.target;

    if (
      this.config.feedMode === "sse" ||
      !(target instanceof HTMLTextAreaElement) ||
      target.name !== "question"
    ) {
      return;
    }

    this.state = updateComposerText(this.state, target.value);
  }

  private render(): void {
    this.root.innerHTML = renderApp({
      state: this.state,
      config: this.config,
      run: selectRunViewState(this.state),
      report: selectReportViewState(this.state),
      agentCards: selectAgentCardStates(this.state),
      timeline: selectTimelineState(this.state),
    });
  }
}

function buildFeedInfoMessage(config: DelphiAppConfig): string {
  if (config.feedMode === "sse") {
    const runKey = config.runtimeRunKey ?? inferRunKeyFromUrl(config.sseEventsUrl) ?? "demo";
    const runtimeBase = config.runtimeApiBaseUrl ?? inferRuntimeBase(config.sseEventsUrl) ?? "http://127.0.0.1:8787";

    return `Live bridge mode uses runtime run key "${runKey}" via ${runtimeBase}. The composer is read-only here because thread4 currently exposes GET /runs/:runKey/events + GET /runs/:runKey/report, not a query submission endpoint.`;
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
