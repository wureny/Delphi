/**
 * Authorization and degraded-mode policy.
 *
 * These rules are the single source of truth for who may approve what. The UI
 * must render whatever this module decides; it must never re-implement the
 * rules as scattered conditionals.
 */
import type {
  DemoRole,
  DemoUser,
  Materiality,
  RequiredReviewerRole,
  ThesisDeltaProposal,
  ValidationMessage,
} from "./types";

export const DEMO_USERS: Record<DemoRole, DemoUser> = {
  analyst: { userId: "user_analyst_01", role: "analyst", displayName: "A. Chen — Analyst" },
  pm: { userId: "user_pm_01", role: "pm", displayName: "R. Okafor — PM" },
};

/** Reviewer seniority used to compare a demo role against a required role. */
const ROLE_RANK: Record<RequiredReviewerRole, number> = {
  analyst: 1,
  senior_analyst: 2,
  pm: 3,
  cio: 4,
  compliance: 4,
};

const MATERIALITY_RANK: Record<Materiality, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export interface ApprovalContext {
  /** True when the proposal came from a degraded run. */
  runDegraded: boolean;
  /** True when the degraded policy blocked this proposal (evidence unavailable). */
  blockedByPolicy: boolean;
}

export interface PolicyDecision {
  allowed: boolean;
  code:
    | "ok"
    | "policy_blocked_evidence"
    | "requires_pm"
    | "degraded_requires_pm"
    | "insufficient_role";
  message: string;
}

/**
 * May this actor apply (accept or approve-an-edit-of) this proposal?
 *
 * Rules (build brief §7):
 *  4. high materiality requires PM;
 *  5. a degraded high-impact proposal cannot be accepted by an Analyst;
 * 11. blocked evidence fails closed — nobody can accept a blocked proposal.
 */
export function canApplyProposal(
  actor: DemoUser,
  proposal: ThesisDeltaProposal,
  context: ApprovalContext,
): PolicyDecision {
  if (context.blockedByPolicy) {
    return {
      allowed: false,
      code: "policy_blocked_evidence",
      message:
        "Evidence for this proposal is unavailable. Approval fails closed: retry the source or escalate for PM review.",
    };
  }

  const actorRank = ROLE_RANK[actor.role];
  const requiredRank = ROLE_RANK[proposal.requiredReviewerRole];
  const isHighImpact = MATERIALITY_RANK[proposal.materiality] >= MATERIALITY_RANK.high;

  if (isHighImpact && actor.role !== "pm") {
    return {
      allowed: false,
      code: "requires_pm",
      message: "High-materiality changes require PM approval. Escalate this proposal to the PM queue.",
    };
  }

  if (context.runDegraded && isHighImpact && actor.role !== "pm") {
    return {
      allowed: false,
      code: "degraded_requires_pm",
      message: "Degraded high-impact proposals cannot be accepted by an Analyst. Escalate to the PM.",
    };
  }

  if (actorRank < requiredRank) {
    return {
      allowed: false,
      code: "insufficient_role",
      message: `This proposal requires the ${proposal.requiredReviewerRole.toUpperCase()} role. Escalate it instead.`,
    };
  }

  return { allowed: true, code: "ok", message: "Actor is authorized to approve this proposal." };
}

export function authorizationMessage(decision: PolicyDecision): ValidationMessage {
  return {
    validator: decision.code === "policy_blocked_evidence" ? "degraded_policy" : "authorization",
    severity: decision.allowed ? "info" : "error",
    code: decision.code,
    message: decision.message,
  };
}

/** Reject-reason chips offered in the UI and recorded in review history. */
export const REJECT_REASONS = [
  { code: "not_material", label: "Not material" },
  { code: "incorrect_evidence", label: "Incorrect evidence" },
  { code: "duplicate", label: "Duplicate" },
  { code: "wrong_interpretation", label: "Wrong interpretation" },
  { code: "already_reflected", label: "Already reflected" },
  { code: "insufficient_evidence", label: "Insufficient evidence" },
  { code: "other", label: "Other" },
] as const;
