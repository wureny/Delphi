/**
 * Delphi prototype domain contracts — v0.2
 *
 * Adopted from `Delphi_Prototype_and_EFL_Pack_v0_2/schemas/domain-types.ts`.
 * These types define the boundary between the UI, workflow runtime, validators,
 * and the canonical Decision Ledger. The prototype simulates inference, but it
 * must not bypass these contracts.
 */

export type ISODateTime = string;
export type Id = string;

export type Confidence = "low" | "medium" | "high";
export type Materiality = "low" | "medium" | "high" | "critical";
export type ReviewActionType = "accept" | "edit" | "reject" | "escalate" | "defer";
export type ReviewStatus = "pending" | "approved" | "rejected" | "escalated" | "deferred";
export type RequiredReviewerRole = "analyst" | "senior_analyst" | "pm" | "cio" | "compliance";
export type RunStatus = "queued" | "running" | "completed" | "degraded" | "failed";
export type RunMode = "fixture" | "live" | "hybrid";
export type ThesisStatus = "draft" | "approved" | "superseded" | "archived";
export type ObjectStatus =
  | "active"
  | "open"
  | "closed"
  | "weakened"
  | "strengthened"
  | "increasing"
  | "decreasing"
  | "review_required";
export type DataClassification =
  | "public"
  | "licensed"
  | "internal"
  | "restricted"
  | "mnpi_like"
  | "synthetic";

/** Demo roles selectable in the prototype role switcher. */
export type DemoRole = "analyst" | "pm";

export interface DemoUser {
  userId: Id;
  role: DemoRole;
  displayName: string;
}

export interface VersionEnvelope {
  fixtureVersion: string;
  schemaVersion: string;
  synthetic: boolean;
}

