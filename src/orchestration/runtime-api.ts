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
import {
  createEmptyTerminalSnapshot,
  createTerminalChunkFromRunEvent,
  type TerminalSnapshot,
  type TerminalStreamChunk,
} from "./terminal-stream.ts";

type RunSnapshot = {
  run: RunRecord;
  reportSections: ReportSectionRecord[];
  finalReport: FinalReport | null;
};

type ResearchMapTone = "primary" | "supporting" | "signal" | "caution" | "watch";

type ResearchMapStatus = "ready" | "partial" | "waiting";

type ResearchMapCard = {
  cardId: string;
  label: string;
  tone: ResearchMapTone;
  status: ResearchMapStatus;
  summary: string;
  findingRefs: string[];
  evidenceRefs: string[];
  objectRefs: string[];
};

type ResearchMapSnapshot = {
  runId: string;
  caseId: string;
  status: RunRecord["status"];
  headline: string;
  summary: string;
  updatedAt: string;
  cards: ResearchMapCard[];
  evidenceTrail: string[];
};

type GraphSnapshotNodeKind =
  | "case"
  | "section"
  | "finding"
  | "object"
  | "evidence";

type GraphSnapshotNode = {
  nodeId: string;
  label: string;
  kind: GraphSnapshotNodeKind;
  summary: string;
  emphasis: "primary" | "supporting" | "caution" | "neutral";
};

type GraphSnapshotEdge = {
  edgeId: string;
  from: string;
  to: string;
  label: string;
};

type GraphSnapshot = {
  runId: string;
  caseId: string;
  status: RunRecord["status"];
  headline: string;
  summary: string;
  updatedAt: string;
  nodes: GraphSnapshotNode[];
  edges: GraphSnapshotEdge[];
};

interface RuntimeSession {
  key: string;
  query: ResearchQuery;
  snapshot: RunSnapshot;
  terminalSnapshot: TerminalSnapshot;
  runId: string;
  caseId: string;
  createdAt: string;
  events: RunEvent[];
  terminalChunks: TerminalStreamChunk[];
  eventListeners: Set<ServerResponse<IncomingMessage>>;
  terminalListeners: Set<ServerResponse<IncomingMessage>>;
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
          researchMap: `/runs/${encodeURIComponent(session.key)}/research-map`,
          graphSnapshot: `/runs/${encodeURIComponent(session.key)}/graph-snapshot`,
          terminals: `/runs/${encodeURIComponent(session.key)}/terminals`,
          terminalStream: `/runs/${encodeURIComponent(session.key)}/terminal-stream`,
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

    const researchMapMatch = requestUrl.pathname.match(
      /^\/runs\/([^/]+)\/research-map$/,
    );

    if (researchMapMatch) {
      const runKey = researchMapMatch[1];

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
      writeJson(response, 200, buildResearchMapSnapshot(session.snapshot, session.events));
      return;
    }

    const graphSnapshotMatch = requestUrl.pathname.match(
      /^\/runs\/([^/]+)\/graph-snapshot$/,
    );

    if (graphSnapshotMatch) {
      const runKey = graphSnapshotMatch[1];

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
      writeJson(response, 200, buildGraphSnapshot(session.snapshot, session.events));
      return;
    }

    const terminalsMatch = requestUrl.pathname.match(/^\/runs\/([^/]+)\/terminals$/);

