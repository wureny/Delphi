import {
  createNeo4jDriverExecutor,
  readNeo4jConfigFromEnv,
} from "../src/research-graph/index.ts";

async function main(): Promise<void> {
  const executor = createNeo4jDriverExecutor(readNeo4jConfigFromEnv());

  try {
    await executor.verifyConnectivity();
    console.log("Neo4j connectivity check passed.");
  } finally {
    await executor.close();
  }
}

await main();
