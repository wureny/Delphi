/**
 * State Transition Gateway rules — build brief §7, one test per rule.
 */
import { describe, expect, it } from "vitest";
import {
  initialDomainState,
  recordReview,
  applyApprovedChanges,
  rollbackTransition,
  pendingApprovals,
  type ReviewInput,
} from "@/domain/transitions";
import { DEMO_USERS } from "@/domain/policies";
import { contentHash } from "@/domain/hash";
import {
  thesisV12,
  successRun,
  successProposals,
  degradedProposals,
  allProposals,
  initialThesisHash,
  expectedThesisV13,
  arctCase,
} from "@/fixtures/loader";
import type { DomainState, Review, ThesisDeltaProposal } from "@/domain/types";

const NOW = "2026-07-13T10:00:00Z";
const analyst = DEMO_USERS.analyst;
const pm = DEMO_USERS.pm;
const okContext = { runDegraded: false, blockedByPolicy: false };

const byId = new Map(allProposals.map((p) => [p.proposalId, p]));
const proposal = (id: string): ThesisDeltaProposal => {
  const p = byId.get(id);
  if (!p) throw new Error(`unknown proposal ${id}`);
  return p;
};

const enterprise = proposal("proposal_arct_enterprise_001"); // medium, analyst
const midmarket = proposal("proposal_arct_midmarket_002"); // high, pm required
const forecast = proposal("proposal_arct_forecast_003"); // medium, analyst
const question = proposal("proposal_arct_question_004"); // medium, analyst

function fresh(): DomainState {
  return initialDomainState(thesisV12);
}

function review(state: DomainState, input: Partial<ReviewInput> & Pick<ReviewInput, "proposal" | "action">) {
  return recordReview(state, {
    actor: analyst,
    context: okContext,
    now: NOW,
    ...input,
  });
}

describe("rule 1 — reject / escalate / defer never modify the approved thesis", () => {
  it.each([
    ["reject", { reasonCode: "not_material" }],
    ["escalate", { escalatedToUserId: pm.userId }],
    ["defer", { deferredUntil: "2026-08-01T00:00:00Z" }],
  ] as const)("%s leaves the thesis untouched", (action, extra) => {
    const before = fresh();
    const result = review(before, { proposal: midmarket, action, ...extra });
    expect(result.status).toBe("accepted");
    const after = result.value!.state;
    expect(contentHash(after.currentThesis)).toBe(initialThesisHash);
    expect(after.transitions).toHaveLength(0);
    expect(after.reviews).toHaveLength(1);
  });
});

describe("rules 2, 4, 5 — authorization", () => {
  it("an analyst cannot accept a high-materiality PM-required proposal", () => {
    const result = review(fresh(), { proposal: midmarket, action: "accept" });
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("requires_pm");
  });

  it("a PM can accept the high-materiality proposal", () => {
    const result = review(fresh(), { proposal: midmarket, action: "accept", actor: pm });
    expect(result.status).toBe("accepted");
    expect(result.value?.review?.status).toBe("approved");
  });

  it("an analyst can accept a medium-materiality proposal", () => {
    const result = review(fresh(), { proposal: enterprise, action: "accept" });
    expect(result.status).toBe("accepted");
  });

  it("a blocked (degraded-policy) proposal fails closed for every role", () => {
    const blockedCtx = { runDegraded: true, blockedByPolicy: true };
    for (const actor of [analyst, pm]) {
      const result = recordReview(fresh(), {
        proposal: midmarket,
        action: "accept",
        actor,
        context: blockedCtx,
        now: NOW,
      });
      expect(result.status).toBe("rejected");
      expect(result.messages[0]?.code).toBe("policy_blocked_evidence");
    }
  });

  it("a blocked proposal can still be escalated (no mutation)", () => {
    const result = recordReview(fresh(), {
      proposal: midmarket,
      action: "escalate",
      actor: analyst,
      context: { runDegraded: true, blockedByPolicy: true },
      escalatedToUserId: pm.userId,
      now: NOW,
    });
    expect(result.status).toBe("accepted");
    expect(contentHash(result.value!.state.currentThesis)).toBe(initialThesisHash);
  });
});

