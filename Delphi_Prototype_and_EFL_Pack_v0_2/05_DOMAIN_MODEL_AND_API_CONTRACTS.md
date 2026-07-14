# Delphi Domain Model & API Contracts v0.2

**Language:** TypeScript-first contracts  
**Purpose:** keep UI, orchestration, validation, fixtures, and persistence aligned

---

## 1. Contract principles

1. Domain objects have stable identity.
2. Runtime objects are separate from approved state.
3. Model output is untrusted until validated.
4. Proposal does not equal decision.
5. A review action does not equal a state transition unless authorized.
6. Every approved transition references a before version, after version, run, evidence, and human actor.
7. Missing or contradictory evidence is represented explicitly.
8. Interfaces are versioned.

---

## 2. Shared primitives

```ts
export type ISODateTime = string;
export type UUID = string;
export type EntityId = string;
export type TenantId = string;
export type CaseId = string;
export type RunId = string;
export type SourceId = string;

export type Confidence = "low" | "medium" | "high";
export type Materiality = "low" | "medium" | "high" | "critical";
export type DataClassification =
  | "public"
  | "licensed"
  | "internal"
  | "restricted"
  | "mnpi_like"
  | "synthetic";

export type EvidenceStance =
  | "supports"
  | "contradicts"
  | "contextualizes"
  | "unknown";

export interface VersionRef {
  version: number;
  recordedAt: ISODateTime;
}
```

---

## 3. Sources and evidence

```ts
export interface SourceDocument {
  sourceId: SourceId;
  tenantId: TenantId;
  title: string;
  sourceType:
    | "earnings_release"
    | "filing"
    | "transcript"
    | "presentation"
    | "news"
    | "internal_note"
    | "financial_model"
    | "other";
  issuerEntityId?: EntityId;
  uri?: string;
  publishedAt?: ISODateTime;
  observedAt: ISODateTime;
  classification: DataClassification;
  contentHash: string;
  version: number;
  accessPolicyId: string;
  status: "available" | "unavailable" | "partial" | "superseded";
}

export interface SourceExcerpt {
  excerptId: string;
  sourceId: SourceId;
  locator: {
    page?: number;
    section?: string;
    paragraph?: number;
    timestampSeconds?: number;
    cellRange?: string;
  };
  text: string;
  numericValues?: ExtractedNumber[];
  classification: DataClassification;
  contentHash: string;
}

export interface ExtractedNumber {
  label: string;
  value: number;
  unit?: string;
  currency?: string;
  period?: string;
  basis?: "reported" | "adjusted" | "guidance" | "consensus" | "team_forecast";
  sourceExcerptId: string;
}

export interface Claim {
  claimId: string;
  caseId: CaseId;
  statement: string;
  claimType: "fact" | "inference" | "team_judgment" | "unknown";
  evidenceRefs: EvidenceLink[];
  confidence: Confidence;
  status: "proposed" | "validated" | "rejected";
}

export interface EvidenceLink {
  evidenceLinkId: string;
  claimId: string;
  excerptId: string;
  stance: EvidenceStance;
  rationale?: string;
}
```

---

## 4. Investment case and approved state

