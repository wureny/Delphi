import type {
  FinalReport,
  RecordedRunFixture,
  ReportSectionRecord,
  RunEvent,
  RunRecord,
} from "./run-contract.js";

export type FeedMode = "recorded" | "sse";

export type FeedMessage =
  | { kind: "connected"; label: string }
  | {
      kind: "snapshot";
      run: RunRecord;
      reportSections: ReportSectionRecord[];
      finalReport: FinalReport | null;
    }
  | { kind: "event"; event: RunEvent }
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

          for (const event of fixture.events) {
            await sleep(resolveEventDelay(event.eventType, options.baseDelayMs));

            if (cancelled) {
              return;
            }

            handlers.onMessage({
              kind: "event",
              event,
            });
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
}): RunFeedSource {
  return {
    connect(handlers) {
      const eventSource = new EventSource(options.eventsUrl);
      let closed = false;

      handlers.onMessage({
        kind: "connected",
        label: "Live SSE Feed",
      });

      if (options.snapshotUrl) {
        void loadSnapshot(options.snapshotUrl, handlers);
      }

      eventSource.onmessage = async (message) => {
        if (closed) {
          return;
        }

        try {
          const event = JSON.parse(message.data) as RunEvent;
          handlers.onMessage({ kind: "event", event });

          if (event.eventType === "report_ready" && options.snapshotUrl) {
            await loadSnapshot(options.snapshotUrl, handlers);
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

        handlers.onMessage({
          kind: "error",
          message:
            "SSE connection failed. Provide a valid events endpoint or switch back to recorded mode.",
        });
      };

      return {
        close() {
          closed = true;
          eventSource.close();
        },
      };
    },
  };
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
): Promise<void> {
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
