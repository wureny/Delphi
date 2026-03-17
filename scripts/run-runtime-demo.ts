import {
  NoopGraphWriter,
} from "../src/research-graph/graph-writer.ts";
import {
  CompositeRuntimeEventSink,
  MemoryRuntimeEventSink,
  RuntimeOrchestrator,
} from "../src/orchestration/index.ts";
import {
  OpenBBRuntimeDataAdapter,
  isInspectableRuntimeDataAdapter,
} from "../src/data-layer/index.ts";
import {
  ConsoleRuntimeEventSink,
  FixtureGraphContextReader,
  FixtureRuntimeDataAdapter,
  createFixtureExecutors,
} from "../src/orchestration/fixtures.ts";

async function main(): Promise<void> {
  const dataAdapter = resolveDataAdapter();
  const memorySink = new MemoryRuntimeEventSink();
  const consoleSink = new ConsoleRuntimeEventSink();
  const eventSink = new CompositeRuntimeEventSink([consoleSink, memorySink]);

  const orchestrator = new RuntimeOrchestrator({
    graphWriter: new NoopGraphWriter(),
    executors: createFixtureExecutors(),
    eventSink,
    dataAdapter,
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
  const artifacts = isInspectableRuntimeDataAdapter(dataAdapter)
    ? dataAdapter.getArtifacts(result.run.runId)
    : null;
  console.log(JSON.stringify(
    {
      dataMode: process.env.RUNTIME_DATA_MODE ?? "fixture",
      runId: result.run.runId,
      status: result.run.status,
      findings: result.findings.length,
      decisionId: result.decision?.decisionId ?? null,
      reportId: result.finalReport?.reportId ?? null,
      sectionKeys: result.reportSections.map((section) => section.sectionKey),
      eventCount: memorySink.events.length,
      evidenceCandidateCount: countEvidenceCandidates(artifacts),
      adapterDegradedReasons: artifacts
        ? [
            ...(artifacts.company?.degradedReasons ?? []),
            ...(artifacts.news?.degradedReasons ?? []),
            ...(artifacts.market?.degradedReasons ?? []),
            ...(artifacts.macro?.degradedReasons ?? []),
          ]
        : [],
    },
    null,
    2,
  ));
}

function resolveDataAdapter(): FixtureRuntimeDataAdapter | OpenBBRuntimeDataAdapter {
  const mode = process.env.RUNTIME_DATA_MODE ?? "fixture";

  if (mode === "openbb") {
    return OpenBBRuntimeDataAdapter.fromEnv();
  }

  return new FixtureRuntimeDataAdapter();
}

function countEvidenceCandidates(
  artifacts: ReturnType<OpenBBRuntimeDataAdapter["getArtifacts"]>,
): number {
  if (!artifacts) {
    return 0;
  }

  return (
    (artifacts.company?.evidenceCandidates.length ?? 0) +
    (artifacts.news?.evidenceCandidates.length ?? 0) +
    (artifacts.market?.evidenceCandidates.length ?? 0) +
    (artifacts.macro?.evidenceCandidates.length ?? 0)
  );
}

await main();
