/**
 * Zod runtime schemas for every fixture-loaded domain object.
 *
 * Matching the TypeScript contract at compile time is not enough: fixtures
 * (and any future live-model output) must pass these schemas before entering
 * the demo store or the transition gateway.
 */
import { z } from "zod";

export const confidenceSchema = z.enum(["low", "medium", "high"]);
export const materialitySchema = z.enum(["low", "medium", "high", "critical"]);
export const objectStatusSchema = z.enum([
  "active",
  "open",
  "closed",
  "weakened",
  "strengthened",
  "increasing",
  "decreasing",
  "review_required",
]);
export const classificationSchema = z.enum([
  "public",
  "licensed",
  "internal",
  "restricted",
  "mnpi_like",
  "synthetic",
]);
export const reviewerRoleSchema = z.enum(["analyst", "senior_analyst", "pm", "cio", "compliance"]);

export const envelopeSchema = z.object({
  fixtureVersion: z.string(),
  schemaVersion: z.string(),
  synthetic: z.boolean(),
});

export const originKindSchema = z.enum(["real_public", "demo_derived", "synthetic", "user_provided_local"]);
export const publisherKindSchema = z.enum(["issuer", "regulator", "institution", "demo_team", "user"]);
export const inputUsageStatusSchema = z.enum(["eligible", "used", "excluded", "unavailable"]);

export const investmentCaseSchema = envelopeSchema.extend({
  caseId: z.string(),
  tenantId: z.string(),
  entityId: z.string(),
  ticker: z.string(),
  companyName: z.string(),
  strategyPack: z.literal("fundamental_equity"),
  sector: z.string(),
  horizon: z.string(),
  ownerUserId: z.string(),
  status: z.enum(["active", "archived"]),
  approvedThesisVersion: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  originKind: originKindSchema.optional(),
  authorshipLabel: z.string().optional(),
});

export const pillarSchema = z.object({
  pillarId: z.string(),
  title: z.string(),
  statement: z.string(),
  teamConviction: confidenceSchema,
  status: objectStatusSchema,
  ownerUserId: z.string(),
  evidenceRefs: z.array(z.string()),
});

export const forecastSchema = z.object({
  forecastId: z.string(),
  metric: z.string(),
  period: z.string(),
  scenario: z.string(),
  value: z.number().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  unit: z.string(),
  currency: z.string().optional(),
  ownerUserId: z.string(),
  status: objectStatusSchema,
});

export const catalystSchema = z.object({
  catalystId: z.string(),
  title: z.string(),
  expectedAt: z.string(),
  probability: confidenceSchema,
  expectedImpact: z.string(),
  status: objectStatusSchema,
});

export const riskSchema = z.object({
  riskId: z.string(),
  title: z.string(),
  description: z.string(),
  severity: materialitySchema,
  likelihood: confidenceSchema,
  status: objectStatusSchema,
  evidenceRefs: z.array(z.string()),
});

export const openQuestionSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  ownerUserId: z.string(),
  status: objectStatusSchema,
  evidenceRefs: z.array(z.string()),
});

export const thesisSnapshotSchema = envelopeSchema.extend({
  thesisId: z.string(),
  caseId: z.string(),
  version: z.number().int(),
  status: z.enum(["draft", "approved", "superseded", "archived"]),
  summary: z.string(),
  ownerUserId: z.string(),
  approvedByUserId: z.string(),
  approvedAt: z.string(),
  validFrom: z.string(),
  recordedAt: z.string(),
  pillars: z.array(pillarSchema),
  forecasts: z.array(forecastSchema),
  catalysts: z.array(catalystSchema),
  risks: z.array(riskSchema),
  openQuestions: z.array(openQuestionSchema),
  originKind: originKindSchema.optional(),
  authorshipLabel: z.string().optional(),
  derivedFromSourceRefs: z.array(z.string()).optional(),
});

export const domainEventSchema = envelopeSchema.extend({
  domainEventId: z.string(),
  tenantId: z.string(),
  entityId: z.string(),
  eventType: z.string(),
  title: z.string(),
  occurredAt: z.string(),
  publishedAt: z.string(),
  observedAt: z.string(),
  sourceRefs: z.array(z.string()),
  clusterId: z.string(),
  status: z.enum(["queued", "ready", "processed", "ignored"]),
});

export const numericValueSchema = z.object({
  label: z.string(),
  value: z.number(),
  unit: z.string(),
  currency: z.string().optional(),
  period: z.string().optional(),
  basis: z.string(),
  sourceExcerptId: z.string(),
});

