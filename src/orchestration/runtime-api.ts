import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";

import type {
  FinalReport,
  ResearchQuery,
  ReportSectionRecord,
  RunRecord,
} from "./contracts.ts";
import { createRunEvent, type RunEvent, type RuntimeEventSink } from "./events.ts";
import type { RuntimeOrchestrator } from "./orchestrator.ts";
import { createEmptyReportSections } from "./report.ts";
import { createDefaultCaseId } from "./run-manager.ts";

type RunSnapshot = {
  run: RunRecord;
  reportSections: ReportSectionRecord[];
  finalReport: FinalReport | null;
};

interface RuntimeSession {
  key: string;
  query: ResearchQuery;
  snapshot: RunSnapshot;
  runId: string;
  caseId: string;
  createdAt: string;
  listeners: Set<ServerResponse<IncomingMessage>>;
  execution: Promise<void> | null;
}

export interface RuntimeApiServerOptions {
  orchestrator: RuntimeOrchestrator;
  buildQuery?: (runKey: string) => ResearchQuery;
  corsOrigin?: string;
}

export function createRuntimeApiServer(
  options: RuntimeApiServerOptions,
): Server {
  const corsOrigin = options.corsOrigin ?? "*";
  const sessions = new Map<string, RuntimeSession>();

  return createServer(async (request, response) => {
    applyCors(response, corsOrigin);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method !== "GET") {
      writeJson(response, 405, {
        error: "Method not allowed.",
      });
      return;
    }

    const requestUrl = new URL(request.url ?? "/", "http://localhost");

    if (requestUrl.pathname === "/healthz") {
      writeJson(response, 200, {
        ok: true,
      });
      return;
    }

    const reportMatch = requestUrl.pathname.match(/^\/runs\/([^/]+)\/report$/);

    if (reportMatch) {
      const runKey = reportMatch[1];

      if (!runKey) {
        writeJson(response, 400, {
          error: "Missing run key.",
        });
        return;
      }

      const session = ensurePlaceholderSession(runKey, sessions, options);
      writeJson(response, 200, session.snapshot);
      return;
    }

    const eventsMatch = requestUrl.pathname.match(/^\/runs\/([^/]+)\/events$/);

    if (eventsMatch) {
      const runKey = eventsMatch[1];

      if (!runKey) {
        writeJson(response, 400, {
          error: "Missing run key.",
        });
        return;
      }

      const session = replaceSession(runKey, sessions, options);
      attachEventStream(request, response, session);
      startSession(session, options);
      return;
    }

    writeJson(response, 404, {
      error: "Not found.",
    });
  });

  function ensurePlaceholderSession(
    runKey: string,
    sessionStore: Map<string, RuntimeSession>,
    serverOptions: RuntimeApiServerOptions,
  ): RuntimeSession {
    const existing = sessionStore.get(runKey);

    if (existing) {
      return existing;
    }

    const session = createSession(runKey, serverOptions);
    sessionStore.set(runKey, session);
    return session;
  }

  function replaceSession(
    runKey: string,
    sessionStore: Map<string, RuntimeSession>,
    serverOptions: RuntimeApiServerOptions,
  ): RuntimeSession {
    const existing = sessionStore.get(runKey);

    if (existing) {
      closeSession(existing);
    }

    const session = createSession(runKey, serverOptions);
    sessionStore.set(runKey, session);
    return session;
  }

  function createSession(
    runKey: string,
    serverOptions: RuntimeApiServerOptions,
  ): RuntimeSession {
    const createdAt = new Date().toISOString();
    const query =
      serverOptions.buildQuery?.(runKey) ?? buildDefaultQuery(runKey, createdAt);
    const runId = `run_api_${runKey}_${randomUUID()}`;
    const caseId = createDefaultCaseId(query);
    const run: RunRecord = {
      runId,
      caseId,
      query,
      status: "created",
      createdAt,
      updatedAt: createdAt,
      degradedReasons: [],
    };

    return {
      key: runKey,
      query,
      snapshot: {
        run,
        reportSections: createEmptyReportSections(runId),
        finalReport: null,
      },
      runId,
      caseId,
      createdAt,
      listeners: new Set(),
      execution: null,
    };
  }

  function attachEventStream(
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    session: RuntimeSession,
  ): void {
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    response.write("retry: 1000\n\n");
    session.listeners.add(response);

    request.on("close", () => {
      session.listeners.delete(response);
    });
  }

  function closeSession(session: RuntimeSession): void {
    for (const listener of session.listeners) {
      listener.end();
    }

    session.listeners.clear();
  }

  function startSession(
    session: RuntimeSession,
    serverOptions: RuntimeApiServerOptions,
  ): void {
    if (session.execution) {
      return;
    }

    const eventSink: RuntimeEventSink = {
      publish: async (event) => {
        session.snapshot.run = applyRuntimeEvent(session.snapshot.run, event);
        broadcastEvent(session, event);
      },
    };

    session.execution = (async () => {
      try {
        const result = await serverOptions.orchestrator.run(session.query, {
          createRunOptions: {
            runId: session.runId,
            caseId: session.caseId,
            createdAt: session.createdAt,
          },
          eventSink,
          onReportReady: async (artifacts) => {
            session.snapshot = {
              run: artifacts.run,
              reportSections: artifacts.reportSections,
              finalReport: artifacts.finalReport,
            };
          },
        });

        session.snapshot = {
          run: result.run,
          reportSections: result.reportSections,
          finalReport: result.finalReport,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Runtime API execution failed.";

        session.snapshot.run = markSnapshotRunFailed(session.snapshot.run, message);
        broadcastEvent(
          session,
          createRunEvent({
            runId: session.runId,
            agentId: `runtime:${session.key}`,
            eventType: "agent_failed",
            title: "Runtime API execution failed.",
            payload: {
              error: message,
            },
          }),
        );
      }
    })();
  }
}

