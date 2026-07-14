/**
 * State Transition Gateway.
 *
 * The only module allowed to change approved state. Review actions are
 * recorded here; approved changes are applied here; rollback and reset are
 * implemented here. Everything is a pure function over `DomainState` so the
 * rules are testable without a UI.
 *
 * Invariants (build brief §7):
 *  1. reject / escalate / defer never modify the approved thesis;
 *  2. accept applies a validated patch only when role and policy allow;
 *  3. edit creates a human-authored patch, validates it, then applies it;
 *  4. high materiality requires PM;
 *  5. a degraded high-impact proposal cannot be accepted by an Analyst;
 *  6. a transition must reference the current fromVersion;
 *  7. duplicate approval is idempotent;
 *  8. a successful transition increments the version exactly once;
 *  9. every review action appears in history;
 * 10. reset is deterministic;
 * 11. blocked evidence fails closed.
 */
import type {
  DemoUser,
  DomainState,
  ISODateTime,
  PatchOperation,
  Review,
  ReviewActionType,
  StateTransition,
  ThesisDeltaProposal,
  ThesisSnapshot,
  ValidationMessage,
  ValidationResult,
  WorkflowRunBundle,
} from "./types";
import { applySemanticPatch, validateSemanticPatch } from "./patch";
import { canApplyProposal, authorizationMessage, type ApprovalContext } from "./policies";
import { contentHash } from "./hash";
import { hasSemanticThesisChange } from "./semantic-thesis";
import { validateCurrentVersion, validateIdempotency } from "./validators";

const gatewayError = (code: string, message: string): ValidationMessage => ({
  validator: "policy",
  severity: "error",
  code,
  message,
});

// ---------------------------------------------------------------------------
// Review recording
// ---------------------------------------------------------------------------

export interface ReviewInput {
  proposal: ThesisDeltaProposal;
  action: ReviewActionType;
  actor: DemoUser;
  context: ApprovalContext;
  now: ISODateTime;
  editedPatch?: PatchOperation[];
  reasonCode?: string;
  note?: string;
  escalatedToUserId?: string;
  deferredUntil?: ISODateTime;
}

/** Latest review per proposal decides its current review state. */
export function latestReviewFor(state: DomainState, proposalId: string): Review | undefined {
  for (let i = state.reviews.length - 1; i >= 0; i--) {
    if (state.reviews[i]!.proposalId === proposalId) return state.reviews[i];
  }
  return undefined;
}

export function appliedProposalIds(state: DomainState): Set<string> {
  const ids = new Set<string>();
  for (const t of state.transitions) {
    if (t.status === "applied") for (const id of t.proposalIds) ids.add(id);
  }
  return ids;
}

/**
 * Record a review action. Never mutates the approved thesis — application
 * happens separately in `applyApprovedChanges`.
 */
export function recordReview(
  state: DomainState,
  input: ReviewInput,
): ValidationResult<{ state: DomainState; review?: Review }> {
  const { proposal, action, actor, context, now } = input;

  // Rule 7 — a proposal already applied is closed; further approval is a no-op.
  const idempotency = validateIdempotency(proposal, state.transitions);
  if (idempotency.length > 0) {
    return { status: "accepted_with_warnings", value: { state }, messages: idempotency };
  }

  const messages: ValidationMessage[] = [];

  if (action === "accept" || action === "edit") {
    // Rules 2–5, 11 — authorization and degraded policy, fail closed.
    const decision = canApplyProposal(actor, proposal, context);
    if (!decision.allowed) {
      return { status: "rejected", messages: [authorizationMessage(decision)] };
    }
    // Rule 6 — proposals generated against a stale version cannot be approved.
    const version = validateCurrentVersion(proposal, state.currentThesis);
    if (version.length > 0) {
      return { status: "rejected", messages: version };
    }
    // Validate the patch that would eventually be applied.
    const patch = action === "edit" ? input.editedPatch : proposal.proposedPatch;
    if (action === "edit" && (!patch || patch.length === 0)) {
      return { status: "rejected", messages: [gatewayError("edit_empty", "An edit must contain at least one change.")] };
    }
    const patchResult = validateSemanticPatch(state.currentThesis, patch!);
    if (patchResult.status === "rejected") {
      return { status: "rejected", messages: patchResult.messages };
    }
  }

  if (action === "reject" && !input.reasonCode) {
    return { status: "rejected", messages: [gatewayError("reject_reason_required", "Select or enter a rejection reason.")] };
  }
  if (action === "escalate" && !input.escalatedToUserId) {
    return { status: "rejected", messages: [gatewayError("escalate_target_required", "Choose who this proposal escalates to.")] };
  }
  if (action === "defer" && !input.deferredUntil) {
    return { status: "rejected", messages: [gatewayError("defer_date_required", "Choose a defer-until date.")] };
  }

  const review: Review = {
    reviewId: `review_${String(state.reviews.length + 1).padStart(3, "0")}_${proposal.proposalId}_${action}`,
    proposalId: proposal.proposalId,
    reviewerUserId: actor.userId,
    reviewerRole: actor.role,
    action,
    status:
      action === "accept" || action === "edit"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : action === "escalate"
            ? "escalated"
            : "deferred",
    editedPatch: action === "edit" ? input.editedPatch : undefined,
    reasonCode: input.reasonCode,
    note: input.note,
    escalatedToUserId: input.escalatedToUserId,
    deferredUntil: input.deferredUntil,
    reviewedAt: now,
  };

  // Rules 1 and 9 — the review enters history; the thesis is untouched.
  return {
    status: "accepted",
    value: { state: { ...state, reviews: [...state.reviews, review] }, review },
    messages,
  };
}