describe("rule 3 — edit creates a human-authored patch and applies after validation", () => {
  it("edit is attributed to the human actor and its patch is preserved separately", () => {
    const edited = [
      { op: "replace" as const, path: "/forecasts/forecast_revenue_q3/status", value: "review_required" },
    ];
    const result = review(fresh(), {
      proposal: forecast,
      action: "edit",
      editedPatch: edited,
      note: "Review with margin assumptions.",
    });
    expect(result.status).toBe("accepted");
    const rec = result.value!.review!;
    expect(rec.reviewerUserId).toBe(analyst.userId);
    expect(rec.editedPatch).toEqual(edited);
    // Original agent proposal remains intact.
    expect(forecast.proposedPatch).not.toBe(edited);
  });

  it("an edit with a non-allowlisted path is rejected", () => {
    const result = review(fresh(), {
      proposal: forecast,
      action: "edit",
      editedPatch: [{ op: "replace", path: "/positions/main/size", value: 100 }],
    });
    expect(result.status).toBe("rejected");
    expect(result.messages.some((m) => m.validator === "semantic_patch")).toBe(true);
  });
});

describe("semantic no-op protection", () => {
  it("rejects a no-op proposal before recording approval", () => {
    const noopProposal: ThesisDeltaProposal = {
      ...forecast,
      proposalId: "proposal_noop_forecast",
      proposedPatch: [
        { op: "replace", path: "/forecasts/forecast_revenue_q3/status", value: "active" },
      ],
    };

    const result = review(fresh(), { proposal: noopProposal, action: "accept" });

    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("patch_noop");
    expect(result.value).toBeUndefined();
    expect(fresh().reviews).toHaveLength(0);
  });

  it("rejects an approved batch whose valid patches cancel to the original semantic state", () => {
    const weakenProposal: ThesisDeltaProposal = {
      ...enterprise,
      proposalId: "proposal_weaken_then_restore_1",
      targetObjectId: "pillar_midmarket_demand",
      proposedPatch: [
        { op: "replace", path: "/pillars/pillar_midmarket_demand/status", value: "weakened" },
      ],
    };
    const restoreProposal: ThesisDeltaProposal = {
      ...enterprise,
      proposalId: "proposal_weaken_then_restore_2",
      targetObjectId: "pillar_midmarket_demand",
      proposedPatch: [
        { op: "replace", path: "/pillars/pillar_midmarket_demand/status", value: "active" },
      ],
    };

    const approved = review(fresh(), { proposal: weakenProposal, action: "accept" }).value!.state;
    const forcedRestoreReview: Review = {
      ...approved.reviews[0]!,
      reviewId: "review_forced_restore",
      proposalId: restoreProposal.proposalId,
    };
    const state: DomainState = {
      ...approved,
      reviews: [...approved.reviews, forcedRestoreReview],
    };
    const proposalsById = new Map(byId);
    proposalsById.set(weakenProposal.proposalId, weakenProposal);
    proposalsById.set(restoreProposal.proposalId, restoreProposal);

    const result = applyApprovedChanges(state, {
      actor: analyst,
      now: NOW,
      runBundle: successRun,
      proposalsById,
      tenantId: arctCase.tenantId,
    });

    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("transition_noop");
    expect(state.currentThesis.version).toBe(12);
    expect(state.transitions).toHaveLength(0);
  });
});

