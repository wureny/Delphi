interface RunRecord {
  runId: string;
  status: string;
  degradedReasons: string[];
}

interface ReportSectionRecord {
  sectionKey: string;
  status: string;
  content: string;
}

interface RunSnapshot {
  run: RunRecord;
  reportSections: ReportSectionRecord[];
  finalReport: {
    reportId: string;
  } | null;
}

interface RuntimeEvent {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

interface TerminalStreamChunk {
  chunkId: string;
  agentType: string;
  line: {
    text: string;
  };
}

type SmokeScenarioKey = "gold" | "openbb-degraded" | "graph-degraded" | "terminal";

interface SmokeScenario {
  runKey: string;
  userQuestion: string;
  ticker: string;
  expectStatus: "completed" | "degraded";
  requiredEventTypes: string[];
  forbiddenEventTypes?: string[];
  requireTerminalChunk: boolean;
  diagnosticTextIncludes?: string;
}

const scenarioKey = normalizeScenarioKey(process.argv[2] ?? "gold");

if (!scenarioKey) {
  throw new Error("Usage: npm run runtime:smoke -- <gold|openbb-degraded|graph-degraded|terminal>");
}

const runtimeBaseUrl = normalizeBaseUrl(
  process.env.RUNTIME_SMOKE_BASE_URL ??
    process.env.RUNTIME_API_BASE_URL ??
    "http://127.0.0.1:8787",
);

const scenarios: Record<SmokeScenarioKey, SmokeScenario> = {
  gold: {
    runKey: process.env.RUNTIME_SMOKE_GOLD_RUN_KEY ?? "smoke_gold",
    userQuestion:
      process.env.RUNTIME_SMOKE_GOLD_QUERY ?? "AAPL 未来三个月值不值得买？",
    ticker: process.env.RUNTIME_SMOKE_GOLD_TICKER ?? "AAPL",
    expectStatus: "completed",
    requiredEventTypes: ["run_created", "planner_completed", "report_ready"],
    forbiddenEventTypes: ["degraded_mode_entered", "patch_rejected", "agent_failed"],
    requireTerminalChunk: true,
  },
  "openbb-degraded": {
    runKey:
      process.env.RUNTIME_SMOKE_OPENBB_DEGRADED_RUN_KEY ??
      "smoke_openbb_degraded",
    userQuestion:
      process.env.RUNTIME_SMOKE_OPENBB_DEGRADED_QUERY ??
      "AAPL 未来三个月值不值得买？",
    ticker: process.env.RUNTIME_SMOKE_OPENBB_DEGRADED_TICKER ?? "AAPL",
    expectStatus: "degraded",
    requiredEventTypes: ["run_created", "degraded_mode_entered", "report_ready"],
    requireTerminalChunk: true,
    diagnosticTextIncludes: "OpenBB",
  },
  "graph-degraded": {
    runKey:
      process.env.RUNTIME_SMOKE_GRAPH_DEGRADED_RUN_KEY ??
      "smoke_graph_degraded",
    userQuestion:
      process.env.RUNTIME_SMOKE_GRAPH_DEGRADED_QUERY ??
      "AAPL 未来三个月值不值得买？",
    ticker: process.env.RUNTIME_SMOKE_GRAPH_DEGRADED_TICKER ?? "AAPL",
    expectStatus: "degraded",
    requiredEventTypes: [
      "run_created",
      "patch_rejected",
      "degraded_mode_entered",
      "report_ready",
    ],
    requireTerminalChunk: true,
    diagnosticTextIncludes: "graph writer failure",
  },
  terminal: {
    runKey: process.env.RUNTIME_SMOKE_TERMINAL_RUN_KEY ?? "smoke_terminal",
    userQuestion:
      process.env.RUNTIME_SMOKE_TERMINAL_QUERY ?? "AAPL 未来三个月值不值得买？",
    ticker: process.env.RUNTIME_SMOKE_TERMINAL_TICKER ?? "AAPL",
    expectStatus: "completed",
    requiredEventTypes: ["run_created", "report_ready"],
    forbiddenEventTypes: ["degraded_mode_entered", "agent_failed"],
    requireTerminalChunk: true,
  },
};

await main(scenarios[scenarioKey]);

async function main(scenario: SmokeScenario): Promise<void> {
  const controller = new AbortController();
  const created = await createRun(runtimeBaseUrl, scenario);
  const events: RuntimeEvent[] = [];
  const terminalChunks: TerminalStreamChunk[] = [];

  const eventConsumer = consumeSse<RuntimeEvent>(
    resolveEndpoint(runtimeBaseUrl, created.endpoints.events),
    controller.signal,
    (message) => {
      events.push(message);
    },
  );
  const terminalConsumer = consumeSse<TerminalStreamChunk>(
    resolveEndpoint(runtimeBaseUrl, created.endpoints.terminalStream),
    controller.signal,
    (message) => {
      terminalChunks.push(message);
    },
  );

  const report = await waitForTerminalRunState(
    resolveEndpoint(runtimeBaseUrl, created.endpoints.report),
  );

  await delay(500);
  controller.abort();
  await Promise.allSettled([eventConsumer, terminalConsumer]);

  assertSmokeScenario(scenario, report, events, terminalChunks);

  console.log(
    JSON.stringify(
      {
        ok: true,
        scenario: scenario.runKey,
        runtimeBaseUrl,
        runId: report.run.runId,
        runStatus: report.run.status,
        degradedReasons: report.run.degradedReasons,
        eventTypes: unique(events.map((event) => event.eventType)),
        terminalChunkCount: terminalChunks.length,
        terminalAgents: unique(terminalChunks.map((chunk) => chunk.agentType)),
        reportSections: report.reportSections.map((section) => ({
          key: section.sectionKey,
          status: section.status,
          hasContent: section.content.trim().length > 0,
        })),
      },
      null,
      2,
    ),
  );
}

async function createRun(
  baseUrl: string,
  scenario: SmokeScenario,
): Promise<{
  endpoints: {
    events: string;
    report: string;
    terminalStream: string;
  };
}> {
  const response = await fetch(`${baseUrl}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      runKey: scenario.runKey,
      query: {
        userQuestion: scenario.userQuestion,
        ticker: scenario.ticker,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Run creation failed with status ${response.status}.`);
  }

