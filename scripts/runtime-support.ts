import type { GraphWriter } from "../src/research-graph/graph-writer.ts";
import { NoopGraphWriter } from "../src/research-graph/graph-writer.ts";
import {
  createNeo4jDriverExecutor,
  Neo4jGraphWriter,
  readNeo4jConfigFromEnv,
} from "../src/research-graph/index.ts";
import {
  OpenBBRuntimeDataAdapter,
} from "../src/data-layer/index.ts";
import {
  FixtureRuntimeDataAdapter,
} from "../src/orchestration/fixtures.ts";

export interface ResolvedRuntimeGraphWriter {
  writer: GraphWriter;
  mode: "noop" | "neo4j";
  close(): Promise<void>;
}

export function resolveRuntimeDataAdapter():
  | FixtureRuntimeDataAdapter
  | OpenBBRuntimeDataAdapter {
  const mode = process.env.RUNTIME_DATA_MODE ?? "fixture";

  if (mode === "openbb") {
    return OpenBBRuntimeDataAdapter.fromEnv();
  }

  return FixtureRuntimeDataAdapter.fromEnv();
}

export function resolveRuntimeGraphWriter(): ResolvedRuntimeGraphWriter {
  const mode = process.env.RUNTIME_GRAPH_MODE ?? "noop";

  if (mode === "neo4j") {
    const executor = createNeo4jDriverExecutor(readNeo4jConfigFromEnv());
    const writer = new Neo4jGraphWriter(executor);

    return {
      writer,
      mode: "neo4j",
      async close(): Promise<void> {
        await executor.close();
      },
    };
  }

  return {
    writer: new NoopGraphWriter(),
    mode: "noop",
    async close(): Promise<void> {
      return Promise.resolve();
    },
  };
}
