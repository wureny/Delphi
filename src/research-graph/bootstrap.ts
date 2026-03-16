import { getStableNodeMergePolicy, stableNodeMergePolicies } from "./merge-policy.ts";
import {
  isCaseScopedOntologyNodeType,
  ontologyNodeTypes,
  stableRelationshipRegistry,
} from "./ontology.ts";
import type { Neo4jStatement } from "./neo4j-adapter.ts";
import {
  runtimeNodeTypes,
  runtimeRelationshipRegistry,
} from "./runtime.ts";

const schemaId = "delphi-research-graph-v0";

export function planResearchGraphBootstrapStatements(
  bootstrappedAt: string = new Date().toISOString(),
): Neo4jStatement[] {
  return [
    ...planSchemaConstraintStatements(),
    ...planRegistryStatements(bootstrappedAt),
  ];
}

export function planSchemaConstraintStatements(): Neo4jStatement[] {
  const statements: Neo4jStatement[] = [];

  for (const ontologyNodeType of ontologyNodeTypes) {
    statements.push({
      cypher: `CREATE CONSTRAINT ${constraintName(ontologyNodeType, "ref")} IF NOT EXISTS FOR (n:\`${ontologyNodeType}\`) REQUIRE n._ref IS UNIQUE`,
      params: {},
      description: `constraint:${ontologyNodeType}:_ref`,
    });
  }

  for (const runtimeNodeType of runtimeNodeTypes) {
    statements.push({
      cypher: `CREATE CONSTRAINT ${constraintName(runtimeNodeType, "ref")} IF NOT EXISTS FOR (n:\`${runtimeNodeType}\`) REQUIRE n._ref IS UNIQUE`,
      params: {},
      description: `constraint:${runtimeNodeType}:_ref`,
    });
  }

  statements.push(
    {
      cypher: "CREATE CONSTRAINT asset_ticker IF NOT EXISTS FOR (n:`Asset`) REQUIRE n.ticker IS UNIQUE",
      params: {},
      description: "constraint:Asset:ticker",
    },
    {
      cypher: "CREATE CONSTRAINT investment_case_identity IF NOT EXISTS FOR (n:`InvestmentCase`) REQUIRE n.caseId IS UNIQUE",
      params: {},
      description: "constraint:InvestmentCase:caseId",
    },
    {
      cypher: "CREATE CONSTRAINT thesis_identity IF NOT EXISTS FOR (n:`Thesis`) REQUIRE (n.caseId, n.thesisId) IS UNIQUE",
      params: {},
      description: "constraint:Thesis:identity",
    },
    {
      cypher: "CREATE CONSTRAINT evidence_identity IF NOT EXISTS FOR (n:`Evidence`) REQUIRE (n.caseId, n.provider, n.sourceType, n.sourceRef, n.observedAt) IS UNIQUE",
      params: {},
      description: "constraint:Evidence:identity",
    },
    {
      cypher: "CREATE CONSTRAINT risk_identity IF NOT EXISTS FOR (n:`Risk`) REQUIRE (n.caseId, n.riskId) IS UNIQUE",
      params: {},
      description: "constraint:Risk:identity",
    },
    {
      cypher: "CREATE CONSTRAINT liquidity_factor_identity IF NOT EXISTS FOR (n:`LiquidityFactor`) REQUIRE (n.caseId, n.factorId) IS UNIQUE",
      params: {},
      description: "constraint:LiquidityFactor:identity",
    },
    {
      cypher: "CREATE CONSTRAINT liquidity_regime_identity IF NOT EXISTS FOR (n:`LiquidityRegime`) REQUIRE (n.caseId, n.regimeId) IS UNIQUE",
      params: {},
      description: "constraint:LiquidityRegime:identity",
    },
    {
      cypher: "CREATE CONSTRAINT macro_actor_action_identity IF NOT EXISTS FOR (n:`MacroActorAction`) REQUIRE (n.caseId, n.actionId) IS UNIQUE",
      params: {},
      description: "constraint:MacroActorAction:identity",
    },
    {
      cypher: "CREATE CONSTRAINT market_signal_identity IF NOT EXISTS FOR (n:`MarketSignal`) REQUIRE (n.caseId, n.signalId) IS UNIQUE",
      params: {},
      description: "constraint:MarketSignal:identity",
    },
    {
      cypher: "CREATE CONSTRAINT judgment_identity IF NOT EXISTS FOR (n:`Judgment`) REQUIRE (n.caseId, n.judgmentId) IS UNIQUE",
      params: {},
      description: "constraint:Judgment:identity",
    },
    {
      cypher: "CREATE CONSTRAINT schema_root_identity IF NOT EXISTS FOR (n:`ResearchGraphSchema`) REQUIRE n.schemaId IS UNIQUE",
      params: {},
      description: "constraint:ResearchGraphSchema:schemaId",
    },
  );

  return statements;
}

