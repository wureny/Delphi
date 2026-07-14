import { describe, expect, it } from "vitest";
import { generatePrivacyReceipt } from "@/runtime/receipt";
import { initialDomainState, recordReview, applyApprovedChanges } from "@/domain/transitions";
import { DEMO_USERS } from "@/domain/policies";
import { thesisV12, successRun, successProposals, allProposals, arctCase, expectedReceipt } from "@/fixtures/loader";

const NOW = "2026-07-13T10:00:00Z";
const byId = new Map(allProposals.map((p) => [p.proposalId, p]));

describe("privacy receipt", () => {
  it("reflects the actual demo mode: fixture adapter, no cloud, no web", () => {
    const receipt = generatePrivacyReceipt(successRun, successProposals, initialDomainState(thesisV12), NOW);
    expect(receipt.rawContentSentToDelphiCloud).toBe(false);
    expect(receipt.externalWebAccess).toBe(false);
    expect(receipt.classification).toBe("synthetic");
    expect(receipt.supportAccess).toBe("none");
    expect(receipt.modelRoutes[0]?.provider).toBe("fixture");
    expect(receipt.canonicalWritesProposed).toBe(4);
    expect(receipt.canonicalWritesApproved).toBe(0);
  });

  it("counts approved writes truthfully after the expected review flow", () => {
    let state = initialDomainState(thesisV12);
    const analyst = DEMO_USERS.analyst;
    const ctx = { runDegraded: false, blockedByPolicy: false };
    for (const id of ["proposal_arct_enterprise_001", "proposal_arct_forecast_003", "proposal_arct_question_004"]) {
      state = recordReview(state, { proposal: byId.get(id)!, action: "accept", actor: analyst, context: ctx, now: NOW })
        .value!.state;
    }
    state = applyApprovedChanges(state, {
      actor: analyst,
      now: NOW,
      runBundle: successRun,
      proposalsById: byId,
      tenantId: arctCase.tenantId,
    }).value!.state;

    const receipt = generatePrivacyReceipt(successRun, successProposals, state, NOW);
    expect(receipt.canonicalWritesProposed).toBe(expectedReceipt.canonicalWritesProposed);
    expect(receipt.canonicalWritesApproved).toBe(expectedReceipt.canonicalWritesApproved);
    expect(receipt.toolNames).toEqual(expectedReceipt.toolNames);
  });
});
