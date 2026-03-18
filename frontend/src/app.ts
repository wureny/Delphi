import {
  createRecordedFeedSource,
  createRuntimeRun,
  createSseFeedSource,
  type FeedConnection,
  type FeedMode,
  resolveRuntimeEndpoint,
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

    if (this.shouldAutoStartFeed()) {
      this.startFeed();
    }
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
      this.render();
    }
  }

  private handleInput(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLTextAreaElement) || target.name !== "question") {
      return;
    }

    this.state = updateComposerText(this.state, target.value);
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
      this.render();
      return;
    }

    if (!this.config.runtimeApiBaseUrl) {
      this.state = {
        ...this.state,
        errorMessage: "Missing runtime API base URL for live submission.",
      };
      this.render();
      return;
    }

    this.connection?.close();
    this.connection = null;
    this.state = createRestartState(
      this.state,
      `Submitting live query to ${this.config.runtimeApiBaseUrl} via POST /runs.`,
    );
    this.render();

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
      this.render();
    }
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
    const runKey = config.runtimeRunKey ?? inferRunKeyFromUrl(config.sseEventsUrl);
    const runtimeBase =
      config.runtimeApiBaseUrl ??
      inferRuntimeBase(config.sseEventsUrl) ??
      "http://127.0.0.1:8787";

    if (runKey) {
      return `Live mode submits new research via POST /runs and is currently connected to run "${runKey}" on ${runtimeBase}.`;
    }

    return `Live mode submits your question to ${runtimeBase} via POST /runs, then hydrates /report and streams /events for the returned run.`;
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
  window.history.replaceState(null, "", url);
}
