/**
 * Privacy Receipt generation.
 *
 * The receipt is generated from actual demo state so it always reflects real
 * prototype behavior: fixture adapter, no external web access, no raw content
 * sent to Delphi Cloud, and the true proposed/approved write counts.
 */
import type { DomainState, PrivacyReceipt, ThesisDeltaProposal, WorkflowRunBundle } from "@/domain/types";
import { appliedProposalIds } from "@/domain/transitions";

export const FIXTURE_TOOL_NAMES = ["fixtures.read", "thesis.read", "forecast.compare", "validator.run"];

export function generatePrivacyReceipt(
  runBundle: WorkflowRunBundle,
  runProposals: ThesisDeltaProposal[],
  state: DomainState,
  now: string,
): PrivacyReceipt {
  const applied = appliedProposalIds(state);
  const approvedCount = runProposals.filter((p) => applied.has(p.proposalId)).length;
  const run = runBundle.workflowRun;

  return {
    fixtureVersion: runBundle.fixtureVersion,
    schemaVersion: runBundle.schemaVersion,
    synthetic: true,
    receiptId: `receipt_${run.runId}`,
    runId: run.runId,
    workflowVersion: run.workflowVersion,
    classification: "synthetic",
    executionLocation: "Local demo runtime (browser)",
    modelRoutes: run.modelRoutes,
    rawContentSentToDelphiCloud: false,
    externalWebAccess: false,
    toolNames: FIXTURE_TOOL_NAMES,
    canonicalWritesProposed: runProposals.length,
    canonicalWritesApproved: approvedCount,
    supportAccess: "none",
    generatedAt: now,
  };
}