// ---------------------------------------------------------------------------
// Applying approved changes → StateTransition
// ---------------------------------------------------------------------------

export interface ApplyInput {
  actor: DemoUser;
  now: ISODateTime;
  /** The run whose proposals are being applied (provenance metadata). */
  runBundle: WorkflowRunBundle;
  proposalsById: ReadonlyMap<string, ThesisDeltaProposal>;
  tenantId: string;
  /** When set, only these proposals are applied (one review surface at a time). */
  limitToProposalIds?: ReadonlySet<string>;
}

export interface PendingApproval {
  review: Review;
  proposal: ThesisDeltaProposal;
  patch: PatchOperation[];
}

/** Approved-but-not-yet-applied reviews, in review order. */
export function pendingApprovals(
  state: DomainState,
  proposalsById: ReadonlyMap<string, ThesisDeltaProposal>,
): PendingApproval[] {
  const applied = appliedProposalIds(state);
  const seen = new Set<string>();
  const pending: PendingApproval[] = [];
  // Walk latest-first so the newest review per proposal wins.
  for (let i = state.reviews.length - 1; i >= 0; i--) {
    const review = state.reviews[i]!;
    if (seen.has(review.proposalId)) continue;
    seen.add(review.proposalId);
    if (review.status !== "approved" || applied.has(review.proposalId)) continue;
    const proposal = proposalsById.get(review.proposalId);
    if (!proposal) continue;
    pending.push({
      review,
      proposal,
      patch: review.action === "edit" && review.editedPatch ? review.editedPatch : proposal.proposedPatch,
    });
  }
  return pending.reverse();
}

/**
 * Apply every approved, un-applied review as one composite state transition.
 * The version increments exactly once regardless of how many proposals are in
 * the batch. Rejected / escalated / deferred proposals are excluded.
 */