export const sourceExcerptSchema = z.object({
  excerptId: z.string(),
  sourceId: z.string(),
  locator: z.object({
    section: z.string().optional(),
    paragraph: z.number().optional(),
    timestampSeconds: z.number().optional(),
    cellRange: z.string().optional(),
    page: z.number().optional(),
  }),
  text: z.string(),
  numericValues: z.array(numericValueSchema).optional(),
  classification: classificationSchema,
  contentHash: z.string(),
});

export const sourceDocumentSchema = z.object({
  sourceId: z.string(),
  tenantId: z.string(),
  title: z.string(),
  sourceType: z.string(),
  issuerEntityId: z.string(),
  uri: z.string(),
  publishedAt: z.string().optional(),
  observedAt: z.string(),
  classification: classificationSchema,
  contentHash: z.string(),
  version: z.number().int(),
  accessPolicyId: z.string(),
  status: z.enum(["available", "unavailable", "superseded"]),
  originKind: originKindSchema.optional(),
  publisherKind: publisherKindSchema.optional(),
  publisherName: z.string().optional(),
  canonicalUri: z.string().url().optional(),
  retrievedAt: z.string().optional(),
  rightsNote: z.string().optional(),
});

export const sourceBundleSchema = envelopeSchema.extend({
  sourceDocument: sourceDocumentSchema,
  excerpts: z.array(sourceExcerptSchema),
});

export const fundContextRoleSchema = z.enum([
  "external_evidence",
  "institution_policy",
  "portfolio_position",
  "internal_working_context",
  "internal_approved_state",
  "local_reference",
]);

export const fundContextConnectorSchema = z.object({
  connectorId: z.string(),
  label: z.string(),
  connectorType: z.enum([
    "public_event_feed",
    "official_investor_relations",
    "regulatory_filing",
    "public_institution_repository",
    "browser_local_import",
    "customer_model_repository",
    "customer_research_repository",
    "canonical_state_store",
  ]),
  mode: z.enum(["fixture_simulated", "bundled_public_snapshot", "browser_local_import"]),
  accessMode: z.literal("read_only"),
  executionLocation: z.enum(["local_demo", "build_pipeline", "browser_local"]),
  persistence: z.enum(["none", "bundled", "browser_local"]),
  status: z.enum(["fixture_available", "snapshot_available", "local_available"]),
});

export const fundContextArtifactSchema = z.object({
  artifactId: z.string(),
  objectRef: z.string(),
  objectKind: z.enum(["source_document", "thesis_snapshot"]),
  title: z.string(),
  contextRole: fundContextRoleSchema,
  connectorId: z.string(),
  classification: classificationSchema,
  dataOwner: z.enum(["external_publisher", "customer", "user"]),
  accessPolicyId: z.string(),
  allowedRoles: z.array(z.enum(["analyst", "pm"])).min(1),
  policyInheritance: z.literal("source"),
  asOf: z.string(),
  observedAt: z.string(),
  version: z.number().int().positive(),
  contentHash: z.string(),
  externalModelAccess: z.enum(["not_used", "blocked"]),
  allowedExecution: z.enum(["fixture_only", "browser_only"]),
  externalTransfer: z.literal(false),
  lifecycleStage: z.enum(["normalized_fixture", "normalized_snapshot", "local_attached"]),
  deletionPropagation: z.enum(["simulated", "local_reset", "not_applicable"]),
  graphProjection: z.literal("derived_only"),
  derivedObjectRefs: z.array(z.string()),
  originKind: originKindSchema.optional(),
  publisherKind: publisherKindSchema.optional(),
  publisherName: z.string().optional(),
  authorshipLabel: z.string().optional(),
  canonicalUri: z.string().url().optional(),
  retrievedAt: z.string().optional(),
  rightsNote: z.string().optional(),
  inputUsage: inputUsageStatusSchema.optional(),
  inputUsageReason: z.string().optional(),
  defaultSelected: z.boolean().optional(),
  defaultScope: z.enum(["pre_event", "event", "post_event"]).optional(),
  nonEndorsementNotice: z.string().optional(),
});

export const fundContextManifestSchema = envelopeSchema.extend({
  manifestId: z.string(),
  tenantId: z.string(),
  caseId: z.string(),
  generatedAt: z.string(),
  connectors: z.array(fundContextConnectorSchema).min(1),
  artifacts: z.array(fundContextArtifactSchema).min(1),
  eventCutoff: z.string().optional(),
});

export const patchOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), path: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("replace"), path: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("remove"), path: z.string() }),
]);

