import { collectTouchedRefsFromPatch, type GraphWriteContext, type GraphWriteReceipt, type GraphWriter } from "./graph-writer.ts";
import type {
  AttachEvidenceOperation,
  CreateEdgeOperation,
  CreateNodeOperation,
  GraphPatch,
  GraphPatchOperation,
  MergeNodeOperation,
  UpdatePropertyOperation,
} from "./graph-patch.ts";
import { getStableNodeMergePolicy } from "./merge-policy.ts";
import { isOntologyNodeType, type OntologyNodeType } from "./ontology.ts";
import type { GraphNodeType } from "./runtime.ts";

export interface Neo4jStatement {
  cypher: string;
  params: Record<string, unknown>;
  description: string;
}

export interface Neo4jQueryExecutor {
  execute(statements: readonly Neo4jStatement[]): Promise<void>;
}

export interface Neo4jGraphWriterOptions {
  database?: string;
}

export class Neo4jGraphWriter implements GraphWriter {
  private readonly executor: Neo4jQueryExecutor;
  private readonly options: Neo4jGraphWriterOptions;

  constructor(executor: Neo4jQueryExecutor, options: Neo4jGraphWriterOptions = {}) {
    this.executor = executor;
    this.options = options;
  }

  async write(patch: GraphPatch, context: GraphWriteContext): Promise<GraphWriteReceipt> {
    const statements = planNeo4jStatements(patch, context);

    await this.executor.execute(statements);

    return {
      requestId: context.requestId,
      patchId: patch.patchId,
      runId: patch.runId,
      targetScope: patch.targetScope,
      appliedAt: new Date().toISOString(),
      acceptedOperations: patch.operations.length,
      touchedRefs: collectTouchedRefsFromPatch(patch),
      warnings: [],
    };
  }
}

export function planNeo4jStatements(
  patch: GraphPatch,
  context: GraphWriteContext,
): Neo4jStatement[] {
  const refNodeTypes = buildRefNodeTypeMap(patch, context);

  return patch.operations.map((operation, index) =>
    buildOperationStatement(operation, patch, context, refNodeTypes, index),
  );
}

function buildOperationStatement(
  operation: GraphPatchOperation,
  patch: GraphPatch,
  context: GraphWriteContext,
  refNodeTypes: Map<string, GraphNodeType>,
  index: number,
): Neo4jStatement {
  switch (operation.type) {
    case "create_node":
      return buildCreateNodeStatement(operation, patch, context, index);
    case "merge_node":
      return buildMergeNodeStatement(operation, patch, context, index);
    case "create_edge":
      return buildCreateEdgeStatement(operation, index);
    case "update_property":
      return buildUpdatePropertyStatement(operation, patch, context, refNodeTypes, index);
    case "attach_evidence":
      return buildAttachEvidenceStatement(operation, index);
    case "summarize_subgraph":
      return {
        cypher: [
          "MATCH (n { _ref: $targetRef })",
          "SET n.graphSummary = $summary",
          "SET n.graphSummarySourceRefs = $sourceRefs",
          "SET n.lastGraphSummaryAt = $writtenAt",
        ].join("\n"),
        params: {
          targetRef: operation.targetRef,
          summary: operation.summary,
          sourceRefs: operation.sourceRefs,
          writtenAt: context.submittedAt,
        },
        description: `summarize_subgraph#${index}`,
      };
    default:
      return assertNever(operation);
  }
}

function buildCreateNodeStatement(
  operation: CreateNodeOperation,
  patch: GraphPatch,
  context: GraphWriteContext,
  index: number,
): Neo4jStatement {
  const label = cypherLabel(operation.nodeType);
  const metadata = buildNodeMetadata(
    operation.nodeRef,
    operation.nodeType,
    patch.targetScope,
    context,
    operation.properties,
  );

  return {
    cypher: [
      `CREATE (n:${label})`,
      "SET n += $properties",
      "SET n += $metadata",
    ].join("\n"),
    params: {
      properties: operation.properties,
      metadata,
    },
    description: `create_node#${index}`,
  };
}

