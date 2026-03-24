import type {
  FinalReport,
  RecordedRunFixture,
  ResearchMapSnapshot,
  ReportSectionRecord,
  TerminalSnapshot,
  TerminalStreamChunk,
  RunEvent,
  RunRecord,
} from "./run-contract.js";

export type FeedMode = "recorded" | "sse";
export type StreamKind = "events" | "terminal";

export type FeedMessage =
  | { kind: "connected"; label: string }
  | {
      kind: "snapshot";
      run: RunRecord;
      reportSections: ReportSectionRecord[];
      finalReport: FinalReport | null;
    }
  | {
      kind: "research_map_snapshot";
      snapshot: ResearchMapSnapshot;
    }
  | {
      kind: "terminal_snapshot";
      snapshot: TerminalSnapshot;
    }
  | {
      kind: "terminal_chunk";
      chunk: TerminalStreamChunk;
    }
  | { kind: "event"; event: RunEvent }
  | { kind: "stream_interrupted"; stream: StreamKind; message: string }
  | { kind: "stream_recovered"; stream: StreamKind }
  | { kind: "complete" }
  | { kind: "error"; message: string };

export interface FeedHandlers {
  onMessage(message: FeedMessage): void;
}

export interface FeedConnection {
  close(): void;
}

export interface RunFeedSource {
  connect(handlers: FeedHandlers): FeedConnection;
}

export interface RuntimeRunSubmission {
  runKey: string;
  run: RunRecord;
  endpoints: {
    events: string;
    report: string;
    researchMap: string;
    terminals: string;
    terminalStream: string;
  };
}

export function createRecordedFeedSource(options: {
  fixtureUrl: string;
  baseDelayMs?: number;
}): RunFeedSource {
  return {
    connect(handlers) {
      let cancelled = false;

      const run = async (): Promise<void> => {
        handlers.onMessage({
          kind: "connected",
          label: "Recorded Demo Feed",
        });

        try {
          const fixture = await loadFixture(options.fixtureUrl);

          if (cancelled) {
            return;
          }

          handlers.onMessage({
            kind: "snapshot",
            run: fixture.run,
            reportSections: fixture.reportSections,
            finalReport: fixture.finalReport,
          });

          handlers.onMessage({
            kind: "terminal_snapshot",
            snapshot: createInitialTerminalSnapshot(
              fixture.terminalSnapshot?.runId ?? fixture.run.runId,
            ),
          });

          const terminalChunksByEventId = new Map<string, TerminalStreamChunk[]>();

          for (const chunk of fixture.terminalChunks ?? []) {
            const chunks = terminalChunksByEventId.get(chunk.line.eventId) ?? [];
            chunks.push(chunk);
            terminalChunksByEventId.set(chunk.line.eventId, chunks);
          }

          for (const event of fixture.events) {
            await sleep(resolveEventDelay(event.eventType, options.baseDelayMs));

            if (cancelled) {
              return;
            }

            handlers.onMessage({
              kind: "event",
              event,
            });

            for (const chunk of terminalChunksByEventId.get(event.eventId) ?? []) {
              handlers.onMessage({
                kind: "terminal_chunk",
                chunk,
              });
            }
          }

          handlers.onMessage({ kind: "complete" });
        } catch (error) {
          handlers.onMessage({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to load recorded runtime fixture.",
          });
        }
      };

      void run();

      return {
        close() {
          cancelled = true;
        },
      };
    },
  };
}

