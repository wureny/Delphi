import {
  getStableNodeMergePolicy,
  hasStableNodeMergePolicy,
} from "./merge-policy.ts";
import {
  isCaseScopedOntologyNodeType,
  isOntologyNodeType,
  isStableEdgeType,
  stableRelationshipRegistry,
} from "./ontology.ts";
import type {
  CreateEdgeOperation,
  CreateNodeOperation,
  GraphPatch,
  GraphPatchOperation,
  MergeNodeOperation,
  UpdatePropertyOperation,
} from "./graph-patch.ts";
import {
  isAgentType,
  isRuntimeEdgeType,
  isRuntimeNodeType,
  runtimeRelationshipRegistry,
  type GraphNodeType,
} from "./runtime.ts";

export interface GraphPatchValidationContext {
  runId: string;
  caseId: string;
  refNodeTypes?: Record<string, GraphNodeType>;
  existingRuntimeRefs?: Iterable<string>;
  existingCaseRefs?: Iterable<string>;
  existingEvidenceRefs?: Iterable<string>;
  maxOperations?: number;
}

export interface GraphPatchValidationError {
  code:
    | "invalid_run_id"
    | "invalid_agent_type"
    | "empty_patch"
    | "too_many_operations"
    | "invalid_node_type"
    | "invalid_edge_type"
    | "invalid_scope_target"
    | "unknown_ref"
    | "existing_ref_requires_merge"
    | "missing_required_property"
    | "invalid_relationship_pair"
    | "judge_requires_basis"
    | "judgment_requires_judge"
    | "invalid_relation_type"
    | "writer_failure"
    | "missing_identity_key"
    | "immutable_field_update";
  message: string;
  opId?: string;
}

export interface GraphPatchValidationWarning {
  code:
    | "missing_basis_refs"
    | "unresolved_ref_type"
    | "summary_without_sources";
  message: string;
  opId?: string;
}

export interface GraphPatchValidationResult {
  ok: boolean;
  errors: GraphPatchValidationError[];
  warnings: GraphPatchValidationWarning[];
}

const defaultMaxOperations = 24;

