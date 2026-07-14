/**
 * Deterministic fixture loader.
 *
 * Every fixture passes its Zod schema at module load. If a fixture is invalid
 * the app fails loudly at startup instead of rendering fabricated state.
 */
import caseJson from "./data/case.arct.json";
import thesisV12Json from "./data/thesis.arct.v12.json";
import eventJson from "./data/event.arct.fy26q2.json";
import releaseJson from "./data/sources/earnings-release.json";
import transcriptJson from "./data/sources/transcript.json";
import teamForecastJson from "./data/sources/team-forecast.json";
import internalResearchMemoJson from "./data/sources/internal-research-memo.json";
import fundContextManifestJson from "./data/context/fund-context-manifest.json";
import successRunJson from "./data/runs/successful-run.json";
import degradedRunJson from "./data/runs/degraded-run.json";
import proposalsJson from "./data/proposals/thesis-deltas.json";
import degradedProposalsJson from "./data/proposals/degraded-thesis-deltas.json";
import expectedThesisV13Json from "./data/expected/thesis.arct.v13.json";
import expectedTransitionJson from "./data/expected/ledger-transition.json";
import expectedReceiptJson from "./data/expected/privacy-receipt.json";

import {
  investmentCaseSchema,
  thesisSnapshotSchema,
  domainEventSchema,
  sourceBundleSchema,
  fundContextManifestSchema,
  runBundleSchema,
  proposalFileSchema,
  ledgerTransitionSchema,
  privacyReceiptSchema,
} from "@/domain/schemas";
import type {
  InvestmentCase,
  ThesisSnapshot,
  DomainEvent,
  SourceBundle,
  WorkflowRunBundle,
  ThesisDeltaProposal,
  StateTransition,
  PrivacyReceipt,
  SourceExcerpt,
  SourceDocument,
  FundContextManifest,
} from "@/domain/types";
import { contentHash } from "@/domain/hash";
import { collectFundContextObjectRefs, validateFundContextManifest } from "@/context/fund-context";

function parse<T>(name: string, schema: { parse: (v: unknown) => unknown }, raw: unknown): T {
  try {
    return schema.parse(raw) as T;
  } catch (e) {
    throw new Error(`Fixture "${name}" failed schema validation: ${(e as Error).message}`);
  }
}

export const arctCase = parse<InvestmentCase>("case.arct", investmentCaseSchema, caseJson);
export const thesisV12 = parse<ThesisSnapshot>("thesis.arct.v12", thesisSnapshotSchema, thesisV12Json);
export const earningsEvent = parse<DomainEvent>("event.arct.fy26q2", domainEventSchema, eventJson);

export const releaseBundle = parse<SourceBundle>("sources/earnings-release", sourceBundleSchema, releaseJson);
export const transcriptBundle = parse<SourceBundle>("sources/transcript", sourceBundleSchema, transcriptJson);
export const teamForecastBundle = parse<SourceBundle>("sources/team-forecast", sourceBundleSchema, teamForecastJson);
export const internalResearchMemoBundle = parse<SourceBundle>(
  "sources/internal-research-memo",
  sourceBundleSchema,
  internalResearchMemoJson,
);
export const fundContextManifest = parse<FundContextManifest>(
  "context/fund-context-manifest",
  fundContextManifestSchema,
  fundContextManifestJson,
);

export const successRun = parse<WorkflowRunBundle>("runs/successful-run", runBundleSchema, successRunJson);
export const degradedRun = parse<WorkflowRunBundle>("runs/degraded-run", runBundleSchema, degradedRunJson);

export const successProposals = parse<{ proposals: ThesisDeltaProposal[] }>(
  "proposals/thesis-deltas",
  proposalFileSchema,
  proposalsJson,
).proposals;
export const degradedProposals = parse<{ proposals: ThesisDeltaProposal[] }>(
  "proposals/degraded-thesis-deltas",
  proposalFileSchema,
  degradedProposalsJson,
).proposals;

export const expectedThesisV13 = parse<ThesisSnapshot>(
  "expected/thesis.arct.v13",
  thesisSnapshotSchema,
  expectedThesisV13Json,
);
export const expectedTransition = parse<StateTransition>(
  "expected/ledger-transition",
  ledgerTransitionSchema,
  expectedTransitionJson,
);
export const expectedReceipt = parse<PrivacyReceipt>(
  "expected/privacy-receipt",
  privacyReceiptSchema,
  expectedReceiptJson,
);

export const sourceBundles: SourceBundle[] = [
  releaseBundle,
  transcriptBundle,
  teamForecastBundle,
  internalResearchMemoBundle,
];

/** Hash of the pristine v12 snapshot — reset must restore exactly this. */
export const initialThesisHash = contentHash(thesisV12);

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const excerptIndex = new Map<string, { excerpt: SourceExcerpt; document: SourceDocument }>();
for (const bundle of sourceBundles) {
  for (const excerpt of bundle.excerpts) {
    excerptIndex.set(excerpt.excerptId, { excerpt, document: bundle.sourceDocument });
  }
}

/**
 * Resolve an evidence reference. Excerpts referenced by approved-thesis
 * history (prior quarters) are intentionally not shipped in the demo fixture
 * set; they resolve to `undefined` and the UI must show them as unavailable
 * rather than reconstructing them.
 */
export function resolveExcerpt(excerptId: string) {
  return excerptIndex.get(excerptId);
}

export function getSourceDocument(sourceId: string): SourceDocument | undefined {
  return sourceBundles.find((b) => b.sourceDocument.sourceId === sourceId)?.sourceDocument;
}

export const allProposals: ThesisDeltaProposal[] = [...successProposals, ...degradedProposals];

export function getProposal(proposalId: string): ThesisDeltaProposal | undefined {
  return allProposals.find((p) => p.proposalId === proposalId);
}

export function proposalsForRun(runId: string): ThesisDeltaProposal[] {
  return allProposals.filter((p) => p.runId === runId);
}

export const runBundles: WorkflowRunBundle[] = [successRun, degradedRun];

const fundContextIssues = validateFundContextManifest({
  manifest: fundContextManifest,
  sources: sourceBundles,
  thesis: thesisV12,
  knownObjectRefs: collectFundContextObjectRefs({
    sources: sourceBundles,
    thesis: thesisV12,
    proposals: allProposals,
    runs: runBundles,
  }),
});
if (fundContextIssues.length > 0) {
  throw new Error(`Fund context manifest failed validation: ${JSON.stringify(fundContextIssues)}`);
}

export function getRunBundle(runId: string): WorkflowRunBundle | undefined {
  return runBundles.find((r) => r.workflowRun.runId === runId);
}

/**
 * Proposal IDs from the successful run that the degraded run's policy blocks
 * (their evidence depends on the unavailable transcript). Derived from the
 * degraded run's affected object refs.
 */
export const degradedBlockedProposalIds: string[] = (() => {
  const affected = new Set(degradedRun.workflowRun.degradedReasons.flatMap((r) => r.affectedObjectRefs));
  return successProposals
    .filter(
      (p) =>
        (p.targetObjectId && affected.has(p.targetObjectId)) ||
        p.proposedPatch.some((op) => {
          if (op.op === "add" && op.path.startsWith("/openQuestions")) {
            const v = op.value as { questionId?: string } | undefined;
            return v?.questionId ? affected.has(v.questionId) : false;
          }
          return [...affected].some((ref) => op.path.includes(ref));
        }),
    )
    .map((p) => p.proposalId);
})();