export const proposalSchema = z.object({
  proposalId: z.string(),
  tenantId: z.string(),
  caseId: z.string(),
  runId: z.string(),
  fromThesisVersion: z.number().int(),
  deltaType: z.string(),
  targetObjectType: z.string(),
  targetObjectId: z.string().optional(),
  headline: z.string(),
  whatChanged: z.string(),
  againstOurView: z.string(),
  whyItMatters: z.string(),
  uncertainties: z.array(z.string()),
  recommendedFollowUp: z.string(),
  evidenceRefs: z.array(z.string()).min(1),
  findingRefs: z.array(z.string()),
  confidence: confidenceSchema,
  materiality: materialitySchema,
  requiredReviewerRole: reviewerRoleSchema,
  proposedPatch: z.array(patchOperationSchema).min(1),
  status: z.enum(["proposed", "under_review", "approved", "rejected", "superseded"]),
  createdAt: z.string(),
});

export const proposalFileSchema = envelopeSchema.extend({
  proposals: z.array(proposalSchema),
});

export const modelRouteSchema = z.object({
  provider: z.string(),
  model: z.string(),
  endpointOwner: z.string(),
  retentionPolicy: z.string(),
  trainingUse: z.string(),
});

export const degradedReasonSchema = z.object({
  code: z.string(),
  message: z.string(),
  affectedObjectRefs: z.array(z.string()),
  recoverable: z.boolean(),
});

export const workflowRunSchema = z.object({
  runId: z.string(),
  tenantId: z.string(),
  caseId: z.string(),
  domainEventId: z.string(),
  workflowId: z.string(),
  workflowVersion: z.string(),
  status: z.enum(["queued", "running", "completed", "degraded", "failed"]),
  mode: z.enum(["fixture", "live", "hybrid"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  modelRoutes: z.array(modelRouteSchema),
  skillVersions: z.record(z.string(), z.string()),
  sourceRefs: z.array(z.string()),
  degradedReasons: z.array(degradedReasonSchema),
  outputProposalIds: z.array(z.string()),
  contextSetHash: z.string().optional(),
  contextUsage: z
    .array(
      z.object({
        artifactId: z.string(),
        status: inputUsageStatusSchema,
        reason: z.string(),
        originKind: originKindSchema,
      }),
    )
    .optional(),
});

export const runEventSchema = z.object({
  runEventId: z.string(),
  runId: z.string(),
  eventType: z.enum([
    "run_created",
    "source_loaded",
    "source_unavailable",
    "planner_completed",
    "task_assigned",
    "agent_started",
    "finding_created",
    "validation_passed",
    "validation_failed",
    "proposal_created",
    "review_required",
    "degraded_mode_entered",
    "agent_failed",
    "run_completed",
    "run_failed",
  ]),
  occurredAt: z.string(),
  actorType: z.enum(["system", "agent", "user"]),
  actorId: z.string(),
  publicMessage: z.string(),
  objectRefs: z.array(z.string()),
});

export const runBundleSchema = envelopeSchema.extend({
  workflowRun: workflowRunSchema,
  events: z.array(runEventSchema),
});

export const privacyReceiptSchema = envelopeSchema.extend({
  receiptId: z.string(),
  runId: z.string(),
  workflowVersion: z.string(),
  classification: classificationSchema,
  executionLocation: z.string(),
  modelRoutes: z.array(modelRouteSchema),
  rawContentSentToDelphiCloud: z.boolean(),
  externalWebAccess: z.boolean(),
  toolNames: z.array(z.string()),
  canonicalWritesProposed: z.number().int(),
  canonicalWritesApproved: z.number().int(),
  supportAccess: z.string(),
  generatedAt: z.string(),
  originCounts: z.partialRecord(originKindSchema, z.number().int().nonnegative()).optional(),
  localContextCount: z.number().int().nonnegative().optional(),
});

export const ledgerTransitionSchema = envelopeSchema.extend({
  transitionId: z.string(),
  tenantId: z.string(),
  caseId: z.string(),
  proposalIds: z.array(z.string()),
  reviewIds: z.array(z.string()),
  runId: z.string(),
  transitionType: z.string(),
  fromVersion: z.number().int(),
  toVersion: z.number().int(),
  sourceEventIds: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  requestedBy: z.enum(["agent", "user", "system"]),
  approvedByUserId: z.string(),
  approvedAt: z.string(),
  workflowVersion: z.string(),
  skillVersions: z.record(z.string(), z.string()),
  modelRoutes: z.array(modelRouteSchema),
  reversible: z.boolean(),
  status: z.enum(["applied", "rolled_back", "superseded"]),
  beforeSnapshotHash: z.string(),
  afterSnapshotHash: z.string(),
  contextSetHash: z.string().optional(),
  evidenceOrigins: z.array(originKindSchema).optional(),
});
