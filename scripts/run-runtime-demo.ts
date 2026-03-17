import {
  NoopGraphWriter,
} from "../src/research-graph/graph-writer.ts";
import {
  CompositeRuntimeEventSink,
  MemoryRuntimeEventSink,
  RuntimeOrchestrator,
} from "../src/orchestration/index.ts";
import {
  ConsoleRuntimeEventSink,
  FixtureGraphContextReader,
  FixtureRuntimeDataAdapter,
  createFixtureExecutors,
} from "../src/orchestration/fixtures.ts";

async function main(): Promise<void> {
  const memorySink = new MemoryRuntimeEventSink();
  const consoleSink = new ConsoleRuntimeEventSink();
  const eventSink = new CompositeRuntimeEventSink([consoleSink, memorySink]);

  const orchestrator = new RuntimeOrchestrator({
    graphWriter: new NoopGraphWriter(),
    executors: createFixtureExecutors(),
    eventSink,
    dataAdapter: new FixtureRuntimeDataAdapter(),
    graphContextReader: new FixtureGraphContextReader(),
  });

  const result = await orchestrator.run({
    queryId: "query:demo:aapl",
    userQuestion: "AAPL 未来三个月值不值得买？",
    ticker: "AAPL",
    timeHorizon: "3m",
    caseType: "buy_decision",
    createdAt: new Date().toISOString(),
  });

  console.log("");
  console.log("Run Summary");
  console.log(JSON.stringify(
    {
      runId: result.run.runId,
      status: result.run.status,
      findings: result.findings.length,
      decisionId: result.decision?.decisionId ?? null,
      reportId: result.finalReport?.reportId ?? null,
      sectionKeys: result.reportSections.map((section) => section.sectionKey),
      eventCount: memorySink.events.length,
    },
    null,
    2,
  ));
}

await main();
