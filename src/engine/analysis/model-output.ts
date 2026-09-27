/**
 * The contract between the model and Delphi.
 *
 * This is deliberately narrower than `ThesisDeltaProposal`: the model never
 * chooses IDs, tenants, versions, reviewer roles, or timestamps. Those are
 * assigned deterministically by the engine, and everything the model does
 * produce is re-checked by validators before a human sees it.
 */
import { z } from "zod";

export const modelEvidenceSchema = z.object({
  excerptId: z.string().describe("Excerpt ID exactly as given, e.g. S1-E004"),
  quote: z.string().describe("Verbatim substring of that excerpt supporting the claim"),
});

export const modelPatchOpSchema = z.object({
  op: z.enum(["replace", "add"]),
  path: z.string().describe("Allowlisted semantic path, e.g. /pillars/<pillarId>/teamConviction"),
  valueJson: z.string().describe('JSON-encoded value, e.g. "\\"high\\"" or "36.5" or an object for add'),
});

export const modelProposalSchema = z.object({
  headline: z.string(),
  deltaType: z.enum([
    "thesis_pillar_update",
    "forecast_update",
    "forecast_review",
    "risk_update",
    "open_question_create",
  ]),
  targetObjectType: z.enum(["thesis_pillar", "forecast", "risk", "open_question"]),
  targetObjectId: z.string().describe("Existing thesis object ID, or empty string when creating a new open question"),
  whatChanged: z.string(),
  againstOurView: z.string(),
  whyItMatters: z.string(),
  uncertainties: z.array(z.string()),
  recommendedFollowUp: z.string(),
  evidence: z.array(modelEvidenceSchema),
  confidence: z.enum(["low", "medium", "high"]),
  materiality: z.enum(["low", "medium", "high", "critical"]),
  patch: z.array(modelPatchOpSchema),
});

export const modelCoverageGapSchema = z.object({
  objectId: z.string(),
  reason: z.string(),
});

export const modelAnalysisSchema = z.object({
  eventSummary: z.string().describe("Two to four sentences: what the event says, in the team's terms"),
  proposals: z.array(modelProposalSchema),
  coverageGaps: z.array(modelCoverageGapSchema).describe(
    "Thesis objects the provided sources cannot resolve (e.g. needs the call transcript)",
  ),
});

export type ModelEvidence = z.infer<typeof modelEvidenceSchema>;
export type ModelProposal = z.infer<typeof modelProposalSchema>;
export type ModelAnalysis = z.infer<typeof modelAnalysisSchema>;