export function applyApprovedChanges(
  state: DomainState,
  input: ApplyInput,
): ValidationResult<{ state: DomainState; transition: StateTransition }> {
  const pending = pendingApprovals(state, input.proposalsById).filter(
    (p) => !input.limitToProposalIds || input.limitToProposalIds.has(p.proposal.proposalId),
  );
  if (pending.length === 0) {
    return {
      status: "rejected",
      messages: [gatewayError("nothing_to_apply", "No approved changes are waiting to be applied.")],
    };
  }

  const fromThesis = state.currentThesis;

  // Rule 6 — every proposal must reference the currently approved version.
  for (const { proposal } of pending) {
    const version = validateCurrentVersion(proposal, fromThesis);
    if (version.length > 0) return { status: "rejected", messages: version };
  }

  // Apply patches sequentially; any invalid patch fails the batch closed.
  let nextThesis: ThesisSnapshot = fromThesis;
  for (const { patch, proposal } of pending) {
    const result = applySemanticPatch(nextThesis, patch);
    if (result.status === "rejected" || !result.value) {
      return {
        status: "rejected",
        messages: [
          gatewayError("batch_failed_closed", `Patch for "${proposal.proposalId}" failed validation; no state was changed.`),
          ...result.messages,
        ],
      };
    }
    nextThesis = result.value;
  }

  // A version is evidence of a governed state change, not merely new approval
  // metadata. This defense-in-depth guard also catches multi-patch batches
  // whose valid operations cancel each other out.
  if (!hasSemanticThesisChange(fromThesis, nextThesis)) {
    return {
      status: "rejected",
      messages: [
        {
          validator: "semantic_patch",
          severity: "error",
          code: "transition_noop",
          message: "The approved batch has no net effect on governed thesis state.",
          objectRefs: pending.map((item) => item.proposal.proposalId),
        },
      ],
    };
  }

  // Rule 8 — exactly one version increment for the whole batch.
  const beforeHash = contentHash(fromThesis);
  nextThesis = {
    ...nextThesis,
    version: fromThesis.version + 1,
    status: "approved",
    approvedByUserId: input.actor.userId,
    approvedAt: input.now,
    validFrom: input.now,
    recordedAt: input.now,
  };
  const afterHash = contentHash(nextThesis);

  const transition: StateTransition = {
    fixtureVersion: fromThesis.fixtureVersion,
    schemaVersion: fromThesis.schemaVersion,
    synthetic: true,
    transitionId: `transition_arct_${String(state.transitions.length + 1).padStart(3, "0")}`,
    tenantId: input.tenantId,
    caseId: fromThesis.caseId,
    proposalIds: pending.map((p) => p.proposal.proposalId),
    reviewIds: pending.map((p) => p.review.reviewId),
    runId: input.runBundle.workflowRun.runId,
    transitionType: pending.length > 1 ? "composite_review_batch" : pending[0]!.proposal.deltaType,
    fromVersion: fromThesis.version,
    toVersion: nextThesis.version,
    sourceEventIds: [input.runBundle.workflowRun.domainEventId],
    evidenceRefs: [...new Set(pending.flatMap((p) => p.proposal.evidenceRefs))],
    requestedBy: "agent",
    approvedByUserId: input.actor.userId,
    approvedAt: input.now,
    workflowVersion: input.runBundle.workflowRun.workflowVersion,
    skillVersions: input.runBundle.workflowRun.skillVersions,
    modelRoutes: input.runBundle.workflowRun.modelRoutes,
    reversible: true,
    status: "applied",
    beforeSnapshotHash: beforeHash,
    afterSnapshotHash: afterHash,
  };

  const supersededThesis: ThesisSnapshot = { ...fromThesis, status: "superseded" };

  return {
    status: "accepted",
    value: {
      state: {
        ...state,
        currentThesis: nextThesis,
        thesisHistory: [...state.thesisHistory, supersededThesis],
        transitions: [...state.transitions, transition],
      },
      transition,
    },
    messages: [],
  };
}

// ---------------------------------------------------------------------------
// Rollback (safe demo affordance)
// ---------------------------------------------------------------------------

export function rollbackTransition(
  state: DomainState,
  transitionId: string,
): ValidationResult<{ state: DomainState }> {
  const transition = state.transitions.find((t) => t.transitionId === transitionId);
  if (!transition) {
    return { status: "rejected", messages: [gatewayError("transition_unknown", `Transition "${transitionId}" does not exist.`)] };
  }
  if (transition.status !== "applied") {
    return { status: "rejected", messages: [gatewayError("not_applied", "Only an applied transition can be rolled back.")] };
  }
  if (transition.toVersion !== state.currentThesis.version) {
    return {
      status: "rejected",
      messages: [gatewayError("not_latest", "Only the most recent transition can be rolled back in the demo.")],
    };
  }
  const previous = state.thesisHistory[state.thesisHistory.length - 1];
  if (!previous || previous.version !== transition.fromVersion) {
    return { status: "rejected", messages: [gatewayError("history_missing", "The before-state snapshot is unavailable.")] };
  }

  return {
    status: "accepted",
    value: {
      state: {
        ...state,
        currentThesis: { ...previous, status: "approved" },
        thesisHistory: state.thesisHistory.slice(0, -1),
        transitions: state.transitions.map((t) =>
          t.transitionId === transitionId ? { ...t, status: "rolled_back" as const } : t,
        ),
      },
    },
    messages: [],
  };
}

// ---------------------------------------------------------------------------
// Deterministic reset
// ---------------------------------------------------------------------------

/** Rule 10 — reset always reproduces the pristine fixture state. */
export function initialDomainState(thesisV12: ThesisSnapshot): DomainState {
  return {
    currentThesis: structuredClone(thesisV12),
    thesisHistory: [],
    reviews: [],
    transitions: [],
  };
}