describe("rules 6–8 — transitions", () => {
  function approvedState(): DomainState {
    let state = fresh();
    state = review(state, { proposal: enterprise, action: "accept" }).value!.state;
    state = review(state, {
      proposal: forecast,
      action: "edit",
      editedPatch: forecast.proposedPatch,
      note: "Confirmed against the model.",
    }).value!.state;
    state = review(state, { proposal: question, action: "accept" }).value!.state;
    state = review(state, { proposal: midmarket, action: "escalate", escalatedToUserId: pm.userId }).value!.state;
    return state;
  }

  const applyInput = {
    actor: analyst,
    now: NOW,
    runBundle: successRun,
    proposalsById: byId,
    tenantId: arctCase.tenantId,
  };

  it("apply mutates exactly once: v12 → v13 with only approved patches", () => {
    const state = approvedState();
    const result = applyApprovedChanges(state, applyInput);
    expect(result.status).toBe("accepted");
    const { state: next, transition } = result.value!;

    expect(transition.fromVersion).toBe(12);
    expect(transition.toVersion).toBe(13);
    expect(next.currentThesis.version).toBe(13);
    expect(transition.proposalIds).toEqual([
      "proposal_arct_enterprise_001",
      "proposal_arct_forecast_003",
      "proposal_arct_question_004",
    ]);
    expect(transition.proposalIds).not.toContain("proposal_arct_midmarket_002");

    // The escalated pillar is untouched; approved changes match the expected v13 fixture.
    expect(next.currentThesis.pillars).toEqual(expectedThesisV13.pillars);
    expect(next.currentThesis.forecasts).toEqual(expectedThesisV13.forecasts);
    expect(next.currentThesis.openQuestions).toEqual(expectedThesisV13.openQuestions);
    expect(next.currentThesis.risks).toEqual(expectedThesisV13.risks);

    // Before/after hashes are real content hashes.
    expect(transition.beforeSnapshotHash).toBe(initialThesisHash);
    expect(transition.afterSnapshotHash).toBe(contentHash(next.currentThesis));
  });

  it("a second apply with no new approvals is rejected (nothing to apply)", () => {
    const applied = applyApprovedChanges(approvedState(), applyInput).value!.state;
    const again = applyApprovedChanges(applied, applyInput);
    expect(again.status).toBe("rejected");
    expect(again.messages[0]?.code).toBe("nothing_to_apply");
    expect(applied.currentThesis.version).toBe(13);
  });

  it("rule 7 — duplicate approval of an applied proposal is an idempotent no-op", () => {
    const applied = applyApprovedChanges(approvedState(), applyInput).value!.state;
    const result = review(applied, { proposal: enterprise, action: "accept" });
    expect(result.status).toBe("accepted_with_warnings");
    expect(result.value!.state).toBe(applied);
    expect(result.messages[0]?.code).toBe("already_applied");
  });

  it("rule 6 — a stale-version proposal cannot be approved or applied", () => {
    const stale: ThesisDeltaProposal = { ...enterprise, fromThesisVersion: 11 };
    const result = review(fresh(), { proposal: stale, action: "accept" });
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("stale_version");
  });

  it("rule 9 — every review action appears in history", () => {
    const state = approvedState();
    expect(state.reviews.map((r) => r.action)).toEqual(["accept", "edit", "accept", "escalate"]);
  });

  it("pendingApprovals excludes rejected / escalated / deferred proposals", () => {
    const state = approvedState();
    const pending = pendingApprovals(state, byId);
    expect(pending.map((p) => p.proposal.proposalId)).toEqual([
      "proposal_arct_enterprise_001",
      "proposal_arct_forecast_003",
      "proposal_arct_question_004",
    ]);
  });

  it("a later review supersedes an earlier one for the same proposal", () => {
    let state = fresh();
    state = review(state, { proposal: enterprise, action: "accept" }).value!.state;
    state = review(state, { proposal: enterprise, action: "reject", reasonCode: "duplicate" }).value!.state;
    expect(pendingApprovals(state, byId)).toHaveLength(0);
  });
});

describe("rollback (safe demo affordance)", () => {
  it("rollback restores v12 and marks the transition rolled back", () => {
    let state = fresh();
    state = review(state, { proposal: enterprise, action: "accept" }).value!.state;
    const applied = applyApprovedChanges(state, {
      actor: analyst,
      now: NOW,
      runBundle: successRun,
      proposalsById: byId,
      tenantId: arctCase.tenantId,
    }).value!;
    const rolled = rollbackTransition(applied.state, applied.transition.transitionId);
    expect(rolled.status).toBe("accepted");
    expect(rolled.value!.state.currentThesis.version).toBe(12);
    expect(contentHash(rolled.value!.state.currentThesis)).toBe(initialThesisHash);
    expect(rolled.value!.state.transitions[0]?.status).toBe("rolled_back");
  });
});

describe("rule 10 — deterministic reset", () => {
  it("initial state always hashes to the pristine fixture hash", () => {
    expect(contentHash(fresh().currentThesis)).toBe(initialThesisHash);
    expect(fresh()).toEqual(fresh());
    expect(fresh().reviews).toHaveLength(0);
    expect(fresh().transitions).toHaveLength(0);
  });
});

describe("required review inputs", () => {
  it("reject requires a reason", () => {
    const result = review(fresh(), { proposal: enterprise, action: "reject" });
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("reject_reason_required");
  });

  it("escalate requires a target", () => {
    const result = review(fresh(), { proposal: enterprise, action: "escalate" });
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("escalate_target_required");
  });

  it("defer requires a date", () => {
    const result = review(fresh(), { proposal: enterprise, action: "defer" });
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("defer_date_required");
  });
});

describe("degraded proposals remain individually reviewable", () => {
  it("an analyst can accept the safe degraded proposals", () => {
    const ctx = { runDegraded: true, blockedByPolicy: false };
    for (const p of degradedProposals) {
      const result = recordReview(fresh(), { proposal: p, action: "accept", actor: analyst, context: ctx, now: NOW });
      expect(result.status, p.proposalId).toBe("accepted");
    }
  });
});
