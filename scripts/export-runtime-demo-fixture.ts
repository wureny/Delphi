import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { NoopGraphWriter } from "../src/research-graph/graph-writer.ts";
import {
  MemoryRuntimeEventSink,
  RuntimeOrchestrator,
} from "../src/orchestration/index.ts";
import {
  createEmptyTerminalSnapshot,
  createTerminalChunkFromRunEvent,
} from "../src/orchestration/terminal-stream.ts";
import {
  FixtureGraphContextReader,
  FixtureRuntimeDataAdapter,
  createFixtureExecutors,
} from "../src/orchestration/fixtures.ts";

async function main(): Promise<void> {
  const eventSink = new MemoryRuntimeEventSink();
  const orchestrator = new RuntimeOrchestrator({
    graphWriter: new NoopGraphWriter(),
    executors: createFixtureExecutors(),
    eventSink,
    dataAdapter: FixtureRuntimeDataAdapter.fromEnv({
      ...process.env,
      DELPHI_PERSIST_DATA_ARTIFACTS: "false",
    }),
    graphContextReader: new FixtureGraphContextReader(),
  });

  const result = await orchestrator.run({
    queryId: "query:demo:aapl",
    userQuestion: "AAPL 未来三个月值不值得买？",
    ticker: "AAPL",
    timeHorizon: "3m",
    caseType: "buy_decision",
    createdAt: "2026-03-18T00:00:00.000Z",
  });

  const terminalSnapshot = createEmptyTerminalSnapshot(result.run.runId);
  const terminalChunks = eventSink.events
    .map((event) => createTerminalChunkFromRunEvent(event))
    .filter((chunk) => chunk !== null);

  for (const chunk of terminalChunks) {
    terminalSnapshot.terminals[chunk.agentType].push(chunk.line);
  }

  const outputPath = resolve(
    process.cwd(),
    "frontend/public/fixtures/runtime-demo.json",
  );

  await mkdir(resolve(process.cwd(), "frontend/public/fixtures"), {
    recursive: true,
  });
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        meta: {
          source: "recorded_fixture",
          generatedAt: new Date().toISOString(),
          notes:
            "Generated from the real thread4 fixture runtime. Safe for frontend recorded-feed playback only.",
        },
        run: result.run,
        reportSections: result.reportSections,
        finalReport: result.finalReport,
        events: eventSink.events,
        terminalSnapshot,
        terminalChunks,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Wrote runtime demo fixture to ${outputPath}`);
}

await main();
