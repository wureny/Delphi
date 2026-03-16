import { ontologyNodeTypes, type OntologyNodeType } from "./ontology.ts";

export const stableIdentityScopes = ["global", "case"] as const;

export type StableIdentityScope = (typeof stableIdentityScopes)[number];

export const stableConflictStrategies = [
  "reject",
  "replace",
  "replace_if_newer",
] as const;

export type StableConflictStrategy = (typeof stableConflictStrategies)[number];

export interface StableNodeMergePolicy {
  nodeType: OntologyNodeType;
  identityScope: StableIdentityScope;
  identityKeys: readonly string[];
  immutableFields: readonly string[];
  mutableFields: readonly string[];
  conflictStrategy: StableConflictStrategy;
  freshnessField?: string;
  notes: string;
}

export const stableNodeMergePolicies: readonly StableNodeMergePolicy[] = [
  {
    nodeType: "Asset",
    identityScope: "global",
    identityKeys: ["ticker"],
    immutableFields: ["assetId", "ticker"],
    mutableFields: ["name", "assetType", "primaryExchange"],
    conflictStrategy: "replace",
    notes: "Asset is the global anchor. Ticker is the v0 identity key.",
  },
  {
    nodeType: "InvestmentCase",
    identityScope: "case",
    identityKeys: ["caseId"],
    immutableFields: ["caseId", "ticker", "timeHorizon", "caseType", "createdAt"],
    mutableFields: ["status"],
    conflictStrategy: "reject",
    notes: "InvestmentCase should be created once and only status may advance.",
  },
  {
    nodeType: "Thesis",
    identityScope: "case",
    identityKeys: ["caseId", "thesisId"],
    immutableFields: ["caseId", "thesisId", "timeframe"],
    mutableFields: ["stance", "summary", "status"],
    conflictStrategy: "replace",
    notes: "Thesis is case-scoped and can be revised in place by the latest accepted finding.",
  },
  {
    nodeType: "Evidence",
    identityScope: "case",
    identityKeys: ["caseId", "provider", "sourceType", "sourceRef", "observedAt"],
    immutableFields: ["caseId", "provider", "sourceType", "sourceRef", "observedAt"],
    mutableFields: ["summary"],
    conflictStrategy: "replace",
    notes: "Evidence is deduplicated within a case by provider and source identity.",
  },
  {
    nodeType: "Risk",
    identityScope: "case",
    identityKeys: ["caseId", "riskId"],
    immutableFields: ["caseId", "riskId", "riskType", "timeframe"],
    mutableFields: ["statement", "severity"],
    conflictStrategy: "replace",
    notes: "Risk is case-scoped and may be refined, but not retyped.",
  },
  {
    nodeType: "LiquidityFactor",
    identityScope: "case",
    identityKeys: ["caseId", "factorId"],
    immutableFields: ["caseId", "factorId", "factorType"],
    mutableFields: ["direction", "summary", "observedAt"],
    conflictStrategy: "replace_if_newer",
    freshnessField: "observedAt",
    notes: "LiquidityFactor should update only when a newer observation arrives.",
  },
  {
    nodeType: "LiquidityRegime",
    identityScope: "case",
    identityKeys: ["caseId", "regimeId"],
    immutableFields: ["caseId", "regimeId"],
    mutableFields: ["label", "timeframe", "confidence", "observedAt"],
    conflictStrategy: "replace_if_newer",
    freshnessField: "observedAt",
    notes: "LiquidityRegime reflects the latest valid regime snapshot for the case.",
  },
  {
    nodeType: "MacroActorAction",
    identityScope: "case",
    identityKeys: ["caseId", "actionId"],
    immutableFields: ["caseId", "actionId", "actor", "actionType", "effectiveDate"],
    mutableFields: ["summary"],
    conflictStrategy: "reject",
    notes: "MacroActorAction should be treated as a stable event once recorded.",
  },
  {
    nodeType: "MarketSignal",
    identityScope: "case",
    identityKeys: ["caseId", "signalId"],
    immutableFields: ["caseId", "signalId", "signalType"],
    mutableFields: ["timeframe", "direction", "observedAt"],
    conflictStrategy: "replace_if_newer",
    freshnessField: "observedAt",
    notes: "MarketSignal is refreshed as newer market observations arrive.",
  },
  {
    nodeType: "Judgment",
    identityScope: "case",
    identityKeys: ["caseId", "judgmentId"],
    immutableFields: ["caseId", "judgmentId"],
    mutableFields: ["stance", "confidenceBand", "summary", "asOf"],
    conflictStrategy: "replace_if_newer",
    freshnessField: "asOf",
    notes: "Judgment is the latest synthesized view for a case and may be revised over time.",
  },
] as const;

const stableNodeMergePolicyMap = new Map<OntologyNodeType, StableNodeMergePolicy>(
  stableNodeMergePolicies.map((policy) => [policy.nodeType, policy]),
);

const ontologyNodeTypeSet = new Set<string>(ontologyNodeTypes);

export function getStableNodeMergePolicy(
  nodeType: OntologyNodeType,
): StableNodeMergePolicy {
  const policy = stableNodeMergePolicyMap.get(nodeType);

  if (!policy) {
    throw new Error(`Missing stable node merge policy for ${nodeType}.`);
  }

  return policy;
}

export function hasStableNodeMergePolicy(
  value: string,
): value is OntologyNodeType {
  return ontologyNodeTypeSet.has(value) && stableNodeMergePolicyMap.has(value as OntologyNodeType);
}

export function getStableIdentityFields(
  nodeType: OntologyNodeType,
): readonly string[] {
  return getStableNodeMergePolicy(nodeType).identityKeys;
}
