import {
  createNeo4jDriverExecutor,
  Neo4jGraphWriter,
  readNeo4jConfigFromEnv,
  submitGraphPatch,
  type GraphPatch,
  type GraphWriteContext,
} from "../src/research-graph/index.ts";

interface SmokeVerificationRow {
  caseId: string;
  ticker: string;
  thesisId: string;
}

const smokeId = `smoke-${Date.now()}`;
const assetRef = `asset:${smokeId}`;
const caseRef = `case:${smokeId}`;
const thesisRef = `thesis:${smokeId}`;
const ticker = `DLP${Date.now().toString().slice(-6)}`;
const caseId = `case-${smokeId}`;
const thesisId = `thesis-${smokeId}`;

const patch: GraphPatch = {
  patchId: `patch-${smokeId}`,
  runId: `run-${smokeId}`,
  agentType: "thesis",
  targetScope: "case",
  basisRefs: [`finding:${smokeId}`],
  operations: [
    {
      opId: `op-asset-${smokeId}`,
      type: "merge_node",
      resolvedRef: assetRef,
      nodeType: "Asset",
      matchKeys: { ticker },
      properties: {
        assetId: `asset-${smokeId}`,
        ticker,
        name: `Delphi Smoke ${smokeId}`,
        assetType: "equity",
        primaryExchange: "TEST",
      },
    },
    {
      opId: `op-case-${smokeId}`,
      type: "create_node",
      nodeRef: caseRef,
      nodeType: "InvestmentCase",
      properties: {
        caseId,
        ticker,
        timeHorizon: "3m",
        caseType: "buy_decision",
        status: "active",
        createdAt: new Date().toISOString(),
      },
    },
    {
      opId: `op-focus-${smokeId}`,
      type: "create_edge",
      edgeType: "FOCUSES_ON",
      fromRef: caseRef,
      toRef: assetRef,
      properties: {},
    },
    {
      opId: `op-thesis-${smokeId}`,
      type: "merge_node",
      resolvedRef: thesisRef,
      nodeType: "Thesis",
      matchKeys: {
        caseId,
        thesisId,
      },
      properties: {
        thesisId,
        caseId,
        stance: "bullish",
        summary: "Smoke test thesis written through the real Neo4j adapter.",
        timeframe: "3m",
        status: "active",
      },
    },
    {
      opId: `op-has-thesis-${smokeId}`,
      type: "create_edge",
      edgeType: "HAS_THESIS",
      fromRef: caseRef,
      toRef: thesisRef,
      properties: {},
    },
  ],
};

const context: GraphWriteContext = {
  requestId: `request-${smokeId}`,
  submittedAt: new Date().toISOString(),
  runId: patch.runId,
  caseId,
};

async function main(): Promise<void> {
  const executor = createNeo4jDriverExecutor(readNeo4jConfigFromEnv());
  const writer = new Neo4jGraphWriter(executor);

  try {
    const result = await submitGraphPatch(patch, context, writer);

    if (result.status !== "accepted") {
      throw new Error(`Smoke write rejected: ${JSON.stringify(result, null, 2)}`);
    }

    const rows = await executor.query<SmokeVerificationRow>(
      [
        "MATCH (c:InvestmentCase { _ref: $caseRef })-[:FOCUSES_ON]->(a:Asset { _ref: $assetRef })",
        "MATCH (c)-[:HAS_THESIS]->(t:Thesis { _ref: $thesisRef })",
        "RETURN c.caseId AS caseId, a.ticker AS ticker, t.thesisId AS thesisId",
      ].join("\n"),
      {
        caseRef,
        assetRef,
        thesisRef,
      },
    );

    if (rows.length !== 1) {
      throw new Error(`Smoke write verification failed. Expected 1 row, received ${rows.length}.`);
    }

    console.log(
      JSON.stringify(
        {
          status: "ok",
          patchId: patch.patchId,
          runId: patch.runId,
          verification: rows[0],
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup(executor);
    await executor.close();
  }
}

async function cleanup(
  executor: ReturnType<typeof createNeo4jDriverExecutor>,
): Promise<void> {
  await executor.query(
    [
      "MATCH (n)",
      "WHERE n._ref IN $refs",
      "DETACH DELETE n",
    ].join("\n"),
    {
      refs: [caseRef, assetRef, thesisRef],
    },
  );
}

await main();
