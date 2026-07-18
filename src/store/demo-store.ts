"use client";

/**
 * Demo store — the single UI-facing state container.
 *
 * All canonical mutations delegate to the domain transition gateway; the
 * store never edits the thesis, reviews, or transitions directly. UI-only
 * state (role, replay playback, degraded simulation) lives alongside but is
 * clearly separated from `domain`.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  DemoRole,
  DomainState,
  PatchOperation,
  RunEvent,
  ThesisDeltaProposal,
  ValidationResult,
  Review,
  StateTransition,
  CaseContextBinding,
  LocalContextArtifact,
} from "@/domain/types";
import {
  initialDomainState,
  recordReview,
  applyApprovedChanges,
  rollbackTransition,
  latestReviewFor,
  appliedProposalIds,
  pendingApprovals,
} from "@/domain/transitions";
import { DEMO_USERS } from "@/domain/policies";
import {
  thesisV12,
  defaultThesis,
  allProposals,
  getRunBundle,
  getCase,
  resolveExcerpt,
  successRun,
  degradedRun,
  defaultSuccessRun,
  defaultCase,
  defaultContextManifest,
} from "@/fixtures/loader";
import { defaultContextBindings } from "@/context/fund-context";

export type PlaybackStatus = "idle" | "playing" | "completed";

export interface RunPlayback {
  status: PlaybackStatus;
  /** Number of run events currently visible in the observatory. */
  visibleEvents: number;
}

const proposalsById = new Map(allProposals.map((p) => [p.proposalId, p]));

export interface ReviewCommand {
  proposalId: string;
  action: "accept" | "edit" | "reject" | "escalate" | "defer";
  editedPatch?: PatchOperation[];
  reasonCode?: string;
  note?: string;
  escalatedToUserId?: string;
  deferredUntil?: string;
}

interface DemoStoreState {
  /** Canonical state for the default real-public MSFT scenario. */
  domain: DomainState;
  /** Canonical state for the synthetic degraded ARCT fallback scenario. */
  arctDomain: DomainState;
  contextBindings: CaseContextBinding[];
  localContextArtifacts: LocalContextArtifact[];
  role: DemoRole;
  /** True once the degraded source simulation has been enabled. */
  transcriptUnavailable: boolean;
  runPlayback: Record<string, RunPlayback>;
  hydrated: boolean;

  setHydrated: () => void;
  setRole: (role: DemoRole) => void;
  setTranscriptUnavailable: (unavailable: boolean) => void;
  setPlayback: (runId: string, playback: RunPlayback) => void;
  addContextBinding: (artifactId: string, scope?: CaseContextBinding["scope"]) => void;
  removeContextBinding: (artifactId: string) => void;
  addLocalContext: (artifact: LocalContextArtifact, scope?: CaseContextBinding["scope"]) => void;
  removeLocalContext: (artifactId: string) => void;
  submitReview: (command: ReviewCommand) => ValidationResult<{ review?: Review }>;
  applyApproved: (runId: string, limitToProposalIds?: ReadonlySet<string>) => ValidationResult<{ transition: StateTransition }>;
  rollback: (transitionId: string) => ValidationResult<unknown>;
  resetDemo: () => void;
}

/** Source IDs unavailable under the current simulation. */
export function unavailableSourceIds(transcriptUnavailable: boolean): ReadonlySet<string> {
  return transcriptUnavailable ? new Set(["source_transcript_q2"]) : new Set();
}

/** Fail-closed check: does this proposal cite evidence from an unavailable source? */
export function isProposalBlocked(proposal: ThesisDeltaProposal, transcriptUnavailable: boolean): boolean {
  if (!transcriptUnavailable) return false;
  const unavailable = unavailableSourceIds(transcriptUnavailable);
  return proposal.evidenceRefs.some((ref) => {
    const resolved = resolveExcerpt(ref);
    return resolved ? unavailable.has(resolved.document.sourceId) : true;
  });
}

const initialPlayback: Record<string, RunPlayback> = {
  [defaultSuccessRun.workflowRun.runId]: { status: "idle", visibleEvents: 0 },
  [successRun.workflowRun.runId]: { status: "idle", visibleEvents: 0 },
  [degradedRun.workflowRun.runId]: { status: "idle", visibleEvents: 0 },
};

