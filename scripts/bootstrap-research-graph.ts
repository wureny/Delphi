import {
  createNeo4jDriverExecutor,
  getBootstrapSchemaId,
  planRegistryStatements,
  planSchemaConstraintStatements,
  readNeo4jConfigFromEnv,
} from "../src/research-graph/index.ts";

interface BootstrapVerificationRow {
  ontologyTypes: number;
  runtimeTypes: number;
  mergePolicies: number;
}

async function main(): Promise<void> {
  const executor = createNeo4jDriverExecutor(readNeo4jConfigFromEnv());
  const bootstrappedAt = new Date().toISOString();

  try {
    await executor.execute(planSchemaConstraintStatements());
    await executor.execute(planRegistryStatements(bootstrappedAt));

    const [row] = await executor.query<BootstrapVerificationRow>(
      [
        "MATCH (:ResearchGraphSchema { schemaId: $schemaId })",
        "WITH 1 AS one",
        "MATCH (o:OntologyNodeType)",
        "WITH one, count(o) AS ontologyTypes",
        "MATCH (r:RuntimeNodeType)",
        "WITH ontologyTypes, count(r) AS runtimeTypes",
        "MATCH (m:StableMergePolicy)",
        "RETURN ontologyTypes, runtimeTypes, count(m) AS mergePolicies",
      ].join("\n"),
      { schemaId: getBootstrapSchemaId() },
    );

    console.log(
      JSON.stringify(
        {
          status: "ok",
          schemaId: getBootstrapSchemaId(),
          bootstrappedAt,
          verification: row ?? null,
        },
        null,
        2,
      ),
    );
  } finally {
    await executor.close();
  }
}

await main();