```ts
export interface InvestmentCase {
  caseId: CaseId;
  tenantId: TenantId;
  entityId: EntityId;
  ticker: string;
  companyName: string;
  strategyPack: "fundamental_equity";
  horizon: string;
  ownerUserId: string;
  status: "active" | "watchlist" | "archived";
  approvedThesisVersion: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ThesisSnapshot {
  thesisId: string;
  caseId: CaseId;
  version: number;
  status: "draft" | "proposed" | "approved" | "superseded";
  summary: string;
  pillars: ThesisPillar[];
  forecasts: Forecast[];
  catalysts: Catalyst[];
  risks: Risk[];
  openQuestions: OpenQuestion[];
  ownerUserId: string;
  approvedByUserId?: string;
  approvedAt?: ISODateTime;
  validFrom: ISODateTime;
  validTo?: ISODateTime;
  recordedAt: ISODateTime;
}

export interface ThesisPillar {
  pillarId: string;
  thesisId: string;
  title: string;
  statement: string;
  teamConviction: Confidence;
  status: "active" | "weakened" | "invalidated" | "retired";
  ownerUserId: string;
  evidenceRefs: string[];
}

export interface Forecast {
  forecastId: string;
  thesisId: string;
  metric: string;
  period: string;
  scenario: "bear" | "base" | "bull" | "other";
  value?: number;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  currency?: string;
  ownerUserId: string;
  status: "active" | "review_required" | "superseded";
}

export interface Catalyst {
  catalystId: string;
  thesisId: string;
  title: string;
  expectedAt?: ISODateTime;
  probability?: Confidence;
  expectedImpact?: string;
  status: "open" | "occurred" | "cancelled" | "superseded";
}

export interface Risk {
  riskId: string;
  thesisId: string;
  title: string;
  description: string;
  severity: Materiality;
  likelihood: Confidence;
  status: "open" | "increasing" | "decreasing" | "realized" | "closed";
  evidenceRefs: string[];
}

export interface OpenQuestion {
  questionId: string;
  thesisId: string;
  question: string;
  ownerUserId?: string;
  dueAt?: ISODateTime;
  status: "open" | "answered" | "deferred" | "closed";
  evidenceRefs: string[];
}
```

---

## 5. Events

```ts
export interface DomainEvent {
  domainEventId: string;
  tenantId: TenantId;
  entityId: EntityId;
  eventType: "earnings" | "guidance" | "filing" | "management_comment" | "other";
  title: string;
  occurredAt?: ISODateTime;
  publishedAt?: ISODateTime;
  observedAt: ISODateTime;
  sourceRefs: SourceId[];
  clusterId?: string;
  status: "detected" | "normalized" | "ready" | "partial" | "dismissed";
}
```

---

## 6. Runtime objects

```ts
export type RunStatus =
  | "created"
  | "loading"
  | "analyzing"
  | "validating"
  | "proposed"
  | "completed"
  | "degraded"
  | "failed";

export interface WorkflowRun {
  runId: RunId;
  tenantId: TenantId;
  caseId: CaseId;
  domainEventId: string;
  workflowId: "earnings_to_thesis";
  workflowVersion: string;
  status: RunStatus;
  mode: "fixture" | "live" | "shadow";
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
  modelRoutes: ModelRouteRecord[];
  skillVersions: Record<string, string>;
  sourceRefs: SourceId[];
  degradedReasons: DegradedReason[];
  outputProposalIds: string[];
}

export interface AgentTask<TInput = unknown> {
  taskId: string;
  runId: RunId;
  agentRole:
    | "facts_numbers"
    | "thesis_impact"
    | "risk_counterevidence"
    | "judge_composer";
  taskType: string;
  input: TInput;
  allowedToolNames: string[];
  outputSchemaVersion: string;
  dependsOnTaskIds: string[];
}

export interface Finding {
  findingId: string;
  runId: RunId;
  taskId: string;
  findingType:
    | "fact"
    | "variance"
    | "thesis_impact"
    | "risk"
    | "contradiction"
    | "unknown";
  statement: string;
  evidenceRefs: string[];
  objectRefs: string[];
  confidence: Confidence;
  status: "proposed" | "validated" | "rejected";
  validationMessages: ValidationMessage[];
}

export interface RunEvent {
  runEventId: string;
  runId: RunId;
  eventType:
    | "run_created"
    | "source_loaded"
    | "source_unavailable"
    | "task_assigned"
    | "agent_started"
    | "finding_created"
    | "proposal_created"
    | "validation_passed"
    | "validation_failed"
    | "degraded_mode_entered"
    | "review_required"
    | "review_recorded"
    | "state_transition_applied"
    | "run_completed"
    | "run_failed";
  occurredAt: ISODateTime;
  actorType: "system" | "agent" | "user";
  actorId: string;
  publicMessage: string;
  objectRefs: string[];
  metadata?: Record<string, unknown>;
}
```

---

## 7. Delta proposals

