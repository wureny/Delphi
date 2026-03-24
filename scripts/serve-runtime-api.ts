import {
  createRuntimeApiServer,
  RuntimeOrchestrator,
} from "../src/orchestration/index.ts";
import { FixtureGraphContextReader } from "../src/orchestration/fixtures.ts";
import {
  resolveRuntimeDataAdapter,
  resolveRuntimeExecutors,
  resolveRuntimeGraphWriter,
} from "./runtime-support.ts";
import {
  Neo4jContextReader,
  createNeo4jDriverExecutor,
  readNeo4jConfigFromEnv,
} from "../src/research-graph/index.ts";

async function main(): Promise<void> {
  const host = process.env.RUNTIME_API_HOST ?? process.env.HOST ?? "0.0.0.0";
  const port = Number(process.env.RUNTIME_API_PORT ?? process.env.PORT ?? 8787);
  const corsOrigin = process.env.CORS_ORIGIN ?? "*";
  const dataAdapter = resolveRuntimeDataAdapter();
  const execution = resolveRuntimeExecutors();
  const graphWriter = resolveRuntimeGraphWriter();
  let graphContextReader:
    | ReturnType<typeof resolveRuntimeGraphContextReader>
    | null = null;

  try {
    graphContextReader = resolveRuntimeGraphContextReader(graphWriter.mode);

    const orchestrator = new RuntimeOrchestrator({
      graphWriter: graphWriter.writer,
      executors: execution.executors,
      dataAdapter,
      graphContextReader: graphContextReader.reader,
    });

    const server = createRuntimeApiServer({
      orchestrator,
      corsOrigin,
    });

    const shutdown = async (): Promise<void> => {
      server.close();
      await graphWriter.close();
      if (graphContextReader) {
        await graphContextReader.close();
      }
      process.exit(0);
    };

    process.once("SIGINT", () => {
      void shutdown();
    });
    process.once("SIGTERM", () => {
      void shutdown();
    });

    server.listen(port, host, () => {
      console.log(`Runtime API listening at http://${host}:${port}`);
      console.log(`Run creation endpoint: http://${host}:${port}/runs`);
      console.log(`SSE endpoint: http://${host}:${port}/runs/demo/events`);
      console.log(`Snapshot endpoint: http://${host}:${port}/runs/demo/report`);
      console.log(`Terminal snapshot endpoint: http://${host}:${port}/runs/demo/terminals`);
      console.log(`Terminal stream endpoint: http://${host}:${port}/runs/demo/terminal-stream`);
      console.log(`Data mode: ${process.env.RUNTIME_DATA_MODE ?? "fixture"}`);
      console.log(`Execution mode: ${execution.mode}`);
      console.log(`Graph writer mode: ${graphWriter.mode}`);
      console.log(`Graph context reader mode: ${graphContextReader.mode}`);
      console.log(`CORS origin: ${corsOrigin}`);
    });
  } catch (error) {
    await graphWriter.close();
    if (graphContextReader) {
      await graphContextReader.close();
    }
    throw error;
  }
}

await main();

function resolveRuntimeGraphContextReader(mode: "noop" | "neo4j"): {
  reader: FixtureGraphContextReader | Neo4jContextReader;
  mode: "fixture" | "neo4j";
  close(): Promise<void>;
} {
  if (mode === "neo4j") {
    const executor = createNeo4jDriverExecutor(readNeo4jConfigFromEnv());
    const reader = new Neo4jContextReader(executor);

    return {
      reader,
      mode: "neo4j",
      async close(): Promise<void> {
        await executor.close();
      },
    };
  }

  return {
    reader: new FixtureGraphContextReader(),
    mode: "fixture",
    async close(): Promise<void> {
      return Promise.resolve();
    },
  };
}
