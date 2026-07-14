/**
 * Contract tests — fixtures must satisfy the domain schemas and resolve
 * internally before the app is allowed to render them.
 */
import { describe, expect, it } from "vitest";
import {
  arctCase,
  thesisV12,
  earningsEvent,
  sourceBundles,
  successRun,
  degradedRun,
  successProposals,
  degradedProposals,
  allProposals,
  resolveExcerpt,
  expectedThesisV13,
  expectedTransition,
  expectedReceipt,
  degradedBlockedProposalIds,
  fundContextManifest,
  internalResearchMemoBundle,
} from "@/fixtures/loader";
import { validateSemanticPatch } from "@/domain/patch";
import { validateNumbers, validateReferenceScope, type EvidenceContext } from "@/domain/validators";
import { diffThesis } from "@/lib/diff";
import { hasSemanticThesisChange } from "@/domain/semantic-thesis";
import { contentHash } from "@/domain/hash";
import { collectFundContextObjectRefs, validateFundContextManifest } from "@/context/fund-context";

const evidenceCtx: EvidenceContext = {
  resolveExcerpt,
  unavailableSourceIds: new Set(),
};

describe("fixture envelopes", () => {
  it("all fixtures are explicitly synthetic v0.2.0", () => {
    for (const fixture of [
      arctCase,
      thesisV12,
      earningsEvent,
      successRun,
      degradedRun,
      expectedThesisV13,
      internalResearchMemoBundle,
      fundContextManifest,
    ]) {
      expect(fixture.synthetic).toBe(true);
      expect(fixture.fixtureVersion).toBe("0.2.0");
      expect(fixture.schemaVersion).toBe("2026-07-13");
    }
  });

  it("the approved thesis starts at v12 with three pillars, five forecasts, three risks, three open questions", () => {
    expect(thesisV12.version).toBe(12);
    expect(arctCase.approvedThesisVersion).toBe(12);
    expect(thesisV12.pillars).toHaveLength(3);
    expect(thesisV12.forecasts).toHaveLength(5);
    expect(thesisV12.risks).toHaveLength(3);
    expect(thesisV12.openQuestions).toHaveLength(3);
    expect(thesisV12.pillars.find((pillar) => pillar.pillarId === "pillar_enterprise_demand")?.teamConviction).toBe("medium");
  });

  it("models fund-owned working context without pretending to connect a live repository", () => {
    const model = fundContextManifest.artifacts.find((artifact) => artifact.artifactId === "context_team_forecast_v12");
    const memo = fundContextManifest.artifacts.find((artifact) => artifact.artifactId === "context_internal_memo_v7");
    expect(model).toMatchObject({
      contextRole: "internal_working_context",
      classification: "internal",
      externalModelAccess: "blocked",
      externalTransfer: false,
    });
    expect(memo).toMatchObject({
      objectRef: internalResearchMemoBundle.sourceDocument.sourceId,
      contextRole: "internal_working_context",
      accessPolicyId: "policy_internal_research",
      externalModelAccess: "blocked",
    });
    expect(fundContextManifest.connectors.every((connector) => connector.mode === "fixture_simulated")).toBe(true);
    expect(fundContextManifest.connectors.every((connector) => connector.persistence === "none")).toBe(true);
  });

  it("resolves every context object and derived link through the product contract", () => {
    const knownObjectRefs = collectFundContextObjectRefs({
      sources: sourceBundles,
      thesis: thesisV12,
      proposals: allProposals,
      runs: [successRun, degradedRun],
    });
    expect(
      validateFundContextManifest({
        manifest: fundContextManifest,
        sources: sourceBundles,
        thesis: thesisV12,
        knownObjectRefs,
      }),
    ).toEqual([]);
  });
});