export function planRegistryStatements(bootstrappedAt: string): Neo4jStatement[] {
  const statements: Neo4jStatement[] = [
    {
      cypher: [
        "MERGE (schema:ResearchGraphSchema { schemaId: $schemaId })",
        "SET schema.name = $name",
        "SET schema.version = $version",
        "SET schema.bootstrappedAt = $bootstrappedAt",
      ].join("\n"),
      params: {
        schemaId,
        name: "Delphi Research Graph",
        version: "v0",
        bootstrappedAt,
      },
      description: "registry:schema-root",
    },
  ];

  for (const ontologyNodeType of ontologyNodeTypes) {
    statements.push({
      cypher: [
        "MATCH (schema:ResearchGraphSchema { schemaId: $schemaId })",
        "MERGE (type:OntologyNodeType { name: $name })",
        "SET type.caseScoped = $caseScoped",
        "SET type.layer = 'ontology'",
        "SET type.bootstrappedAt = $bootstrappedAt",
        "MERGE (schema)-[:DEFINES_ONTOLOGY_TYPE]->(type)",
      ].join("\n"),
      params: {
        schemaId,
        name: ontologyNodeType,
        caseScoped: isCaseScopedOntologyNodeType(ontologyNodeType),
        bootstrappedAt,
      },
      description: `registry:ontology-type:${ontologyNodeType}`,
    });
  }

  for (const runtimeNodeType of runtimeNodeTypes) {
    statements.push({
      cypher: [
        "MATCH (schema:ResearchGraphSchema { schemaId: $schemaId })",
        "MERGE (type:RuntimeNodeType { name: $name })",
        "SET type.layer = 'runtime'",
        "SET type.bootstrappedAt = $bootstrappedAt",
        "MERGE (schema)-[:DEFINES_RUNTIME_TYPE]->(type)",
      ].join("\n"),
      params: {
        schemaId,
        name: runtimeNodeType,
        bootstrappedAt,
      },
      description: `registry:runtime-type:${runtimeNodeType}`,
    });
  }

  for (const relation of stableRelationshipRegistry) {
    statements.push({
      cypher: [
        "MATCH (from:OntologyNodeType { name: $from })",
        "MATCH (to:OntologyNodeType { name: $to })",
        "MERGE (from)-[rel:ALLOWS_STABLE_RELATION { type: $type }]->(to)",
        "SET rel.bootstrappedAt = $bootstrappedAt",
      ].join("\n"),
      params: {
        from: relation.from,
        to: relation.to,
        type: relation.type,
        bootstrappedAt,
      },
      description: `registry:stable-rel:${relation.from}:${relation.type}:${relation.to}`,
    });
  }

  for (const relation of runtimeRelationshipRegistry) {
    const fromLabel = ontologyNodeTypes.includes(relation.from as (typeof ontologyNodeTypes)[number])
      ? "OntologyNodeType"
      : "RuntimeNodeType";
    const toLabel = ontologyNodeTypes.includes(relation.to as (typeof ontologyNodeTypes)[number])
      ? "OntologyNodeType"
      : "RuntimeNodeType";

    statements.push({
      cypher: [
        `MATCH (from:${fromLabel} { name: $from })`,
        `MATCH (to:${toLabel} { name: $to })`,
        "MERGE (from)-[rel:ALLOWS_RUNTIME_RELATION { type: $type }]->(to)",
        "SET rel.bootstrappedAt = $bootstrappedAt",
      ].join("\n"),
      params: {
        from: relation.from,
        to: relation.to,
        type: relation.type,
        bootstrappedAt,
      },
      description: `registry:runtime-rel:${relation.from}:${relation.type}:${relation.to}`,
    });
  }

  for (const policy of stableNodeMergePolicies) {
    statements.push({
      cypher: [
        "MATCH (type:OntologyNodeType { name: $nodeType })",
        "MERGE (policy:StableMergePolicy { nodeType: $nodeType })",
        "SET policy.identityScope = $identityScope",
        "SET policy.identityKeys = $identityKeys",
        "SET policy.immutableFields = $immutableFields",
        "SET policy.mutableFields = $mutableFields",
        "SET policy.conflictStrategy = $conflictStrategy",
        "SET policy.freshnessField = $freshnessField",
        "SET policy.notes = $notes",
        "SET policy.bootstrappedAt = $bootstrappedAt",
        "MERGE (type)-[:USES_MERGE_POLICY]->(policy)",
      ].join("\n"),
      params: {
        nodeType: policy.nodeType,
        identityScope: policy.identityScope,
        identityKeys: [...policy.identityKeys],
        immutableFields: [...policy.immutableFields],
        mutableFields: [...policy.mutableFields],
        conflictStrategy: policy.conflictStrategy,
        freshnessField: policy.freshnessField ?? null,
        notes: policy.notes,
        bootstrappedAt,
      },
      description: `registry:merge-policy:${policy.nodeType}`,
    });
  }

  return statements;
}

function constraintName(label: string, suffix: string): string {
  return `${label.toLowerCase()}_${suffix}`;
}

export function getBootstrapSchemaId(): string {
  return schemaId;
}

export function getBootstrapMergePolicy(nodeType: Parameters<typeof getStableNodeMergePolicy>[0]) {
  return getStableNodeMergePolicy(nodeType);
}
