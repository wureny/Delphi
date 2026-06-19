export type AssetKind = "equity" | "theme";
export type Impact = "supports" | "contradicts" | "neutral" | "unclear";
export type Confidence = "low" | "medium" | "high";
export type ClassificationSource = "ai" | "user";
export type AssumptionStatus = "holding" | "weakening" | "broken" | "uncertain";
export type ConvictionBand = "low" | "medium" | "high";
export type EvidenceStatus = "new" | "accepted" | "dismissed";
export type EvidenceFilter = "new" | "contradicts" | "uncertain" | "accepted" | "all";
export type ViewKey = "dashboard" | "inbox" | "thesis" | "changed";
export type DemoState = "normal" | "loading" | "empty" | "error";

export interface Asset {
  id: string;
  name: string;
  ticker: string;
  kind: AssetKind;
}

export interface Source {
  name: string;
  quality: Confidence;
  url: string;
  publishedAt: string;
}

export interface Citation {
  label: string;
  url: string;
}

export interface Classification {
  assetId: string | null;
  thesisId: string | null;
  assumptionId: string | null;
  impact: Impact;
  confidence: Confidence;
  source: ClassificationSource;
  rationale: string;
}

export interface Evidence {
  id: string;
  status: EvidenceStatus;
  receivedAt: string;
  headline: string;
  excerpt: string;
  source: Source;
  classification: Classification;
  citation: Citation | null;
  uncertain: boolean;
  stale?: boolean;
}

export interface Assumption {
  id: string;
  text: string;
  status: AssumptionStatus;
  critical: boolean;
  note: string;
}

export interface Risk {
  id: string;
  text: string;
  severity: "low" | "medium" | "high";
}

export interface Catalyst {
  id: string;
  text: string;
  date: string;
  kind: string;
}

export interface Thesis {
  id: string;
  assetId: string;
  title: string;
  summary: string;
  conviction: number;
  convictionBand: ConvictionBand;
  timeHorizon: string;
  lastReviewed: string;
  pendingChanges: number;
  unresolved: number;
  staleThresholdDays: number;
  bull: string;
  bear: string;
  assumptions: Assumption[];
  risks: Risk[];
  catalysts: Catalyst[];
}

export interface ChangeSummaryLine {
  text: string;
  evidenceId: string | null;
}

export interface ChangeEvent {
  kind: "evidence_added" | "assumption_status";
  evidenceId?: string;
  impact?: Impact;
  assumptionId?: string;
  from?: AssumptionStatus;
  to?: AssumptionStatus;
}

export interface ConvictionPrompt {
  direction: "review" | "down" | "up";
  text: string;
  uncertain: boolean;
}

export interface ChangeSummary {
  thesisId: string;
  since: string;
  summary: ChangeSummaryLine[];
  events: ChangeEvent[];
  convictionPrompt: ConvictionPrompt;
}

export interface DecisionTraceEntry {
  id: string;
  at: string;
  actor: string;
  decision: string;
  priorConviction: number | null;
  newConviction: number;
  evidenceIds: string[];
  changedAssumptions: string[];
  rationale: string;
  sources: string[];
  followUp: string;
  unresolved: string[];
}

export interface WorkspaceData {
  now: string;
  user: { name: string; role: string };
  assets: Asset[];
  theses: Thesis[];
  evidence: Evidence[];
  whatChanged: Record<string, ChangeSummary>;
  decisionTraces: Record<string, DecisionTraceEntry[]>;
}

export interface DecisionInput {
  actor: string;
  decision: string;
  priorConviction: number;
  newConviction: number;
  evidenceIds: string[];
  changedAssumptions: string[];
  rationale: string;
  sources: string[];
  followUp: string;
  unresolved: string[];
}
