import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";

import type {
  CaseType,
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
  events: RunEvent[];
  listeners: Set<ServerResponse<IncomingMessage>>;
  execution: Promise<void> | null;
}

interface RuntimeRunCreatePayload {
  runKey?: string;
  userQuestion: string;
  ticker?: string;
  timeHorizon?: string;
  caseType?: CaseType;
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

    const requestUrl = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && requestUrl.pathname === "/healthz") {
      writeJson(response, 200, {
        ok: true,
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/runs") {
      const rawBody = await readJsonBody(request);

      if (!rawBody.ok) {
        writeJson(response, rawBody.statusCode, {
          error: rawBody.error,
        });
        return;
      }

      const parsedPayload = parseRunCreatePayload(rawBody.value);

      if (!parsedPayload.ok) {
        writeJson(response, 400, {
          error: parsedPayload.error,
        });
        return;
      }

      const runKey = normalizeRunKey(
        parsedPayload.value.runKey ?? `submitted_${randomUUID()}`,
      );

      if (!runKey) {
        writeJson(response, 400, {
          error:
            "Invalid runKey. Use only letters, numbers, underscores, or hyphens.",
        });
        return;
      }

      let session: RuntimeSession;

      try {
        session = replaceSession(
          buildSubmittedSession(runKey, parsedPayload.value),
          sessions,
        );
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "Invalid run submission.",
        });
        return;
      }

      startSession(session, options);

      writeJson(response, 201, {
        runKey: session.key,
        run: session.snapshot.run,
        endpoints: {
          events: `/runs/${encodeURIComponent(session.key)}/events`,
          report: `/runs/${encodeURIComponent(session.key)}/report`,
        },
      });
      return;
    }

    if (request.method !== "GET") {
      writeJson(response, 405, {
        error: "Method not allowed.",
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

      if (!normalizeRunKey(runKey)) {
        writeJson(response, 400, {
          error:
            "Invalid runKey. Use only letters, numbers, underscores, or hyphens.",
        });
        return;
      }

      const session = ensureSession(runKey, sessions, options);
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

      if (!normalizeRunKey(runKey)) {
        writeJson(response, 400, {
          error:
            "Invalid runKey. Use only letters, numbers, underscores, or hyphens.",
        });
        return;
      }

      const session = ensureSession(runKey, sessions, options);
      attachEventStream(request, response, session);
      startSession(session, options);
      return;
    }

    writeJson(response, 404, {
      error: "Not found.",
    });
  });
}

function ensureSession(
  runKey: string,
  sessions: Map<string, RuntimeSession>,
  options: RuntimeApiServerOptions,
): RuntimeSession {
  const normalizedRunKey = normalizeRunKey(runKey);

  if (!normalizedRunKey) {
    throw new Error(`Invalid run key: ${runKey}`);
  }

  const existing = sessions.get(normalizedRunKey);

  if (existing) {
    return existing;
  }

  const createdAt = new Date().toISOString();
  const query = options.buildQuery?.(normalizedRunKey) ??
    buildDefaultQuery(normalizedRunKey, createdAt);
  const session = createSession(normalizedRunKey, query);
  sessions.set(normalizedRunKey, session);
  return session;
}

function replaceSession(
  session: RuntimeSession,
  sessions: Map<string, RuntimeSession>,
): RuntimeSession {
  const existing = sessions.get(session.key);

  if (existing) {
    closeSession(existing);
  }

  sessions.set(session.key, session);
  return session;
}

function buildSubmittedSession(
  runKey: string,
  payload: RuntimeRunCreatePayload,
): RuntimeSession {
  const createdAt = new Date().toISOString();
  const query = buildSubmittedQuery(runKey, payload, createdAt);
  return createSession(runKey, query);
}