    if (terminalsMatch) {
      const runKey = terminalsMatch[1];

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
      writeJson(response, 200, session.terminalSnapshot);
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

    const terminalStreamMatch = requestUrl.pathname.match(/^\/runs\/([^/]+)\/terminal-stream$/);

    if (terminalStreamMatch) {
      const runKey = terminalStreamMatch[1];

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
      attachTerminalStream(request, response, session);
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
    terminalSnapshot: createEmptyTerminalSnapshot(runId),
    runId,
    caseId,
    createdAt,
    events: [],
    terminalChunks: [],
    eventListeners: new Set(),
    terminalListeners: new Set(),
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
  session.eventListeners.add(response);

  for (const event of session.events) {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  request.on("close", () => {
    session.eventListeners.delete(response);
  });
}

function attachTerminalStream(
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
  session.terminalListeners.add(response);

  for (const chunk of session.terminalChunks) {
    response.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  request.on("close", () => {
    session.terminalListeners.delete(response);
  });
}

function closeSession(session: RuntimeSession): void {
  for (const listener of session.eventListeners) {
    listener.end();
  }

  for (const listener of session.terminalListeners) {
    listener.end();
  }

  session.eventListeners.clear();
  session.terminalListeners.clear();
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
      session.snapshot = applyRuntimeSnapshotEvent(session.snapshot, event);
      broadcastEvent(session, event);
      broadcastTerminalChunk(session, event);
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
      broadcastTerminalChunk(session, failureEvent);
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
  for (const listener of session.eventListeners) {
    listener.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

function broadcastTerminalChunk(session: RuntimeSession, event: RunEvent): void {
  const chunk = createTerminalChunkFromRunEvent(event);

  if (!chunk) {
    return;
  }

  session.terminalChunks.push(chunk);
  session.terminalSnapshot.terminals[chunk.agentType].push(chunk.line);

  for (const listener of session.terminalListeners) {
    listener.write(`data: ${JSON.stringify(chunk)}\n\n`);
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

function applyRuntimeSnapshotEvent(
  snapshot: RunSnapshot,
  event: RunEvent,
): RunSnapshot {
  if (event.eventType !== "report_section_ready") {
    return snapshot;
  }

  const section = event.payload as Partial<ReportSectionRecord> & {
    sectionKey?: ReportSectionRecord["sectionKey"];
  };

  if (!section.sectionKey) {
    return snapshot;
  }

  return {
    ...snapshot,
    reportSections: snapshot.reportSections.map((current) =>
      current.sectionKey === section.sectionKey
        ? {
            ...current,
            ...section,
            sectionKey: current.sectionKey,
          }
        : current,
    ),
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

function buildResearchMapSnapshot(
  snapshot: RunSnapshot,
  events: readonly RunEvent[],
): ResearchMapSnapshot {
  const latestFindings = collectLatestFindingEvents(events);
  const finalJudgment = readSection(snapshot.reportSections, "final_judgment");
  const coreThesis = readSection(snapshot.reportSections, "core_thesis");
  const liquidityContext = readSection(snapshot.reportSections, "liquidity_context");
  const keyRisks = readSection(snapshot.reportSections, "key_risks");
  const watchpoints = readSection(snapshot.reportSections, "what_changes_the_view");
  const supportingEvidence = readSection(
    snapshot.reportSections,
    "supporting_evidence",
  );
  const marketSignalFinding = latestFindings.market_signal;
  const evidenceTrail = [
    ...supportingEvidence.citationFindingRefs,
    ...supportingEvidence.citationEvidenceRefs,
    ...supportingEvidence.citationObjectRefs,
  ].slice(0, 8);

  return {
    runId: snapshot.run.runId,
    caseId: snapshot.run.caseId,
    status: snapshot.run.status,
    headline:
      finalJudgment.content.trim() ||
      supportingEvidence.content.trim() ||
      "Delphi is still assembling the current view.",
    summary: buildResearchMapSummary(snapshot.run, latestFindings),
    updatedAt: snapshot.run.updatedAt,
    cards: [
      buildResearchMapCard({
        cardId: "current_view",
        label: "Current View",
        tone: "primary",
        section: finalJudgment,
      }),
      buildResearchMapCard({
        cardId: "core_thesis",
        label: "Core Thesis",
        tone: "supporting",
        section: coreThesis,
      }),
      buildResearchMapCard({
        cardId: "market_signal",
        label: "Market Signal",
        tone: "signal",
        section: {
          title: "Market Signal",
          content:
            readEventString(marketSignalFinding, "claim") ??
            "Market signal lane is still updating its latest read.",
          citationFindingRefs: readEventString(marketSignalFinding, "findingId")
            ? [readEventString(marketSignalFinding, "findingId") as string]
            : [],
          citationEvidenceRefs: readEventStringArray(
            marketSignalFinding,
            "evidenceRefs",
          ),
          citationObjectRefs: readEventStringArray(
            marketSignalFinding,
            "objectRefs",
          ),
          status: marketSignalFinding ? "ready" : "empty",
        },
      }),
      buildResearchMapCard({
        cardId: "liquidity_context",
        label: "Liquidity Context",
        tone: "supporting",
        section: liquidityContext,
      }),
      buildResearchMapCard({
        cardId: "key_risks",
        label: "Key Risks",
        tone: "caution",
        section: keyRisks,
      }),
      buildResearchMapCard({
        cardId: "watchpoints",
        label: "What Would Change the View",
        tone: "watch",
        section: watchpoints,
      }),
    ],
    evidenceTrail,
  };
}

function buildGraphSnapshot(
  snapshot: RunSnapshot,
  events: readonly RunEvent[],
): GraphSnapshot {
  const nodes = new Map<string, GraphSnapshotNode>();
  const edges = new Map<string, GraphSnapshotEdge>();

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
    nodeId: snapshot.run.caseId,
    label: `${snapshot.run.query.ticker} · ${snapshot.run.query.timeHorizon}`,
    kind: "case",
    summary: snapshot.run.query.userQuestion,
    emphasis: "primary",
  });

  for (const section of snapshot.reportSections) {
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
      edgeId: `edge:${snapshot.run.caseId}:${section.sectionId}:section`,
      from: snapshot.run.caseId,
      to: section.sectionId,
      label: "section",
    });

    for (const findingRef of section.citationFindingRefs) {
      const findingEvent = findFindingEvent(events, findingRef);
      putNode({
        nodeId: findingRef,
        label: findingEvent ? formatFindingLabel(findingEvent) : "Research Finding",
        kind: "finding",
        summary:
          readEventString(findingEvent, "claim") ??
          "A structured research point feeding the current answer.",
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
        label: formatObjectLabel(objectRef),
        kind: "object",
        summary: summarizeObjectRef(objectRef),
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
        summary: summarizeEvidenceRef(evidenceRef),
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

  const finalJudgment = readSection(snapshot.reportSections, "final_judgment");

  return {
    runId: snapshot.run.runId,
    caseId: snapshot.run.caseId,
    status: snapshot.run.status,
    headline:
      finalJudgment.content.trim() ||
      "This structure updates as Delphi connects the current investment case.",
    summary:
      "This view shows how Delphi links the case, the live report sections, the key findings, and the supporting evidence behind the current answer.",
    updatedAt: snapshot.run.updatedAt,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
}

function buildResearchMapSummary(
  run: RunRecord,
  latestFindings: Partial<Record<"thesis" | "liquidity" | "market_signal", RunEvent>>,
): string {
  const activeLanes = [
    latestFindings.thesis ? "thesis" : null,
    latestFindings.liquidity ? "liquidity" : null,
    latestFindings.market_signal ? "market signal" : null,
  ].filter((value): value is string => Boolean(value));

  if (run.status === "completed" || run.status === "degraded") {
    return activeLanes.length > 0
      ? `This view is anchored by ${activeLanes.join(", ")} inputs and the current evidence trail.`
      : "This view is anchored by the current report sections and evidence trail.";
  }

  return activeLanes.length > 0
    ? `Delphi is still connecting ${activeLanes.join(", ")} inputs into one investment view.`
    : "Delphi is still building the structured investment map.";
}

function findFindingEvent(
  events: readonly RunEvent[],
  findingRef: string,
): RunEvent | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (
      event &&
      event.eventType === "finding_created" &&
      readEventString(event, "findingId") === findingRef
    ) {
      return event;
    }
  }

  return null;
}

function formatFindingLabel(event: RunEvent): string {
  const agentType = readEventString(event, "agentType");

  if (agentType === "thesis") return "Core Thesis";
  if (agentType === "liquidity") return "Liquidity Read";
  if (agentType === "market_signal") return "Market Signal";
  if (agentType === "judge") return "Judge Synthesis";
  return "Research Finding";
}

function formatObjectLabel(objectRef: string): string {
  if (objectRef.startsWith("thesis:")) {
    return "Core Thesis";
  }

  if (objectRef.startsWith("risk:")) {
    return "Key Risk";
  }

  if (objectRef.startsWith("liquidityregime:")) {
    return "Liquidity Context";
  }

  if (objectRef.startsWith("liquidityfactor:")) {
    return "Liquidity Factor";
  }

  if (objectRef.startsWith("macroactoraction:")) {
    return "Macro Driver";
  }

  if (objectRef.startsWith("marketsignal:")) {
    return "Market Signal";
  }

  if (objectRef.startsWith("judgment:")) {
    return "Stored View";
  }

  return "Structured Insight";
}

function summarizeObjectRef(objectRef: string): string {
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

function summarizeEvidenceRef(_evidenceRef: string): string {
  return "An evidence reference captured during the run and linked back to the answer.";
}

function buildResearchMapCard(input: {
  cardId: string;
  label: string;
  tone: ResearchMapTone;
  section: Pick<
    ReportSectionRecord,
    | "title"
    | "content"
    | "citationFindingRefs"
    | "citationEvidenceRefs"
    | "citationObjectRefs"
    | "status"
  >;
}): ResearchMapCard {
  const content = input.section.content.trim();

  return {
    cardId: input.cardId,
    label: input.label,
    tone: input.tone,
    status:
      input.section.status === "ready"
        ? "ready"
        : content.length > 0
          ? "partial"
          : "waiting",
    summary: content || `${input.label} is still being assembled.`,
    findingRefs: input.section.citationFindingRefs,
    evidenceRefs: input.section.citationEvidenceRefs,
    objectRefs: input.section.citationObjectRefs,
  };
}

function collectLatestFindingEvents(
  events: readonly RunEvent[],
): Partial<Record<"thesis" | "liquidity" | "market_signal", RunEvent>> {
  const latest: Partial<Record<"thesis" | "liquidity" | "market_signal", RunEvent>> = {};

  for (const event of events) {
    if (event.eventType !== "finding_created") {
      continue;
    }

    const agentType = readEventString(event, "agentType");

    if (
      agentType === "thesis" ||
      agentType === "liquidity" ||
      agentType === "market_signal"
    ) {
      latest[agentType] = event;
    }
  }

  return latest;
}

function readSection(
  sections: readonly ReportSectionRecord[],
  key: ReportSectionRecord["sectionKey"],
): ReportSectionRecord {
  const section = sections.find((current) => current.sectionKey === key);

  return (
    section ?? {
      sectionId: `section:pending:${key}`,
      runId: "run:pending",
      sectionKey: key,
      title: key,
      content: "",
      citationFindingRefs: [],
      citationEvidenceRefs: [],
      citationObjectRefs: [],
      status: "empty",
    }
  );
}

function readEventString(event: RunEvent | null | undefined, key: string): string | null {
  if (!event) {
    return null;
  }

  const value = event.payload[key];
  return typeof value === "string" ? value : null;
}

function readEventStringArray(event: RunEvent | null | undefined, key: string): string[] {
  if (!event) {
    return [];
  }

  const value = event.payload[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}
