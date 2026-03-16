import type { AgentType, GraphNodeType } from "./runtime.ts";

export const graphTargetScopes = ["runtime", "case"] as const;

export type GraphTargetScope = (typeof graphTargetScopes)[number];

export interface CreateNodeOperation {
  opId: string;
  type: "create_node";
  nodeRef: string;
  nodeType: GraphNodeType;
  properties: Record<string, unknown>;
}

export interface MergeNodeOperation {
  opId: string;
  type: "merge_node";
  resolvedRef: string;
  nodeType: GraphNodeType;
  matchKeys: Record<string, string | number | boolean>;
  properties: Record<string, unknown>;
}

export interface CreateEdgeOperation {
  opId: string;
  type: "create_edge";
  edgeType: string;
  fromRef: string;
  toRef: string;
  properties: Record<string, unknown>;
}

export interface UpdatePropertyOperation {
  opId: string;
  type: "update_property";
  targetRef: string;
  properties: Record<string, unknown>;
  mergeStrategy: "replace" | "merge";
}

export interface AttachEvidenceOperation {
  opId: string;
  type: "attach_evidence";
  targetRef: string;
  evidenceRef: string;
  relationType: "SUPPORTED_BY" | "CHALLENGED_BY" | "CITES";
}

export interface SummarizeSubgraphOperation {
  opId: string;
  type: "summarize_subgraph";
  targetRef: string;
  summary: string;
  sourceRefs: string[];
}

export type GraphPatchOperation =
  | CreateNodeOperation
  | MergeNodeOperation
  | CreateEdgeOperation
  | UpdatePropertyOperation
  | AttachEvidenceOperation
  | SummarizeSubgraphOperation;

export interface GraphPatch {
  patchId: string;
  runId: string;
  agentType: AgentType;
  targetScope: GraphTargetScope;
  basisRefs: string[];
  operations: GraphPatchOperation[];
}

const graphTargetScopeSet = new Set<string>(graphTargetScopes);

export function isGraphTargetScope(value: string): value is GraphTargetScope {
  return graphTargetScopeSet.has(value);
}
