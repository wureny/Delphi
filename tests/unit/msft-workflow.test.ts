import { describe, expect, it } from "vitest";
import { DEMO_USERS } from "@/domain/policies";
import { applyApprovedChanges, initialDomainState, recordReview } from "@/domain/transitions";
import expected from "@/fixtures/data/real/msft-fy25q4/expected-review-flow.msft.json";
import {
  defaultCase,
  msftSuccessProposals,
  msftSuccessRun,
  msftThesisV12,
} from "@/fixtures/loader";

const byId = new Map(msftSuccessProposals.map((proposal) => [proposal.proposalId, proposal]));
const NOW = "2025-07-30T23:00:00Z";

describe("MSFT deterministic approval path", () => {
  it("applies only authorized human-approved semantic changes with full context provenance", () => {
    let state = initialDomainState(msftThesisV12);
    const analyst = DEMO_USERS.analyst;
    const normal = { runDegraded: false, blockedByPolicy: false };

    state = recordReview(state, {
      proposal: byId.get("proposal_msft_azure_001")!, action: "accept", actor: analyst, context: normal, now: NOW,
    }).value!.state;
    state = recordReview(state, {
      proposal: byId.get("proposal_msft_capacity_002")!, action: "escalate", actor: analyst, context: normal, now: NOW,
      escalatedToUserId: DEMO_USERS.pm.userId,
    }).value!.state;
    const margin = byId.get("proposal_msft_margin_003")!;
    state = recordReview(state, {
      proposal: margin, action: "edit", actor: analyst, context: normal, now: NOW,
      editedPatch: structuredClone(margin.proposedPatch), note: "Review margin alongside capex mix.",
    }).value!.state;
    state = recordReview(state, {
      proposal: byId.get("proposal_msft_outlook_004")!, action: "accept", actor: analyst, context: normal, now: NOW,
    }).value!.state;

    const result = applyApprovedChanges(state, {
      actor: analyst,
      now: NOW,
      runBundle: msftSuccessRun,
      proposalsById: byId,
      tenantId: defaultCase.tenantId,
    });
    expect(result.status).toBe("accepted");
    const next = result.value!.state.currentThesis;
    const transition = result.value!.transition;
    expect(next.version).toBe(13);
    expect(next.pillars.find((pillar) => pillar.pillarId === "pillar_msft_azure_demand")?.teamConviction).toBe("high");
    expect(next.risks.find((risk) => risk.riskId === "risk_msft_capacity_constraint")?.severity).toBe("medium");
    expect(next.forecasts.find((forecast) => forecast.forecastId === "forecast_msft_q4_cloud_gm")?.status).toBe("review_required");
    expect(next.openQuestions.some((question) => question.questionId === "question_msft_growth_vs_capital")).toBe(true);
    expect(transition).toMatchObject({
      transitionId: "transition_msft_001",
      synthetic: false,
      fromVersion: 12,
      toVersion: 13,
      contextSetHash: msftSuccessRun.workflowRun.contextSetHash,
      evidenceOrigins: ["real_public", "demo_derived"],
    });
    expect(transition.proposalIds).toEqual(expected.expectedTransition.proposalIds);
    expect(transition.reviewIds).toEqual(expected.expectedTransition.reviewIds);
    expect(transition.beforeSnapshotHash).toBe(expected.expectedTransition.beforeSnapshotHash);
    expect(transition.afterSnapshotHash).toBe(expected.expectedTransition.afterSnapshotHash);
    expect(transition.afterSnapshotHash).toBe(expected.expectedApprovedThesis.contentHash);
  });
});