export function createSseFeedSource(options: {
  eventsUrl: string;
  snapshotUrl?: string;
  researchMapUrl?: string;
  terminalsUrl?: string;
  terminalStreamUrl?: string;
}): RunFeedSource {
  return {
    connect(handlers) {
      let closed = false;
      let eventSource: EventSource | null = null;
      let terminalSource: EventSource | null = null;
      let hydrated = false;
      let receivedEvent = false;
      let receivedTerminalChunk = false;
      let eventStreamInterrupted = false;
      let terminalStreamInterrupted = false;
      let snapshotPollId: number | null = null;

      const stopSnapshotPolling = (): void => {
        if (snapshotPollId === null) {
          return;
        }

        window.clearInterval(snapshotPollId);
        snapshotPollId = null;
      };

      const refreshSnapshot = async (): Promise<void> => {
        if (!options.snapshotUrl) {
          return;
        }

        const snapshot = await loadSnapshot(options.snapshotUrl, handlers);

        if (isSettledRunStatus(snapshot.run.status)) {
          stopSnapshotPolling();
        }
      };

      const refreshResearchMap = async (): Promise<void> => {
        if (!options.researchMapUrl) {
          return;
        }

        await loadResearchMapSnapshot(options.researchMapUrl, handlers);
      };

      const startSnapshotPolling = (): void => {
        if (!options.snapshotUrl || snapshotPollId !== null) {
          return;
        }

        snapshotPollId = window.setInterval(() => {
          void refreshSnapshot().catch(() => {
            // Keep the last rendered snapshot visible while EventSource retries.
          });
        }, 4000);
      };

      const connect = async (): Promise<void> => {
        handlers.onMessage({
          kind: "connected",
          label: "Live SSE Feed",
        });

        try {
          if (options.terminalsUrl) {
            await loadTerminalSnapshot(options.terminalsUrl, handlers);
            hydrated = true;
          }

          if (options.researchMapUrl) {
            await refreshResearchMap();
            hydrated = true;
          }

          if (options.snapshotUrl) {
            await refreshSnapshot();
            hydrated = true;
          }

          if (closed) {
            return;
          }

          eventSource = new EventSource(options.eventsUrl);
          eventSource.onopen = () => {
            if (closed || !eventStreamInterrupted) {
              return;
            }

            eventStreamInterrupted = false;
            stopSnapshotPolling();
            handlers.onMessage({
              kind: "stream_recovered",
              stream: "events",
            });
          };
          eventSource.onmessage = async (message) => {
            if (closed) {
              return;
            }

            try {
              const event = JSON.parse(message.data) as RunEvent;
              receivedEvent = true;
              handlers.onMessage({ kind: "event", event });

              if (
                (event.eventType === "patch_accepted" ||
                  event.eventType === "report_section_ready" ||
                  event.eventType === "report_ready") &&
                options.researchMapUrl
              ) {
                await refreshResearchMap();
              }

              if (event.eventType === "report_ready" && options.snapshotUrl) {
                await refreshSnapshot();
              }
            } catch {
              handlers.onMessage({
                kind: "error",
                message: "Received an invalid SSE event payload.",
              });
            }
          };

          eventSource.onerror = () => {
            if (closed) {
              return;
            }

            if (receivedEvent || hydrated) {
              if (!eventStreamInterrupted) {
                eventStreamInterrupted = true;
                handlers.onMessage({
                  kind: "stream_interrupted",
                  stream: "events",
                  message:
                    "Event stream interrupted. Showing the latest report snapshot while the browser reconnects.",
                });
                startSnapshotPolling();
              }
              return;
            }

            handlers.onMessage({
              kind: "error",
              message:
                "SSE connection failed. Provide a valid events endpoint or switch back to recorded mode.",
            });
          };

          if (options.terminalStreamUrl) {
            terminalSource = new EventSource(options.terminalStreamUrl);
            terminalSource.onopen = () => {
              if (closed || !terminalStreamInterrupted) {
                return;
              }

              terminalStreamInterrupted = false;
              handlers.onMessage({
                kind: "stream_recovered",
                stream: "terminal",
              });
            };
            terminalSource.onmessage = (message) => {
              if (closed) {
                return;
              }

              try {
                const chunk = JSON.parse(message.data) as TerminalStreamChunk;
                receivedTerminalChunk = true;
                handlers.onMessage({
                  kind: "terminal_chunk",
                  chunk,
                });
              } catch {
                handlers.onMessage({
                  kind: "error",
                  message: "Received an invalid terminal stream payload.",
                });
              }
            };

            terminalSource.onerror = () => {
              if (closed) {
                return;
              }

              if (receivedTerminalChunk || receivedEvent || hydrated) {
                if (!terminalStreamInterrupted) {
                  terminalStreamInterrupted = true;
                  handlers.onMessage({
                    kind: "stream_interrupted",
                    stream: "terminal",
                    message:
                      "Terminal stream interrupted. The latest transcript stays visible while the browser reconnects.",
                  });
                }
                return;
              }

              handlers.onMessage({
                kind: "error",
                message:
                  "Terminal stream connection failed. The run can continue, but the agent canvas may stop updating.",
              });
            };
          }
        } catch (error) {
          handlers.onMessage({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to load the live run snapshot.",
          });
        }
      };

      void connect();

      return {
        close() {
          closed = true;
          stopSnapshotPolling();
          eventSource?.close();
          terminalSource?.close();
        },
      };
    },
  };
}

