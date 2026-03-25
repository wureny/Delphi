import { randomUUID } from "node:crypto";

import {
  CompositeRuntimeEventSink,
  MemoryRuntimeEventSink,
  RuntimeOrchestrator,
} from "../src/orchestration/index.ts";
import {
  isInspectableRuntimeDataAdapter,
} from "../src/data-layer/index.ts";
import {
  ConsoleRuntimeEventSink,
} from "../src/orchestration/fixtures.ts";
import {
  resolveRuntimeDataAdapter,
  resolveRuntimeExecutors,
  resolveRuntimeGraphContextReader,
  resolveRuntimeGraphWriter,
} from "./runtime-support.ts";

async function main(): Promise<void> {
  const dataAdapter = resolveRuntimeDataAdapter();
  const execution = resolveRuntimeExecutors();
  const graphWriter = resolveRuntimeGraphWriter();
  const graphContextReader = resolveRuntimeGraphContextReader();
  const memorySink = new MemoryRuntimeEventSink();
  const consoleSink = new ConsoleRuntimeEventSink();
  const eventSink = new CompositeRuntimeEventSink([consoleSink, memorySink]);

  try {
    const orchestrator = new RuntimeOrchestrator({
      graphWriter: graphWriter.writer,
      executors: execution.executors,
      eventSink,
      dataAdapter,
      graphContextReader: graphContextReader.reader,
    });

    const result = await orchestrator.run({
      queryId: `query:demo:aapl:${randomUUID()}`,
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
        executionMode: execution.mode,
        graphMode: graphWriter.mode,
        runId: result.run.runId,
        status: result.run.status,
        findings: result.findings.length,
        decisionId: result.decision?.decisionId ?? null,
        reportId: result.finalReport?.reportId ?? null,
        sectionKeys: result.reportSections.map((section) => section.sectionKey),
        updatedObjectCount: result.finalReport?.updatedObjectRefs.length ?? 0,
        updatedObjectTypes: result.finalReport?.updatedObjectTypes ?? [],
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
  } finally {
    await graphContextReader.close();
    await graphWriter.close();
  }
}

function countEvidenceCandidates(
  artifacts: ReturnType<typeof dataArtifactsFromAdapter>,
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

function dataArtifactsFromAdapter(
  adapter: ReturnType<typeof resolveRuntimeDataAdapter>,
  runId: string,
) {
  return isInspectableRuntimeDataAdapter(adapter)
    ? adapter.getArtifacts(runId)
    : null;
}

await main();