```ts
export type DeltaType =
  | "thesis_summary_update"
  | "thesis_pillar_update"
  | "forecast_review"
  | "catalyst_update"
  | "risk_update"
  | "open_question_create"
  | "no_change";

export interface ThesisDeltaProposal {
  proposalId: string;
  tenantId: TenantId;
  caseId: CaseId;
  runId: RunId;
  fromThesisVersion: number;
  deltaType: DeltaType;
  targetObjectType:
    | "thesis"
    | "thesis_pillar"
    | "forecast"
    | "catalyst"
    | "risk"
    | "open_question";
  targetObjectId?: string;
  headline: string;
  whatChanged: string;
  againstOurView: string;
  whyItMatters: string;
  uncertainties: string[];
  recommendedFollowUp?: string;
  evidenceRefs: string[];
  findingRefs: string[];
  confidence: Confidence;
  materiality: Materiality;
  requiredReviewerRole: "analyst" | "pm" | "head_of_research";
  proposedPatch: JsonPatchOperation[];
  status:
    | "proposed"
    | "under_review"
    | "accepted"
    | "edited"
    | "rejected"
    | "escalated"
    | "deferred";
  createdAt: ISODateTime;
}

export interface JsonPatchOperation {
  op: "add" | "remove" | "replace" | "test";
  path: string;
  value?: unknown;
}
```

Do not expose arbitrary JSON Patch paths from model output directly to persistence. The proposal validator maps allowed semantic operations to canonical writes.

---

## 8. Review and state transitions

```ts
export type ReviewActionType =
  | "accept"
  | "edit"
  | "reject"
  | "escalate"
  | "defer";

export interface ReviewAction {
  reviewId: string;
  proposalId: string;
  actorUserId: string;
  actorRole: "analyst" | "pm" | "head_of_research" | "admin";
  action: ReviewActionType;
  editedPatch?: JsonPatchOperation[];
  reasonCode?: string;
  comment?: string;
  escalatedToUserId?: string;
  deferredUntil?: ISODateTime;
  occurredAt: ISODateTime;
}

export interface StateTransition {
  transitionId: string;
  tenantId: TenantId;
  caseId: CaseId;
  proposalId: string;
  reviewId: string;
  runId: RunId;
  transitionType: DeltaType;
  fromVersion: number;
  toVersion: number;
  sourceEventIds: string[];
  evidenceRefs: string[];
  requestedBy: "agent" | "user";
  approvedByUserId: string;
  approvedAt: ISODateTime;
  workflowVersion: string;
  skillVersions: Record<string, string>;
  modelRoutes: ModelRouteRecord[];
  reversible: boolean;
  status: "applied" | "rolled_back" | "superseded";
  beforeSnapshotHash: string;
  afterSnapshotHash: string;
}
```

Authorization rules:

- analyst may approve low/medium materiality within owned cases;
- high/critical changes may require PM;
- degraded proposals can require escalation;
- reject, defer, and escalate never mutate approved state;
- edit is attributed to the human actor;
- transitions are idempotent by `proposalId + approved review`.

---

## 9. Validation

```ts
export interface ValidationMessage {
  validator:
    | "schema"
    | "reference_scope"
    | "citation"
    | "numeric"
    | "policy"
    | "duplicate"
    | "authorization";
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  objectRefs?: string[];
}

export interface ValidationResult<T> {
  status: "accepted" | "accepted_with_warnings" | "rejected";
  value?: T;
  messages: ValidationMessage[];
}

export interface DegradedReason {
  code:
    | "source_unavailable"
    | "source_partial"
    | "numeric_conflict"
    | "agent_failed"
    | "schema_rejected"
    | "policy_blocked"
    | "insufficient_evidence";
  message: string;
  affectedObjectRefs: string[];
  recoverable: boolean;
}
```

---

## 10. Model route and privacy receipt

```ts
export interface ModelRouteRecord {
  provider: string;
  model: string;
  endpointOwner: "delphi" | "customer" | "local";
  region?: string;
  retentionPolicy: "zero" | "provider_default" | "unknown";
  trainingUse: "disabled" | "provider_policy" | "unknown";
}

export interface PrivacyReceipt {
  receiptId: string;
  runId: RunId;
  workflowVersion: string;
  classification: DataClassification;
  executionLocation: string;
  modelRoutes: ModelRouteRecord[];
  rawContentSentToDelphiCloud: boolean;
  externalWebAccess: boolean;
  toolNames: string[];
  canonicalWritesProposed: number;
  canonicalWritesApproved: number;
  supportAccess: "none" | "jit" | "standing";
  generatedAt: ISODateTime;
}
```