function buildDefaultQuery(runKey: string, createdAt: string): ResearchQuery {
  return {
    queryId: `query:${runKey}:${randomUUID()}`,
    userQuestion: process.env.RUNTIME_DEMO_QUESTION ?? "AAPL 未来三个月值不值得买？",
    ticker: process.env.RUNTIME_DEMO_TICKER ?? "AAPL",
    timeHorizon: process.env.RUNTIME_DEMO_HORIZON ?? "3m",
    caseType: "buy_decision",
    createdAt,
  };
}

function applyCors(
  response: ServerResponse<IncomingMessage>,
  corsOrigin: string,
): void {
  response.setHeader("Access-Control-Allow-Origin", corsOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function writeJson(
  response: ServerResponse<IncomingMessage>,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body, null, 2));
}

function broadcastEvent(session: RuntimeSession, event: RunEvent): void {
  for (const listener of session.listeners) {
    listener.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

function applyRuntimeEvent(run: RunRecord, event: RunEvent): RunRecord {
  const degradedReasons = mergeDegradedReasons(
    run.degradedReasons,
    readDegradedReasons(event),
  );

  return {
    ...run,
    status: inferRunStatus(run.status, event),
    updatedAt: event.ts,
    degradedReasons,
  };
}

function inferRunStatus(
  currentStatus: RunRecord["status"],
  event: RunEvent,
): RunRecord["status"] {
  switch (event.eventType) {
    case "planner_completed":
      return "planned";
    case "judge_synthesis_started":
      return "synthesizing";
    case "agent_failed":
      return currentStatus === "synthesizing" ? "failed" : currentStatus;
    case "degraded_mode_entered":
      return "degraded";
    case "run_created":
      return "created";
    default:
      return currentStatus === "created" || currentStatus === "planned"
        ? "agent_running"
        : currentStatus;
  }
}

function readDegradedReasons(event: RunEvent): string[] {
  if (event.eventType !== "degraded_mode_entered") {
    return [];
  }

  const reasons = event.payload.reasons;

  if (Array.isArray(reasons)) {
    return reasons.filter((reason): reason is string => typeof reason === "string");
  }

  const error = event.payload.error;
  return typeof error === "string" ? [error] : [];
}

function mergeDegradedReasons(
  existing: string[],
  next: string[],
): string[] {
  const merged = new Set(existing);

  for (const reason of next) {
    merged.add(reason);
  }

  return [...merged];
}

function markSnapshotRunFailed(run: RunRecord, reason: string): RunRecord {
  return {
    ...run,
    status: "failed",
    updatedAt: new Date().toISOString(),
    degradedReasons: mergeDegradedReasons(run.degradedReasons, [reason]),
  };
}