export function validateGraphPatch(
  patch: GraphPatch,
  context: GraphPatchValidationContext,
): GraphPatchValidationResult {
  const errors: GraphPatchValidationError[] = [];
  const warnings: GraphPatchValidationWarning[] = [];
  const refTypes = new Map<string, GraphNodeType>(
    Object.entries(context.refNodeTypes ?? {}),
  );
  const existingRuntimeRefs = new Set(context.existingRuntimeRefs ?? []);
  const existingCaseRefs = new Set(context.existingCaseRefs ?? []);
  const existingEvidenceRefs = new Set(context.existingEvidenceRefs ?? []);

  if (patch.runId !== context.runId) {
    errors.push({
      code: "invalid_run_id",
      message: `Patch run_id ${patch.runId} does not match current run ${context.runId}.`,
    });
  }

  if (!isAgentType(patch.agentType)) {
    errors.push({
      code: "invalid_agent_type",
      message: `Unsupported agent type: ${patch.agentType}.`,
    });
  }

  if (patch.operations.length === 0) {
    errors.push({
      code: "empty_patch",
      message: "GraphPatch must contain at least one operation.",
    });
  }

  if (patch.operations.length > (context.maxOperations ?? defaultMaxOperations)) {
    errors.push({
      code: "too_many_operations",
      message: "GraphPatch exceeds the v0 operation budget.",
    });
  }

  if (patch.basisRefs.length === 0) {
    warnings.push({
      code: "missing_basis_refs",
      message: "Patch has no basis_refs. This is allowed for scaffolding, but weakens traceability.",
    });
  }

  for (const operation of patch.operations) {
    switch (operation.type) {
      case "create_node":
        validateCreateNode(operation, patch, context, refTypes, existingRuntimeRefs, existingCaseRefs, errors);
        break;
      case "merge_node":
        validateMergeNode(operation, patch, context, refTypes, existingRuntimeRefs, existingCaseRefs, errors);
        break;
      case "create_edge":
        validateCreateEdge(operation, patch, refTypes, errors, warnings);
        break;
      case "update_property":
        validateUpdateProperty(operation, patch, refTypes, errors, warnings);
        break;
      case "attach_evidence":
        if (!isKnownRef(operation.targetRef, refTypes, existingRuntimeRefs, existingCaseRefs)) {
          errors.push({
            code: "unknown_ref",
            message: `attach_evidence target_ref ${operation.targetRef} is not known in this patch context.`,
            opId: operation.opId,
          });
        }
        if (!isKnownEvidenceRef(operation.evidenceRef, refTypes, existingEvidenceRefs)) {
          errors.push({
            code: "unknown_ref",
            message: `attach_evidence evidence_ref ${operation.evidenceRef} is not a known Evidence node.`,
            opId: operation.opId,
          });
        }
        if (!["SUPPORTED_BY", "CHALLENGED_BY", "CITES"].includes(operation.relationType)) {
          errors.push({
            code: "invalid_relation_type",
            message: `Unsupported relation_type ${operation.relationType}.`,
            opId: operation.opId,
          });
        }
        break;
      case "summarize_subgraph":
        if (operation.sourceRefs.length === 0) {
          warnings.push({
            code: "summary_without_sources",
            message: "summarize_subgraph should cite at least one source ref.",
            opId: operation.opId,
          });
        }
        if (!isKnownRef(operation.targetRef, refTypes, existingRuntimeRefs, existingCaseRefs)) {
          errors.push({
            code: "unknown_ref",
            message: `summarize_subgraph target_ref ${operation.targetRef} is not known in this patch context.`,
            opId: operation.opId,
          });
        }
        break;
      default:
        assertNever(operation);
    }
  }

  const touchesJudgment = patch.operations.some((operation) =>
    targetsNodeType(operation, refTypes, "Judgment"),
  );

  if (touchesJudgment && patch.agentType !== "judge") {
    errors.push({
      code: "judgment_requires_judge",
      message: "Only the judge agent can create or update Judgment nodes.",
    });
  }

  if (touchesJudgment && patch.basisRefs.length === 0) {
    errors.push({
      code: "judge_requires_basis",
      message: "Judgment writes require basis_refs so the decision can be traced back to findings.",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function validateCreateNode(
  operation: CreateNodeOperation,
  patch: GraphPatch,
  context: GraphPatchValidationContext,
  refTypes: Map<string, GraphNodeType>,
  existingRuntimeRefs: Set<string>,
  existingCaseRefs: Set<string>,
  errors: GraphPatchValidationError[],
): void {
  if (!isAllowedNodeTypeForScope(operation.nodeType, patch.targetScope)) {
    errors.push({
      code: "invalid_scope_target",
      message: `Node type ${operation.nodeType} is not allowed in ${patch.targetScope} scope.`,
      opId: operation.opId,
    });
    return;
  }

  if (patch.targetScope === "case" && operation.nodeType !== "InvestmentCase" && isOntologyNodeType(operation.nodeType) && !isCaseScopedOntologyNodeType(operation.nodeType)) {
    errors.push({
      code: "invalid_scope_target",
      message: `Node type ${operation.nodeType} is not case-scoped and should not be created under case scope.`,
      opId: operation.opId,
    });
  }

  if ((patch.targetScope === "runtime" && existingRuntimeRefs.has(operation.nodeRef)) || (patch.targetScope === "case" && existingCaseRefs.has(operation.nodeRef))) {
    errors.push({
      code: "existing_ref_requires_merge",
      message: `Ref ${operation.nodeRef} already exists. Use merge_node instead of create_node.`,
      opId: operation.opId,
    });
  }

  validateRequiredProperties(operation.nodeType, operation.properties, operation.opId, errors);
  validateCaseBinding(operation.nodeType, operation.properties, context.caseId, operation.opId, errors);

  refTypes.set(operation.nodeRef, operation.nodeType);
}

function validateMergeNode(
  operation: MergeNodeOperation,
  patch: GraphPatch,
  context: GraphPatchValidationContext,
  refTypes: Map<string, GraphNodeType>,
  _existingRuntimeRefs: Set<string>,
  _existingCaseRefs: Set<string>,
  errors: GraphPatchValidationError[],
): void {
  if (!isAllowedNodeTypeForScope(operation.nodeType, patch.targetScope)) {
    errors.push({
      code: "invalid_scope_target",
      message: `Node type ${operation.nodeType} is not allowed in ${patch.targetScope} scope.`,
      opId: operation.opId,
    });
    return;
  }

  if (Object.keys(operation.matchKeys).length === 0) {
    errors.push({
      code: "missing_required_property",
      message: "merge_node requires at least one match key.",
      opId: operation.opId,
    });
  }

  validateMergeKeys(operation.nodeType, operation.matchKeys, operation.opId, errors);
  validateRequiredProperties(operation.nodeType, operation.properties, operation.opId, errors);
  validateCaseBinding(operation.nodeType, operation.properties, context.caseId, operation.opId, errors);

  refTypes.set(operation.resolvedRef, operation.nodeType);
}

function validateCreateEdge(
  operation: CreateEdgeOperation,
  patch: GraphPatch,
  refTypes: Map<string, GraphNodeType>,
  errors: GraphPatchValidationError[],
  warnings: GraphPatchValidationWarning[],
): void {
  const fromType = refTypes.get(operation.fromRef);
  const toType = refTypes.get(operation.toRef);

  if (patch.targetScope === "runtime" && !isRuntimeEdgeType(operation.edgeType)) {
    errors.push({
      code: "invalid_edge_type",
      message: `Edge type ${operation.edgeType} is not registered for runtime scope.`,
      opId: operation.opId,
    });
    return;
  }

  if (patch.targetScope === "case" && !isStableEdgeType(operation.edgeType)) {
    errors.push({
      code: "invalid_edge_type",
      message: `Edge type ${operation.edgeType} is not registered for case scope.`,
      opId: operation.opId,
    });
    return;
  }

  if (!fromType || !toType) {
    warnings.push({
      code: "unresolved_ref_type",
      message: `Could not fully resolve edge refs ${operation.fromRef} -> ${operation.toRef}. Pair validation was skipped.`,
      opId: operation.opId,
    });
    return;
  }

  const isAllowedPair =
    patch.targetScope === "runtime"
      ? runtimeRelationshipRegistry.some(
          (rule) =>
            rule.type === operation.edgeType &&
            rule.from === fromType &&
            rule.to === toType,
        )
      : stableRelationshipRegistry.some(
          (rule) =>
            rule.type === operation.edgeType &&
            rule.from === fromType &&
            rule.to === toType,
        );

  if (!isAllowedPair) {
    errors.push({
      code: "invalid_relationship_pair",
      message: `Relationship ${operation.edgeType} is not allowed between ${fromType} and ${toType}.`,
      opId: operation.opId,
    });
  }
}

function validateUpdateProperty(
  operation: UpdatePropertyOperation,
  patch: GraphPatch,
  refTypes: Map<string, GraphNodeType>,
  errors: GraphPatchValidationError[],
  warnings: GraphPatchValidationWarning[],
): void {
  const targetType = refTypes.get(operation.targetRef);

  if (!targetType) {
    warnings.push({
      code: "unresolved_ref_type",
      message: `Could not resolve target_ref ${operation.targetRef}. Scope validation was skipped.`,
      opId: operation.opId,
    });
    return;
  }

  if (!isAllowedNodeTypeForScope(targetType, patch.targetScope)) {
    errors.push({
      code: "invalid_scope_target",
      message: `Ref ${operation.targetRef} resolves to ${targetType}, which is not allowed in ${patch.targetScope} scope.`,
      opId: operation.opId,
    });
  }

  validateImmutablePropertyUpdates(targetType, operation.properties, operation.opId, errors);
}

function validateRequiredProperties(
  nodeType: GraphNodeType,
  properties: Record<string, unknown>,
  opId: string,
  errors: GraphPatchValidationError[],
): void {
  const requiredPropertiesByNodeType: Partial<Record<GraphNodeType, readonly string[]>> = {
    InvestmentCase: ["caseId", "ticker", "timeHorizon", "caseType", "status", "createdAt"],
    Thesis: ["thesisId", "caseId", "stance", "summary", "timeframe", "status"],
    Evidence: ["evidenceId", "sourceType", "sourceRef", "summary", "observedAt", "provider"],
    Risk: ["riskId", "caseId", "riskType", "statement", "severity", "timeframe"],
    LiquidityFactor: ["factorId", "caseId", "factorType", "direction", "summary", "observedAt"],
    LiquidityRegime: ["regimeId", "caseId", "label", "timeframe", "confidence", "observedAt"],
    MacroActorAction: ["actionId", "caseId", "actor", "actionType", "summary", "effectiveDate"],
    MarketSignal: ["signalId", "caseId", "signalType", "timeframe", "direction", "observedAt"],
    Judgment: ["judgmentId", "caseId", "stance", "confidenceBand", "summary", "asOf"],
    Query: ["queryId", "runId", "ticker", "timeHorizon", "caseType"],
    Task: ["taskId", "runId", "agentType", "goal", "status"],
    Agent: ["agentId", "runId", "agentType"],
    Skill: ["skillId", "runId", "capabilityName"],
    ToolCall: ["toolCallId", "runId", "toolName", "status", "startedAt"],
    ContextItem: ["contextItemId", "runId", "refType", "refId", "sourceLayer"],
    Finding: ["findingId", "runId", "agentType", "claim", "confidence", "impact"],
    Decision: ["decisionId", "runId", "decisionType", "summary", "confidenceBand"],
    ReportSection: ["sectionId", "runId", "sectionKey", "title"],
  };

  const requiredProperties = requiredPropertiesByNodeType[nodeType];

  if (!requiredProperties) {
    return;
  }

  for (const fieldName of requiredProperties) {
    if (!(fieldName in properties)) {
      errors.push({
        code: "missing_required_property",
        message: `Node type ${nodeType} requires property ${fieldName}.`,
        opId,
      });
    }
  }
}

function validateCaseBinding(
  nodeType: GraphNodeType,
  properties: Record<string, unknown>,
  caseId: string,
  opId: string,
  errors: GraphPatchValidationError[],
): void {
  if (!isOntologyNodeType(nodeType) || nodeType === "Asset" || nodeType === "InvestmentCase") {
    return;
  }

  if (!("caseId" in properties)) {
    errors.push({
      code: "missing_required_property",
      message: `Case-scoped node type ${nodeType} must carry caseId.`,
      opId,
    });
    return;
  }

  if (properties.caseId !== caseId) {
    errors.push({
      code: "invalid_scope_target",
      message: `Case-scoped node type ${nodeType} must stay within case ${caseId}.`,
      opId,
    });
  }
}

function validateMergeKeys(
  nodeType: GraphNodeType,
  matchKeys: Record<string, string | number | boolean>,
  opId: string,
  errors: GraphPatchValidationError[],
): void {
  if (!isOntologyNodeType(nodeType) || !hasStableNodeMergePolicy(nodeType)) {
    return;
  }

  const policy = getStableNodeMergePolicy(nodeType);

  for (const identityKey of policy.identityKeys) {
    if (!(identityKey in matchKeys)) {
      errors.push({
        code: "missing_identity_key",
        message: `merge_node for ${nodeType} must include identity key ${identityKey}.`,
        opId,
      });
    }
  }
}

function validateImmutablePropertyUpdates(
  nodeType: GraphNodeType,
  properties: Record<string, unknown>,
  opId: string,
  errors: GraphPatchValidationError[],
): void {
  if (!isOntologyNodeType(nodeType) || !hasStableNodeMergePolicy(nodeType)) {
    return;
  }

  const policy = getStableNodeMergePolicy(nodeType);

  for (const fieldName of Object.keys(properties)) {
    if (policy.immutableFields.includes(fieldName)) {
      errors.push({
        code: "immutable_field_update",
        message: `Field ${fieldName} is immutable for stable node type ${nodeType}.`,
        opId,
      });
    }
  }
}

function isAllowedNodeTypeForScope(
  nodeType: GraphNodeType,
  scope: GraphPatch["targetScope"],
): boolean {
  return scope === "runtime"
    ? isRuntimeNodeType(nodeType)
    : isOntologyNodeType(nodeType);
}

function isKnownRef(
  ref: string,
  refTypes: Map<string, GraphNodeType>,
  existingRuntimeRefs: Set<string>,
  existingCaseRefs: Set<string>,
): boolean {
  return refTypes.has(ref) || existingRuntimeRefs.has(ref) || existingCaseRefs.has(ref);
}

function isKnownEvidenceRef(
  ref: string,
  refTypes: Map<string, GraphNodeType>,
  existingEvidenceRefs: Set<string>,
): boolean {
  return refTypes.get(ref) === "Evidence" || existingEvidenceRefs.has(ref);
}

function targetsNodeType(
  operation: GraphPatchOperation,
  refTypes: Map<string, GraphNodeType>,
  nodeType: GraphNodeType,
): boolean {
  switch (operation.type) {
    case "create_node":
      return operation.nodeType === nodeType;
    case "merge_node":
      return operation.nodeType === nodeType;
    case "update_property":
      return refTypes.get(operation.targetRef) === nodeType;
    case "create_edge":
      return (
        refTypes.get(operation.fromRef) === nodeType ||
        refTypes.get(operation.toRef) === nodeType
      );
    case "attach_evidence":
      return refTypes.get(operation.targetRef) === nodeType;
    case "summarize_subgraph":
      return refTypes.get(operation.targetRef) === nodeType;
    default:
      return assertNever(operation);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}
