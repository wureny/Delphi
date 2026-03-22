import {
  createRuntimeApiServer,
  RuntimeOrchestrator,
} from "../src/orchestration/index.ts";
import {
  FixtureGraphContextReader,
} from "../src/orchestration/fixtures.ts";
import {
  resolveRuntimeDataAdapter,
  resolveRuntimeExecutors,
  resolveRuntimeGraphWriter,
} from "./runtime-support.ts";

async function main(): Promise<void> {
  const host = process.env.RUNTIME_API_HOST ?? "127.0.0.1";
  const port = Number(process.env.RUNTIME_API_PORT ?? 8787);
  const corsOrigin = process.env.CORS_ORIGIN ?? "*";
  const dataAdapter = resolveRuntimeDataAdapter();
  const execution = resolveRuntimeExecutors();
  const graphWriter = resolveRuntimeGraphWriter();

  try {
    const orchestrator = new RuntimeOrchestrator({
      graphWriter: graphWriter.writer,
      executors: execution.executors,
      dataAdapter,
      graphContextReader: new FixtureGraphContextReader(),
    });

    const server = createRuntimeApiServer({
      orchestrator,
      corsOrigin,
    });

    const shutdown = async (): Promise<void> => {
      server.close();
      await graphWriter.close();
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
      console.log(`CORS origin: ${corsOrigin}`);
    });
  } catch (error) {
    await graphWriter.close();
    throw error;
  }
}

await main();