  const payload = await response.json() as {
    endpoints?: {
      events?: string;
      report?: string;
      terminalStream?: string;
    };
  };
  const endpoints = payload.endpoints;

  if (!endpoints?.events || !endpoints.report || !endpoints.terminalStream) {
    throw new Error("Run creation response is missing runtime endpoints.");
  }

  return {
    endpoints: {
      events: endpoints.events,
      report: endpoints.report,
      terminalStream: endpoints.terminalStream,
    },
  };
}

async function consumeSse<T>(
  url: string,
  signal: AbortSignal,
  onMessage: (message: T) => void,
): Promise<void> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/event-stream",
    },
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`SSE request failed for ${url} with status ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const next = await reader.read();

      if (next.done) {
        break;
      }

      buffer += decoder.decode(next.value, { stream: true });

      while (true) {
        const boundary = buffer.indexOf("\n\n");

        if (boundary === -1) {
          break;
        }

        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => line.slice(6))
          .join("\n")
          .trim();

        if (!data) {
          continue;
        }

        onMessage(JSON.parse(data) as T);
      }
    }
  } catch (error) {
    if (!isAbortError(error)) {
      throw error;
    }
  } finally {
    reader.releaseLock();
  }
}

async function waitForTerminalRunState(reportUrl: string): Promise<RunSnapshot> {
  const timeoutAt = Date.now() + Number(process.env.RUNTIME_SMOKE_TIMEOUT_MS ?? 60000);

  while (Date.now() < timeoutAt) {
    const response = await fetch(reportUrl);

    if (!response.ok) {
      throw new Error(`Report polling failed with status ${response.status}.`);
    }

    const snapshot = await response.json() as RunSnapshot;

    if (
      snapshot.run.status === "completed" ||
      snapshot.run.status === "degraded" ||
      snapshot.run.status === "failed"
    ) {
      return snapshot;
    }

    await delay(500);
  }

  throw new Error("Timed out waiting for terminal run state.");
}

function assertSmokeScenario(
  scenario: SmokeScenario,
  report: RunSnapshot,
  events: RuntimeEvent[],
  terminalChunks: TerminalStreamChunk[],
): void {
  if (report.run.status !== scenario.expectStatus) {
    throw new Error(
      `Expected run status ${scenario.expectStatus}, received ${report.run.status}.`,
    );
  }

  if (report.finalReport === null) {
    throw new Error("Expected finalReport to be present in report snapshot.");
  }

  const sectionKeys = report.reportSections.map((section) => section.sectionKey);

  if (report.reportSections.length !== 6) {
    throw new Error(`Expected 6 report sections, received ${report.reportSections.length}.`);
  }

  for (const requiredKey of [
    "final_judgment",
    "core_thesis",
    "supporting_evidence",
    "key_risks",
    "liquidity_context",
    "what_changes_the_view",
  ]) {
    if (!sectionKeys.includes(requiredKey)) {
      throw new Error(`Missing report section ${requiredKey}.`);
    }
  }

  for (const eventType of scenario.requiredEventTypes) {
    if (!events.some((event) => event.eventType === eventType)) {
      throw new Error(`Missing required event type ${eventType}.`);
    }
  }

  for (const eventType of scenario.forbiddenEventTypes ?? []) {
    if (events.some((event) => event.eventType === eventType)) {
      throw new Error(`Unexpected event type ${eventType}.`);
    }
  }

  if (scenario.requireTerminalChunk && terminalChunks.length === 0) {
    throw new Error("Expected terminal stream to emit at least one chunk.");
  }

  if (
    scenario.diagnosticTextIncludes &&
    !hasDiagnosticText(report, events, scenario.diagnosticTextIncludes)
  ) {
    throw new Error(
      `Expected diagnostic text containing "${scenario.diagnosticTextIncludes}".`,
    );
  }
}

function hasDiagnosticText(
  report: RunSnapshot,
  events: RuntimeEvent[],
  expectedText: string,
): boolean {
  const haystacks = [
    ...report.run.degradedReasons,
    ...events.flatMap((event) => flattenPayloadStrings(event.payload)),
  ];

  return haystacks.some((value) => value.includes(expectedText));
}

function normalizeScenarioKey(value: string): SmokeScenarioKey | null {
  if (
    value === "gold" ||
    value === "openbb-degraded" ||
    value === "graph-degraded" ||
    value === "terminal"
  ) {
    return value;
  }

  return null;
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveEndpoint(baseUrl: string, endpoint: string): string {
  return new URL(endpoint, `${baseUrl}/`).toString();
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function flattenPayloadStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenPayloadStrings(entry));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((entry) => flattenPayloadStrings(entry));
  }

  return [];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