export interface InvestmentCase extends VersionEnvelope {
  caseId: Id;
  tenantId: Id;
  entityId: Id;
  ticker: string;
  companyName: string;
  strategyPack: "fundamental_equity";
  sector: string;
  horizon: string;
  ownerUserId: Id;
  status: "active" | "archived";
  approvedThesisVersion: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ThesisPillar {
  pillarId: Id;
  title: string;
  statement: string;
  teamConviction: Confidence;
  status: ObjectStatus;
  ownerUserId: Id;
  evidenceRefs: Id[];
}

export interface Forecast {
  forecastId: Id;
  metric: string;
  period: string;
  scenario: "bear" | "base" | "bull" | string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  unit: string;
  currency?: string;
  ownerUserId: Id;
  status: ObjectStatus;
}

export interface Catalyst {
  catalystId: Id;
  title: string;
  expectedAt: ISODateTime;
  probability: Confidence;
  expectedImpact: string;
  status: ObjectStatus;
}

export interface Risk {
  riskId: Id;
  title: string;
  description: string;
  severity: Materiality;
  likelihood: Confidence;
  status: ObjectStatus;
  evidenceRefs: Id[];
}

export interface OpenQuestion {
  questionId: Id;
  question: string;
  ownerUserId: Id;
  status: ObjectStatus;
  evidenceRefs: Id[];
}

export interface ThesisSnapshot extends VersionEnvelope {
  thesisId: Id;
  caseId: Id;
  version: number;
  status: ThesisStatus;
  summary: string;
  ownerUserId: Id;
  approvedByUserId: Id;
  approvedAt: ISODateTime;
  validFrom: ISODateTime;
  recordedAt: ISODateTime;
  pillars: ThesisPillar[];
  forecasts: Forecast[];
  catalysts: Catalyst[];
  risks: Risk[];
  openQuestions: OpenQuestion[];
}

export interface DomainEvent extends VersionEnvelope {
  domainEventId: Id;
  tenantId: Id;
  entityId: Id;
  eventType: "earnings" | "guidance" | "filing" | "management_meeting" | "news" | string;
  title: string;
  occurredAt: ISODateTime;
  publishedAt: ISODateTime;
  observedAt: ISODateTime;
  sourceRefs: Id[];
  clusterId: Id;
  status: "queued" | "ready" | "processed" | "ignored";
}

export interface SourceDocument {
  sourceId: Id;
  tenantId: Id;
  title: string;
  sourceType: "earnings_release" | "transcript" | "financial_model" | "filing" | string;
  issuerEntityId: Id;
  uri: string;
  publishedAt?: ISODateTime;
  observedAt: ISODateTime;
  classification: DataClassification;
  contentHash: string;
  version: number;
  accessPolicyId: Id;
  status: "available" | "unavailable" | "superseded";
}

export interface SourceLocator {
  section?: string;
  paragraph?: number;
  timestampSeconds?: number;
  cellRange?: string;
  page?: number;
}

export interface NumericValue {
  label: string;
  value: number;
  unit: string;
  currency?: string;
  period?: string;
  basis: string;
  sourceExcerptId: Id;
}

export interface SourceExcerpt {
  excerptId: Id;
  sourceId: Id;
  locator: SourceLocator;
  text: string;
  numericValues?: NumericValue[];
  classification: DataClassification;
  contentHash: string;
}

export interface SourceBundle extends VersionEnvelope {
  sourceDocument: SourceDocument;
  excerpts: SourceExcerpt[];
}

export type FundContextRole = "external_evidence" | "internal_working_context" | "internal_approved_state";
export type FundContextObjectKind = "source_document" | "thesis_snapshot";
export type FundContextConnectorType =
  | "public_event_feed"
  | "customer_model_repository"
  | "customer_research_repository"
  | "canonical_state_store";

export interface FundContextConnector {
  connectorId: Id;
  label: string;
  connectorType: FundContextConnectorType;
  mode: "fixture_simulated";
  accessMode: "read_only";
  executionLocation: "local_demo";
  persistence: "none";
  status: "fixture_available";
}

export interface FundContextArtifact {
  artifactId: Id;
  objectRef: Id;
  objectKind: FundContextObjectKind;
  title: string;
  contextRole: FundContextRole;
  connectorId: Id;
  classification: DataClassification;
  dataOwner: "external_publisher" | "customer";
  accessPolicyId: Id;
  allowedRoles: DemoRole[];
  policyInheritance: "source";
  asOf: ISODateTime;
  observedAt: ISODateTime;
  version: number;
  contentHash: string;
  externalModelAccess: "not_used" | "blocked";
  allowedExecution: "fixture_only";
  externalTransfer: false;
  lifecycleStage: "normalized_fixture";
  deletionPropagation: "simulated";
  graphProjection: "derived_only";
  derivedObjectRefs: Id[];
}

export interface FundContextManifest extends VersionEnvelope {
  manifestId: Id;
  tenantId: Id;
  caseId: Id;
  generatedAt: ISODateTime;
  connectors: FundContextConnector[];
  artifacts: FundContextArtifact[];
}

export type PatchOperation =
  | { op: "add"; path: string; value: unknown }
  | { op: "replace"; path: string; value: unknown }
  | { op: "remove"; path: string };

export interface ThesisDeltaProposal {
  proposalId: Id;
  tenantId: Id;
  caseId: Id;
  runId: Id;
  fromThesisVersion: number;
  deltaType:
    | "thesis_pillar_update"
    | "forecast_update"
    | "forecast_review"
    | "risk_update"
    | "open_question"
    | "open_question_create"
    | string;
  targetObjectType: "thesis_pillar" | "forecast" | "risk" | "open_question" | string;
  targetObjectId?: Id;
  headline: string;
  whatChanged: string;
  againstOurView: string;
  whyItMatters: string;
  uncertainties: string[];
  recommendedFollowUp: string;
  evidenceRefs: Id[];
  findingRefs: Id[];
  confidence: Confidence;
  materiality: Materiality;
  requiredReviewerRole: RequiredReviewerRole;
  proposedPatch: PatchOperation[];
  status: "proposed" | "under_review" | "approved" | "rejected" | "superseded";
  createdAt: ISODateTime;
}

export interface ModelRouteReceipt {
  provider: string;
  model: string;
  endpointOwner: "local" | "customer" | "delphi" | string;
  retentionPolicy: "zero" | "provider_default" | string;
  trainingUse: "disabled" | "enabled" | string;
}

export interface DegradedReason {
  code: string;
  message: string;
  affectedObjectRefs: Id[];
  recoverable: boolean;
}

export interface WorkflowRun {
  runId: Id;
  tenantId: Id;
  caseId: Id;
  domainEventId: Id;
  workflowId: "earnings_to_thesis" | string;
  workflowVersion: string;
  status: RunStatus;
  mode: RunMode;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
  modelRoutes: ModelRouteReceipt[];
  skillVersions: Record<string, string>;
  sourceRefs: Id[];
  degradedReasons: DegradedReason[];
  outputProposalIds: Id[];
}

export type RunEventType =
  | "run_created"
  | "source_loaded"
  | "source_unavailable"
  | "planner_completed"
  | "task_assigned"
  | "agent_started"
  | "finding_created"
  | "validation_passed"
  | "validation_failed"
  | "proposal_created"
  | "review_required"
  | "degraded_mode_entered"
  | "agent_failed"
  | "run_completed"
  | "run_failed";

export interface RunEvent {
  runEventId: Id;
  runId: Id;
  eventType: RunEventType;
  occurredAt: ISODateTime;
  actorType: "system" | "agent" | "user";
  actorId: Id;
  publicMessage: string;
  objectRefs: Id[];
}

export interface WorkflowRunBundle extends VersionEnvelope {
  workflowRun: WorkflowRun;
  events: RunEvent[];
}

export interface Review {
  reviewId: Id;
  proposalId: Id;
  reviewerUserId: Id;
  reviewerRole: RequiredReviewerRole;
  action: ReviewActionType;
  status: ReviewStatus;
  editedPatch?: PatchOperation[];
  reasonCode?: string;
  note?: string;
  escalatedToUserId?: Id;
  deferredUntil?: ISODateTime;
  reviewedAt: ISODateTime;
}

export interface StateTransition extends VersionEnvelope {
  transitionId: Id;
  tenantId: Id;
  caseId: Id;
  proposalIds: Id[];
  reviewIds: Id[];
  runId: Id;
  transitionType: string;
  fromVersion: number;
  toVersion: number;
  sourceEventIds: Id[];
  evidenceRefs: Id[];
  requestedBy: "agent" | "user" | "system";
  approvedByUserId: Id;
  approvedAt: ISODateTime;
  workflowVersion: string;
  skillVersions: Record<string, string>;
  modelRoutes: ModelRouteReceipt[];
  reversible: boolean;
  status: "applied" | "rolled_back" | "superseded";
  beforeSnapshotHash: string;
  afterSnapshotHash: string;
}

export interface PrivacyReceipt extends VersionEnvelope {
  receiptId: Id;
  runId: Id;
  workflowVersion: string;
  classification: DataClassification;
  executionLocation: string;
  modelRoutes: ModelRouteReceipt[];
  rawContentSentToDelphiCloud: boolean;
  externalWebAccess: boolean;
  toolNames: string[];
  canonicalWritesProposed: number;
  canonicalWritesApproved: number;
  supportAccess: "none" | "jit" | string;
  generatedAt: ISODateTime;
}

/** Typed result returned by every validator and by the transition gateway. */
export interface ValidationMessage {
  validator:
    | "schema"
    | "reference_scope"
    | "evidence_refs"
    | "citation"
    | "numeric"
    | "semantic_patch"
    | "current_version"
    | "authorization"
    | "degraded_policy"
    | "idempotency"
    | "policy";
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  objectRefs?: Id[];
}

export interface ValidationResult<T> {
  status: "accepted" | "accepted_with_warnings" | "rejected";
  value?: T;
  messages: ValidationMessage[];
}

/**
 * The complete governed demo state. Everything the review gateway may mutate
 * lives here; UI-only preferences (role, drawer state, playback) live outside.
 */
export interface DomainState {
  /** Currently approved thesis snapshot (starts at v12). */
  currentThesis: ThesisSnapshot;
  /** Superseded snapshots, oldest first (point-in-time history). */
  thesisHistory: ThesisSnapshot[];
  /** All review actions in the order they occurred. */
  reviews: Review[];
  /** Applied (or rolled back) state transitions, oldest first. */
  transitions: StateTransition[];
}