function buildMergeNodeStatement(
  operation: MergeNodeOperation,
  patch: GraphPatch,
  context: GraphWriteContext,
  index: number,
): Neo4jStatement {
  const label = cypherLabel(operation.nodeType);
  const metadata = buildNodeMetadata(
    operation.resolvedRef,
    operation.nodeType,
    patch.targetScope,
    context,
    operation.properties,
  );

  if (!isOntologyNodeType(operation.nodeType)) {
    return {
      cypher: [
        `MERGE (n:${label} { _ref: $identity._ref, _runId: $identity._runId })`,
        "ON CREATE SET n += $createProperties",
        "ON CREATE SET n += $metadata",
        "ON MATCH SET n += $updateProperties",
        "ON MATCH SET n += $metadata",
      ].join("\n"),
      params: {
        identity: {
          _ref: operation.resolvedRef,
          _runId: context.runId,
        },
        createProperties: operation.properties,
        updateProperties: operation.properties,
        metadata,
      },
      description: `merge_node#${index}`,
    };
  }

  const policy = getStableNodeMergePolicy(operation.nodeType);
  const createProperties = {
    ...operation.properties,
    ...metadata,
  };
  const mutableProperties = pickProperties(operation.properties, policy.mutableFields);
  const mutableAssignments = buildMutableAssignments(
    "n",
    mutableProperties,
    policy.nodeType,
    policy.freshnessField,
  );
  const onMatchClauses =
    policy.conflictStrategy === "reject"
      ? ["ON MATCH SET n._ref = $metadata._ref"]
      : [
          "ON MATCH SET n._ref = $metadata._ref",
          ...mutableAssignments.map((assignment) => `ON MATCH SET ${assignment}`),
        ];

  return {
    cypher: [
      `MERGE (n:${label} ${formatMapLiteral(operation.matchKeys, "identity")})`,
      "ON CREATE SET n += $createProperties",
      ...onMatchClauses,
    ].join("\n"),
    params: {
      identity: operation.matchKeys,
      createProperties,
      metadata,
      mutableProperties,
    },
    description: `merge_node#${index}`,
  };
}

function buildCreateEdgeStatement(
  operation: CreateEdgeOperation,
  index: number,
): Neo4jStatement {
  const edgeType = cypherLabel(operation.edgeType);

  return {
    cypher: [
      "MATCH (from { _ref: $fromRef })",
      "MATCH (to { _ref: $toRef })",
      `MERGE (from)-[rel:${edgeType}]->(to)`,
      "SET rel += $properties",
    ].join("\n"),
    params: {
      fromRef: operation.fromRef,
      toRef: operation.toRef,
      properties: operation.properties,
    },
    description: `create_edge#${index}`,
  };
}

function buildUpdatePropertyStatement(
  operation: UpdatePropertyOperation,
  patch: GraphPatch,
  context: GraphWriteContext,
  refNodeTypes: Map<string, GraphNodeType>,
  index: number,
): Neo4jStatement {
  const nodeType = refNodeTypes.get(operation.targetRef);
  const metadata = buildUpdateMetadata(patch, context);

  if (!nodeType || !isOntologyNodeType(nodeType)) {
    return {
      cypher: [
        "MATCH (n { _ref: $targetRef })",
        "SET n += $properties",
        "SET n += $metadata",
      ].join("\n"),
      params: {
        targetRef: operation.targetRef,
        properties: operation.properties,
        metadata,
      },
      description: `update_property#${index}`,
    };
  }

  const policy = getStableNodeMergePolicy(nodeType);
  const mutableProperties = pickProperties(operation.properties, policy.mutableFields);
  const assignments = buildMutableAssignments(
    "n",
    mutableProperties,
    nodeType,
    policy.freshnessField,
  );

  return {
    cypher: [
      "MATCH (n { _ref: $targetRef })",
      ...assignments.map((assignment) => `SET ${assignment}`),
      "SET n += $metadata",
    ].join("\n"),
    params: {
      targetRef: operation.targetRef,
      properties: mutableProperties,
      metadata,
    },
    description: `update_property#${index}`,
  };
}