---

## 11. API surface

### Queries

```http
GET /api/inbox
GET /api/cases
GET /api/cases/:caseId
GET /api/cases/:caseId/thesis?version=12
GET /api/cases/:caseId/history
GET /api/deltas/:proposalId
GET /api/ledger
GET /api/ledger/:transitionId
GET /api/runs/:runId
GET /api/runs/:runId/events
GET /api/sources/:sourceId
GET /api/excerpts/:excerptId
GET /api/privacy-receipts/:runId
```

### Commands

```http
POST /api/runs
POST /api/runs/:runId/replay
POST /api/proposals/:proposalId/review
POST /api/transitions/:transitionId/rollback
POST /api/demo/reset
POST /api/demo/simulate-degraded
```

### Example: create run

```json
{
  "caseId": "case_arct_001",
  "domainEventId": "event_arct_fy26_q2",
  "mode": "fixture"
}
```

### Example: review proposal

```json
{
  "action": "edit",
  "actorUserId": "user_analyst_01",
  "comment": "Keep the pillar active but add implementation-delay risk.",
  "editedPatch": [
    {
      "op": "replace",
      "path": "/pillars/pillar_02/statement",
      "value": "Demand remains durable, with elevated implementation-delay risk in mid-market customers."
    }
  ]
}
```

---

## 12. Error envelope

```ts
export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId: string;
    recoverable: boolean;
    details?: Record<string, unknown>;
  };
}
```

Do not return raw provider errors or stack traces to the browser.

---

## 13. Fixture layout

```text
fixtures/
├── manifest.json
├── case.arct.json
├── thesis.arct.v12.json
├── event.arct.fy26q2.json
├── sources/
│   ├── earnings-release.json
│   ├── transcript.json
│   └── team-forecast.json
├── runs/
│   ├── successful-run.json
│   └── degraded-run.json
├── proposals/
│   └── thesis-deltas.json
└── expected/
    ├── thesis.arct.v13.json
    └── ledger-transition.json
```

Fixtures must include version and schema fields:

```json
{
  "fixtureVersion": "0.2.0",
  "schemaVersion": "2026-07-13",
  "synthetic": true
}
```

---

## 14. Sample proposal

```json
{
  "proposalId": "proposal_arct_001",
  "caseId": "case_arct_001",
  "runId": "run_arct_success_001",
  "fromThesisVersion": 12,
  "deltaType": "thesis_pillar_update",
  "targetObjectType": "thesis_pillar",
  "targetObjectId": "pillar_midmarket_demand",
  "headline": "Mid-market demand durability is less certain",
  "whatChanged": "Net retention fell below the team forecast range and management cited longer implementation cycles.",
  "againstOurView": "The approved pillar assumes stable implementation velocity and resilient net retention.",
  "whyItMatters": "A sustained implementation slowdown would reduce FY27 expansion assumptions.",
  "uncertainties": [
    "The transcript does not quantify the duration of implementation delays."
  ],
  "recommendedFollowUp": "Revisit FY27 net-retention assumptions after customer-cohort data is available.",
  "evidenceRefs": [
    "excerpt_release_guidance_03",
    "excerpt_call_implementation_02"
  ],
  "confidence": "high",
  "materiality": "high",
  "requiredReviewerRole": "pm",
  "proposedPatch": [
    {
      "op": "replace",
      "path": "/pillars/pillar_midmarket_demand/status",
      "value": "weakened"
    }
  ],
  "status": "proposed",
  "createdAt": "2026-07-13T14:05:00Z"
}
```

---

## 15. Contract tests

Minimum tests:

- every proposal references an existing run and case;
- `fromThesisVersion` equals current approved version;
- all evidence refs exist and are accessible;
- every factual sentence has evidence or is labeled unknown;
- numbers match extracted source values and units;
- prohibited patch paths are rejected;
- review actor has authority;
- duplicate approval is idempotent;
- reject/escalate/defer do not update the thesis;
- successful transition increments version exactly once;
- degraded proposal cannot bypass escalation policy;
- reset restores exact fixture hashes.