function createSession(runKey: string, query: ResearchQuery): RuntimeSession {
  const createdAt = query.createdAt;
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
    events: [],
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

  for (const event of session.events) {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  }

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
  options: RuntimeApiServerOptions,
): void {
  if (session.execution) {
    return;
  }

  const eventSink: RuntimeEventSink = {
    publish: async (event) => {
      session.events.push(event);
      session.snapshot.run = applyRuntimeEvent(session.snapshot.run, event);
      broadcastEvent(session, event);
    },
  };

  session.execution = (async () => {
    try {
      const result = await options.orchestrator.run(session.query, {
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
      const failureEvent = createRunEvent({
        runId: session.runId,
        agentId: `runtime:${session.key}`,
        eventType: "agent_failed",
        title: "Runtime API execution failed.",
        payload: {
          error: message,
        },
      });
      session.events.push(failureEvent);
      broadcastEvent(session, failureEvent);
    }
  })();
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

function buildSubmittedQuery(
  runKey: string,
  payload: RuntimeRunCreatePayload,
  createdAt: string,
): ResearchQuery {
  const ticker = normalizeTicker(
    payload.ticker ?? inferTickerFromQuestion(payload.userQuestion),
  );

  if (!ticker) {
    throw new Error(
      "Unable to infer ticker from submitted question. Provide `ticker` explicitly.",
    );
  }

  return {
    queryId: `query:${runKey}:${randomUUID()}`,
    userQuestion: payload.userQuestion,
    ticker,
    timeHorizon:
      payload.timeHorizon ?? inferTimeHorizonFromQuestion(payload.userQuestion),
    caseType:
      payload.caseType ?? inferCaseTypeFromQuestion(payload.userQuestion),
    createdAt,
  };
}

async function readJsonBody(
  request: IncomingMessage,
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; statusCode: number; error: string }
> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();

  if (!rawBody) {
    return {
      ok: false,
      statusCode: 400,
      error: "Request body is required.",
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(rawBody),
    };
  } catch {
    return {
      ok: false,
      statusCode: 400,
      error: "Request body must be valid JSON.",
    };
  }
}

function parseRunCreatePayload(
  value: unknown,
): { ok: true; value: RuntimeRunCreatePayload } | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "Request body must be a JSON object.",
    };
  }

  const body = value as Record<string, unknown>;
  const queryNode =
    body.query && typeof body.query === "object"
      ? (body.query as Record<string, unknown>)
      : body;
  const userQuestion = queryNode.userQuestion;

  if (typeof userQuestion !== "string" || userQuestion.trim().length === 0) {
    return {
      ok: false,
      error: "Submitted query must include a non-empty `userQuestion`.",
    };
  }

  const payload: RuntimeRunCreatePayload = {
    userQuestion: userQuestion.trim(),
  };

  if (typeof body.runKey === "string") {
    payload.runKey = body.runKey.trim();
  }

  if (typeof queryNode.ticker === "string" && queryNode.ticker.trim().length > 0) {
    payload.ticker = queryNode.ticker.trim();
  }

  if (
    typeof queryNode.timeHorizon === "string" &&
    queryNode.timeHorizon.trim().length > 0
  ) {
    payload.timeHorizon = queryNode.timeHorizon.trim();
  }

  if (typeof queryNode.caseType === "string") {
    const caseType = queryNode.caseType.trim();

    if (
      caseType === "buy_decision" ||
      caseType === "risk_reward_check" ||
      caseType === "priced_in_check" ||
      caseType === "event_driven_view"
    ) {
      payload.caseType = caseType;
    }
  }

  return {
    ok: true,
    value: payload,
  };
}

function normalizeRunKey(value: string): string | null {
  const normalized = value.trim();

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeTicker(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{1,5}$/.test(normalized) ? normalized : null;
}

function inferTickerFromQuestion(question: string): string | null {
  const match = question.toUpperCase().match(/\b[A-Z]{1,5}\b/);
  return match?.[0] ?? null;
}

function inferTimeHorizonFromQuestion(question: string): string {
  const normalized = question.toLowerCase();

  if (
    normalized.includes("一年") ||
    normalized.includes("1年") ||
    normalized.includes("12m") ||
    normalized.includes("one year")
  ) {
    return "12m";
  }

  if (
    normalized.includes("六个月") ||
    normalized.includes("6个月") ||
    normalized.includes("6m") ||
    normalized.includes("six months")
  ) {
    return "6m";
  }

  if (
    normalized.includes("一个月") ||
    normalized.includes("1个月") ||
    normalized.includes("1m") ||
    normalized.includes("one month")
  ) {
    return "1m";
  }

  return "3m";
}

function inferCaseTypeFromQuestion(question: string): CaseType {
  const normalized = question.toLowerCase();

  if (
    normalized.includes("priced in") ||
    normalized.includes("price in") ||
    normalized.includes("预期") ||
    normalized.includes("pricein")
  ) {
    return "priced_in_check";
  }

  if (
    normalized.includes("风险收益") ||
    normalized.includes("risk/reward") ||
    normalized.includes("risk reward")
  ) {
    return "risk_reward_check";
  }

  if (
    normalized.includes("财报") ||
    normalized.includes("earnings") ||
    normalized.includes("event")
  ) {
    return "event_driven_view";
  }

  return "buy_decision";
}

function applyCors(
  response: ServerResponse<IncomingMessage>,
  corsOrigin: string,
): void {
  response.setHeader("Access-Control-Allow-Origin", corsOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