export async function createRuntimeRun(options: {
  runtimeApiBaseUrl: string;
  payload: {
    runKey?: string;
    query: {
      userQuestion: string;
      ticker?: string;
      timeHorizon?: string;
      caseType?: string;
    };
  };
}): Promise<RuntimeRunSubmission> {
  const response = await fetch(new URL("/runs", options.runtimeApiBaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options.payload),
  });

  const body = (await response.json()) as
    | RuntimeRunSubmission
    | { error?: string };

  if (!response.ok) {
    const errorMessage =
      "error" in body
        ? body.error
        : undefined;
    throw new Error(errorMessage ?? `Run creation failed with status ${response.status}.`);
  }

  return body as RuntimeRunSubmission;
}

export function resolveRuntimeEndpoint(
  runtimeApiBaseUrl: string,
  endpoint: string,
): string {
  return new URL(endpoint, runtimeApiBaseUrl).toString();
}

async function loadFixture(fixtureUrl: string): Promise<RecordedRunFixture> {
  const response = await fetch(fixtureUrl);

  if (!response.ok) {
    throw new Error(`Fixture request failed with status ${response.status}.`);
  }

  return (await response.json()) as RecordedRunFixture;
}

async function loadSnapshot(
  snapshotUrl: string,
  handlers: FeedHandlers,
): Promise<{
  run: RunRecord;
  reportSections: ReportSectionRecord[];
  finalReport: FinalReport | null;
}> {
  const response = await fetch(snapshotUrl);

  if (!response.ok) {
    throw new Error(`Snapshot request failed with status ${response.status}.`);
  }

  const snapshot = (await response.json()) as {
    run: RunRecord;
    reportSections: ReportSectionRecord[];
    finalReport: FinalReport | null;
  };

  handlers.onMessage({
    kind: "snapshot",
    run: snapshot.run,
    reportSections: snapshot.reportSections,
    finalReport: snapshot.finalReport,
  });

  return snapshot;
}

async function loadTerminalSnapshot(
  terminalsUrl: string,
  handlers: FeedHandlers,
): Promise<void> {
  const response = await fetch(terminalsUrl);

  if (!response.ok) {
    throw new Error(`Terminal snapshot request failed with status ${response.status}.`);
  }

  const snapshot = (await response.json()) as TerminalSnapshot;
  handlers.onMessage({
    kind: "terminal_snapshot",
    snapshot,
  });
}

async function loadResearchMapSnapshot(
  researchMapUrl: string,
  handlers: FeedHandlers,
): Promise<void> {
  const response = await fetch(researchMapUrl);

  if (!response.ok) {
    throw new Error(`Research map request failed with status ${response.status}.`);
  }

  const snapshot = (await response.json()) as ResearchMapSnapshot;
  handlers.onMessage({
    kind: "research_map_snapshot",
    snapshot,
  });
}

function createInitialTerminalSnapshot(runId: string): TerminalSnapshot {
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

function resolveEventDelay(
  eventType: RunEvent["eventType"],
  baseDelayMs = 320,
): number {
  switch (eventType) {
    case "run_created":
    case "planner_completed":
      return baseDelayMs;
    case "task_assigned":
      return baseDelayMs * 0.82;
    case "tool_started":
    case "tool_finished":
    case "finding_created":
      return baseDelayMs * 1.15;
    case "judge_synthesis_started":
    case "report_ready":
      return baseDelayMs * 1.4;
    default:
      return baseDelayMs * 0.72;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isSettledRunStatus(status: RunRecord["status"]): boolean {
  return status === "completed" || status === "failed" || status === "degraded";
}