describe("proposal contracts", () => {
  it("there are four successful-run proposals covering support / weaken / forecast review / new question", () => {
    expect(successProposals).toHaveLength(4);
    const types = successProposals.map((p) => p.deltaType);
    expect(types).toContain("thesis_pillar_update");
    expect(types).toContain("forecast_review");
    expect(types).toContain("open_question_create");
  });

  it("every proposal references the known case, a known run, and thesis v12", () => {
    const runIds = new Set([successRun.workflowRun.runId, degradedRun.workflowRun.runId]);
    for (const p of allProposals) {
      expect(p.caseId).toBe(arctCase.caseId);
      expect(runIds.has(p.runId)).toBe(true);
      expect(p.fromThesisVersion).toBe(12);
    }
  });

  it("every evidence reference resolves to a real excerpt", () => {
    for (const p of allProposals) {
      for (const ref of p.evidenceRefs) {
        expect(resolveExcerpt(ref), `unresolved evidence ${ref} in ${p.proposalId}`).toBeDefined();
      }
    }
  });

  it("every proposed patch is an allowed semantic patch against v12", () => {
    for (const p of allProposals) {
      const result = validateSemanticPatch(thesisV12, p.proposedPatch);
      expect(result.status, `${p.proposalId}: ${JSON.stringify(result.messages)}`).toBe("accepted");
    }
  });

  it("every proposal targets objects inside the approved snapshot", () => {
    for (const p of allProposals) {
      expect(validateReferenceScope(p, thesisV12)).toHaveLength(0);
    }
  });

  it("numbers cited in proposals are supported by extracted evidence values", () => {
    for (const p of allProposals) {
      expect(validateNumbers(p, evidenceCtx), p.proposalId).toHaveLength(0);
    }
  });
});

describe("run fixtures", () => {
  it("the successful run outputs exactly the four proposal ids", () => {
    expect(successRun.workflowRun.outputProposalIds).toEqual(successProposals.map((p) => p.proposalId));
  });

  it("the degraded run marks the transcript unavailable and keeps two safe proposals", () => {
    expect(degradedRun.workflowRun.status).toBe("degraded");
    expect(degradedRun.workflowRun.sourceRefs).not.toContain("source_transcript_q2");
    expect(degradedRun.workflowRun.degradedReasons[0]?.code).toBe("source_unavailable");
    expect(degradedProposals).toHaveLength(2);
    expect(degradedRun.events.some((e) => e.eventType === "source_unavailable")).toBe(true);
    expect(degradedRun.events.some((e) => e.eventType === "degraded_mode_entered")).toBe(true);
  });

  it("degraded policy blocks the transcript-dependent proposals, including the high-materiality pillar update", () => {
    expect(degradedBlockedProposalIds).toContain("proposal_arct_midmarket_002");
    const blocked = successProposals.filter((p) => degradedBlockedProposalIds.includes(p.proposalId));
    expect(blocked.some((p) => p.materiality === "high")).toBe(true);
  });
});

describe("expected outputs", () => {
  it("the expected transition moves v12 → v13 and excludes the escalated proposal", () => {
    expect(expectedTransition.fromVersion).toBe(12);
    expect(expectedTransition.toVersion).toBe(13);
    expect(expectedTransition.proposalIds).not.toContain("proposal_arct_midmarket_002");
    expect(expectedTransition.beforeSnapshotHash).toBe(contentHash(thesisV12));
    expect(expectedTransition.afterSnapshotHash).toBe(contentHash(expectedThesisV13));
    expect(hasSemanticThesisChange(thesisV12, expectedThesisV13)).toBe(true);
    const diff = diffThesis(thesisV12, expectedThesisV13);
    expect(diff.changes.length + diff.added.length + diff.removed.length).toBeGreaterThan(0);
    expect(diff.changes).toContainEqual(
      expect.objectContaining({
        objectId: "pillar_enterprise_demand",
        field: "teamConviction",
        before: "medium",
        after: "high",
      }),
    );
  });

  it("the expected privacy receipt reflects fixture mode with no external access", () => {
    expect(expectedReceipt.rawContentSentToDelphiCloud).toBe(false);
    expect(expectedReceipt.externalWebAccess).toBe(false);
    expect(expectedReceipt.classification).toBe("synthetic");
    expect(expectedReceipt.canonicalWritesProposed).toBe(4);
    expect(expectedReceipt.canonicalWritesApproved).toBe(3);
  });
});
