import {
  createRuntimeApiServer,
  RuntimeOrchestrator,
} from "../src/orchestration/index.ts";
import { NoopGraphWriter } from "../src/research-graph/graph-writer.ts";
import {
  OpenBBRuntimeDataAdapter,
} from "../src/data-layer/index.ts";
import {
  FixtureGraphContextReader,
  FixtureRuntimeDataAdapter,
  createFixtureExecutors,
} from "../src/orchestration/fixtures.ts";

async function main(): Promise<void> {
  const host = process.env.RUNTIME_API_HOST ?? "127.0.0.1";
  const port = Number(process.env.RUNTIME_API_PORT ?? 8787);
  const dataAdapter = resolveDataAdapter();

  const orchestrator = new RuntimeOrchestrator({
    graphWriter: new NoopGraphWriter(),
    executors: createFixtureExecutors(),
    dataAdapter,
    graphContextReader: new FixtureGraphContextReader(),
  });

  const server = createRuntimeApiServer({
    orchestrator,
  });

  server.listen(port, host, () => {
    console.log(`Runtime API listening at http://${host}:${port}`);
    console.log(`SSE endpoint: http://${host}:${port}/runs/demo/events`);
    console.log(`Snapshot endpoint: http://${host}:${port}/runs/demo/report`);
    console.log(`Data mode: ${process.env.RUNTIME_DATA_MODE ?? "fixture"}`);
    console.log("Graph writer: noop (explicit local demo mode)");
  });
}

function resolveDataAdapter(): FixtureRuntimeDataAdapter | OpenBBRuntimeDataAdapter {
  const mode = process.env.RUNTIME_DATA_MODE ?? "fixture";

  if (mode === "openbb") {
    return OpenBBRuntimeDataAdapter.fromEnv();
  }

  return FixtureRuntimeDataAdapter.fromEnv();
}

await main();