export const useDemoStore = create<DemoStoreState>()(
  persist(
    (set, get) => ({
      domain: initialDomainState(defaultThesis),
      arctDomain: initialDomainState(thesisV12),
      contextBindings: defaultContextBindings(defaultContextManifest),
      localContextArtifacts: [],
      role: "analyst",
      transcriptUnavailable: false,
      runPlayback: initialPlayback,
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      setRole: (role) => set({ role }),

      setTranscriptUnavailable: (unavailable) => set({ transcriptUnavailable: unavailable }),

      setPlayback: (runId, playback) =>
        set((s) => ({ runPlayback: { ...s.runPlayback, [runId]: playback } })),

      addContextBinding: (artifactId, scope) =>
        set((s) => {
          if (s.contextBindings.some((binding) => binding.artifactId === artifactId)) return s;
          const artifact = defaultContextManifest.artifacts.find((item) => item.artifactId === artifactId);
          if (!artifact) return s;
          return {
            contextBindings: [
              ...s.contextBindings,
              {
                bindingId: `binding_user_${artifactId}`,
                caseId: defaultCase.caseId,
                artifactId,
                contextRole: artifact.contextRole,
                scope: scope ?? artifact.defaultScope ?? "pre_event",
                addedAt: new Date().toISOString(),
                source: "curated_user_added",
              },
            ],
          };
        }),

      removeContextBinding: (artifactId) =>
        set((s) => ({ contextBindings: s.contextBindings.filter((binding) => binding.artifactId !== artifactId) })),

      addLocalContext: (artifact, scope = "pre_event") =>
        set((s) => ({
          localContextArtifacts: [
            ...s.localContextArtifacts.filter((item) => item.artifactId !== artifact.artifactId),
            artifact,
          ],
          contextBindings: [
            ...s.contextBindings.filter((binding) => binding.artifactId !== artifact.artifactId),
            {
              bindingId: `binding_${artifact.artifactId}`,
              caseId: defaultCase.caseId,
              artifactId: artifact.artifactId,
              contextRole: artifact.contextRole,
              scope,
              addedAt: artifact.createdAt,
              source: "local_import",
            },
          ],
        })),

      removeLocalContext: (artifactId) =>
        set((s) => ({
          localContextArtifacts: s.localContextArtifacts.filter((item) => item.artifactId !== artifactId),
          contextBindings: s.contextBindings.filter((binding) => binding.artifactId !== artifactId),
        })),

      submitReview: (command) => {
        const s = get();
        const proposal = proposalsById.get(command.proposalId);
        if (!proposal) {
          return {
            status: "rejected",
            messages: [
              { validator: "policy", severity: "error", code: "proposal_unknown", message: "Unknown proposal." },
            ],
          };
        }
        const runBundle = getRunBundle(proposal.runId);
        const isDefaultCase = proposal.caseId === defaultCase.caseId;
        const caseDomain = isDefaultCase ? s.domain : s.arctDomain;
        const result = recordReview(caseDomain, {
          proposal,
          action: command.action,
          actor: DEMO_USERS[s.role],
          context: {
            runDegraded: runBundle?.workflowRun.status === "degraded" || s.transcriptUnavailable,
            blockedByPolicy: isProposalBlocked(proposal, s.transcriptUnavailable),
          },
          now: new Date().toISOString(),
          editedPatch: command.editedPatch,
          reasonCode: command.reasonCode,
          note: command.note,
          escalatedToUserId: command.escalatedToUserId,
          deferredUntil: command.deferredUntil,
        });
        if (result.status !== "rejected" && result.value) {
          set(isDefaultCase ? { domain: result.value.state } : { arctDomain: result.value.state });
        }
        return { status: result.status, value: { review: result.value?.review }, messages: result.messages };
      },

      applyApproved: (runId, limitToProposalIds) => {
        const s = get();
        const runBundle = getRunBundle(runId) ?? defaultSuccessRun;
        const investmentCase = getCase(runBundle.workflowRun.caseId) ?? defaultCase;
        const isDefaultCase = investmentCase.caseId === defaultCase.caseId;
        const caseDomain = isDefaultCase ? s.domain : s.arctDomain;
        const result = applyApprovedChanges(caseDomain, {
          actor: DEMO_USERS[s.role],
          now: new Date().toISOString(),
          runBundle,
          proposalsById,
          tenantId: investmentCase.tenantId,
          limitToProposalIds,
        });
        if (result.status !== "rejected" && result.value) {
          set(isDefaultCase ? { domain: result.value.state } : { arctDomain: result.value.state });
          return { status: result.status, value: { transition: result.value.transition }, messages: result.messages };
        }
        return { status: "rejected", messages: result.messages };
      },

      rollback: (transitionId) => {
        const s = get();
        const isDefaultCase = s.domain.transitions.some((transition) => transition.transitionId === transitionId);
        const result = rollbackTransition(isDefaultCase ? s.domain : s.arctDomain, transitionId);
        if (result.status !== "rejected" && result.value) {
          set(isDefaultCase ? { domain: result.value.state } : { arctDomain: result.value.state });
        }
        return result;
      },

      resetDemo: () =>
        set({
          domain: initialDomainState(defaultThesis),
          arctDomain: initialDomainState(thesisV12),
          contextBindings: defaultContextBindings(defaultContextManifest),
          localContextArtifacts: [],
          role: "analyst",
          transcriptUnavailable: false,
          runPlayback: { ...initialPlayback },
        }),
    }),
    {
      // Baseline fixture semantics changed in the hardened workflow. A new
      // versioned key prevents stale v12 state from reintroducing the old
      // metadata-only transition after hydration.
      name: "delphi-demo-state-v0.3.0",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        domain: s.domain,
        arctDomain: s.arctDomain,
        contextBindings: s.contextBindings,
        localContextArtifacts: s.localContextArtifacts,
        role: s.role,
        transcriptUnavailable: s.transcriptUnavailable,
        runPlayback: s.runPlayback,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useCurrentUser() {
  return useDemoStore((s) => DEMO_USERS[s.role]);
}

export type ProposalReviewState =
  | "needs_review"
  | "accepted"
  | "edited"
  | "rejected"
  | "escalated"
  | "deferred"
  | "applied"
  | "blocked";

export function proposalReviewState(
  domain: DomainState,
  proposal: ThesisDeltaProposal,
  transcriptUnavailable: boolean,
): ProposalReviewState {
  if (appliedProposalIds(domain).has(proposal.proposalId)) return "applied";
  const review = latestReviewFor(domain, proposal.proposalId);
  if (review) {
    if (review.action === "accept") return "accepted";
    if (review.action === "edit") return "edited";
    if (review.action === "reject") return "rejected";
    if (review.action === "escalate") return "escalated";
    if (review.action === "defer") return "deferred";
  }
  if (isProposalBlocked(proposal, transcriptUnavailable)) return "blocked";
  return "needs_review";
}

export { latestReviewFor, appliedProposalIds, pendingApprovals, proposalsById };
