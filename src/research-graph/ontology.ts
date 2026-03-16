export const ontologyNodeTypes = [
  "Asset",
  "InvestmentCase",
  "Thesis",
  "Evidence",
  "Risk",
  "LiquidityFactor",
  "LiquidityRegime",
  "MacroActorAction",
  "MarketSignal",
  "Judgment",
] as const;

export type OntologyNodeType = (typeof ontologyNodeTypes)[number];

export const stableEdgeTypes = [
  "FOCUSES_ON",
  "HAS_THESIS",
  "HAS_RISK",
  "HAS_LIQUIDITY_FACTOR",
  "HAS_LIQUIDITY_REGIME",
  "HAS_SIGNAL",
  "HAS_JUDGMENT",
  "SUPPORTED_BY",
  "CHALLENGED_BY",
  "DERIVED_FROM",
] as const;

export type StableEdgeType = (typeof stableEdgeTypes)[number];

export interface AssetNode {
  nodeType: "Asset";
  assetId: string;
  ticker: string;
  name: string;
  assetType: string;
  primaryExchange: string;
}

export interface InvestmentCaseNode {
  nodeType: "InvestmentCase";
  caseId: string;
  ticker: string;
  timeHorizon: string;
  caseType: string;
  status: string;
  createdAt: string;
}

export interface ThesisNode {
  nodeType: "Thesis";
  thesisId: string;
  caseId: string;
  stance: string;
  summary: string;
  timeframe: string;
  status: string;
}

export interface EvidenceNode {
  nodeType: "Evidence";
  evidenceId: string;
  caseId?: string;
  sourceType: string;
  sourceRef: string;
  summary: string;
  observedAt: string;
  provider: string;
}

export interface RiskNode {
  nodeType: "Risk";
  riskId: string;
  caseId: string;
  riskType: string;
  statement: string;
  severity: string;
  timeframe: string;
}

export interface LiquidityFactorNode {
  nodeType: "LiquidityFactor";
  factorId: string;
  caseId: string;
  factorType: string;
  direction: string;
  summary: string;
  observedAt: string;
}

export interface LiquidityRegimeNode {
  nodeType: "LiquidityRegime";
  regimeId: string;
  caseId: string;
  label: string;
  timeframe: string;
  confidence: number;
  observedAt: string;
}

export interface MacroActorActionNode {
  nodeType: "MacroActorAction";
  actionId: string;
  caseId: string;
  actor: string;
  actionType: string;
  summary: string;
  effectiveDate: string;
}

export interface MarketSignalNode {
  nodeType: "MarketSignal";
  signalId: string;
  caseId: string;
  signalType: string;
  timeframe: string;
  direction: string;
  observedAt: string;
}

export interface JudgmentNode {
  nodeType: "Judgment";
  judgmentId: string;
  caseId: string;
  stance: string;
  confidenceBand: string;
  summary: string;
  asOf: string;
}

export type OntologyNode =
  | AssetNode
  | InvestmentCaseNode
  | ThesisNode
  | EvidenceNode
  | RiskNode
  | LiquidityFactorNode
  | LiquidityRegimeNode
  | MacroActorActionNode
  | MarketSignalNode
  | JudgmentNode;

export interface StableRelationshipRule {
  type: StableEdgeType;
  from: OntologyNodeType;
  to: OntologyNodeType;
}

export const stableRelationshipRegistry: readonly StableRelationshipRule[] = [
  { type: "FOCUSES_ON", from: "InvestmentCase", to: "Asset" },
  { type: "HAS_THESIS", from: "InvestmentCase", to: "Thesis" },
  { type: "HAS_RISK", from: "InvestmentCase", to: "Risk" },
  { type: "HAS_LIQUIDITY_FACTOR", from: "InvestmentCase", to: "LiquidityFactor" },
  { type: "HAS_LIQUIDITY_REGIME", from: "InvestmentCase", to: "LiquidityRegime" },
  { type: "HAS_SIGNAL", from: "InvestmentCase", to: "MarketSignal" },
  { type: "HAS_JUDGMENT", from: "InvestmentCase", to: "Judgment" },
  { type: "SUPPORTED_BY", from: "Thesis", to: "Evidence" },
  { type: "CHALLENGED_BY", from: "Thesis", to: "Evidence" },
  { type: "SUPPORTED_BY", from: "Risk", to: "Evidence" },
  { type: "SUPPORTED_BY", from: "LiquidityFactor", to: "Evidence" },
  { type: "DERIVED_FROM", from: "LiquidityFactor", to: "MacroActorAction" },
  { type: "SUPPORTED_BY", from: "LiquidityRegime", to: "Evidence" },
  { type: "SUPPORTED_BY", from: "MarketSignal", to: "Evidence" },
  { type: "SUPPORTED_BY", from: "MacroActorAction", to: "Evidence" },
  { type: "SUPPORTED_BY", from: "Judgment", to: "Evidence" },
] as const;

const ontologyNodeTypeSet = new Set<string>(ontologyNodeTypes);
const stableEdgeTypeSet = new Set<string>(stableEdgeTypes);
const caseScopedOntologyNodeTypeSet = new Set<OntologyNodeType>(
  ontologyNodeTypes.filter((nodeType) => nodeType !== "Asset"),
);

export function isOntologyNodeType(value: string): value is OntologyNodeType {
  return ontologyNodeTypeSet.has(value);
}

export function isStableEdgeType(value: string): value is StableEdgeType {
  return stableEdgeTypeSet.has(value);
}

export function isCaseScopedOntologyNodeType(
  value: OntologyNodeType,
): boolean {
  return caseScopedOntologyNodeTypeSet.has(value);
}