function buildAttachEvidenceStatement(
  operation: AttachEvidenceOperation,
  index: number,
): Neo4jStatement {
  const edgeType = cypherLabel(operation.relationType);

  return {
    cypher: [
      "MATCH (target { _ref: $targetRef })",
      "MATCH (evidence { _ref: $evidenceRef })",
      `MERGE (target)-[rel:${edgeType}]->(evidence)`,
    ].join("\n"),
    params: {
      targetRef: operation.targetRef,
      evidenceRef: operation.evidenceRef,
    },
    description: `attach_evidence#${index}`,
  };
}

function buildRefNodeTypeMap(
  patch: GraphPatch,
  context: GraphWriteContext,
): Map<string, GraphNodeType> {
  const refNodeTypes = new Map<string, GraphNodeType>(
    Object.entries(context.refNodeTypes ?? {}),
  );

  for (const operation of patch.operations) {
    if (operation.type === "create_node") {
      refNodeTypes.set(operation.nodeRef, operation.nodeType);
    }

    if (operation.type === "merge_node") {
      refNodeTypes.set(operation.resolvedRef, operation.nodeType);
    }
  }

  return refNodeTypes;
}

function buildNodeMetadata(
  ref: string,
  nodeType: GraphNodeType,
  targetScope: GraphPatch["targetScope"],
  context: GraphWriteContext,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    _ref: ref,
    _nodeType: nodeType,
    _scope: targetScope,
    _runId: context.runId,
  };

  const caseId =
    typeof properties.caseId === "string"
      ? properties.caseId
      : targetScope === "case"
        ? context.caseId
        : undefined;

  if (caseId) {
    metadata._caseId = caseId;
  }

  return metadata;
}

function buildUpdateMetadata(
  patch: GraphPatch,
  context: GraphWriteContext,
): Record<string, unknown> {
  return {
    _lastUpdatedByPatch: patch.patchId,
    _lastUpdatedAt: context.submittedAt,
  };
}

function buildMutableAssignments(
  variableName: string,
  mutableProperties: Record<string, unknown>,
  nodeType: OntologyNodeType,
  freshnessField?: string,
): string[] {
  const assignments: string[] = [];

  for (const fieldName of Object.keys(mutableProperties)) {
    if (freshnessField && fieldName !== freshnessField) {
      assignments.push(
        `${variableName}.${cypherProperty(fieldName)} = CASE WHEN ${buildFreshnessGuard(
          variableName,
          freshnessField,
        )} THEN $properties.${fieldName} ELSE ${variableName}.${cypherProperty(fieldName)} END`,
      );
      continue;
    }

    assignments.push(
      `${variableName}.${cypherProperty(fieldName)} = $properties.${fieldName}`,
    );
  }

  if (freshnessField && !(freshnessField in mutableProperties)) {
    assignments.push(
      `${variableName}.${cypherProperty(freshnessField)} = ${variableName}.${cypherProperty(freshnessField)}`,
    );
  }

  if (assignments.length === 0 && nodeType) {
    assignments.push(`${variableName}._nodeType = ${variableName}._nodeType`);
  }

  return assignments;
}

function buildFreshnessGuard(
  variableName: string,
  freshnessField: string,
): string {
  const prop = cypherProperty(freshnessField);
  return `${variableName}.${prop} IS NULL OR $properties.${freshnessField} >= ${variableName}.${prop}`;
}

function pickProperties(
  source: Record<string, unknown>,
  allowedFields: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(source).filter(([fieldName]) => allowedFields.includes(fieldName)),
  );
}

function formatMapLiteral(
  record: Record<string, string | number | boolean>,
  rootParam: string,
): string {
  const entries = Object.keys(record).map(
    (fieldName) => `${cypherProperty(fieldName)}: $${rootParam}.${fieldName}`,
  );

  return `{ ${entries.join(", ")} }`;
}

function cypherLabel(value: string): string {
  return `\`${value}\``;
}

function cypherProperty(value: string): string {
  return `\`${value}\``;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}
