import { describe, expect, it } from "vitest";
import { FixtureWorkspaceRepository } from "../repositories/fixtureWorkspaceRepository";
import { WorkspaceService } from "./workspaceService";

function createService() {
  return new WorkspaceService(new FixtureWorkspaceRepository());
}

describe("WorkspaceService repository contract", () => {
  it("accepts evidence and exposes it in the thesis workspace", async () => {
    const service = createService();

    await service.acceptEvidence("ev_capex");
    const thesisWorkspace = await service.getThesisWorkspace("th_ngsc");

    expect(thesisWorkspace.acceptedEvidence.map((item) => item.id)).toContain("ev_capex");
  });

  it("dismisses evidence so it no longer appears in new evidence", async () => {
    const service = createService();

    await service.dismissEvidence("ev_irrelevant");
    const newEvidence = await service.listEvidence("new");
    const allEvidence = await service.listEvidence("all");

    expect(newEvidence.map((item) => item.id)).not.toContain("ev_irrelevant");
    expect(allEvidence.find((item) => item.id === "ev_irrelevant")?.status).toBe("dismissed");
  });

  it("records corrections as user classifications and derives asset from thesis", async () => {
    const service = createService();

    const corrected = await service.correctEvidence({
      evidenceId: "ev_pricebait",
      impact: "neutral",
      thesisId: "th_retl",
      assumptionId: "a_retl_3",
      confidence: "medium",
      rationaleSummary: "User reframed the item as weak sentiment context, not a price target.",
    });

    expect(corrected.classification.source).toBe("user");
    expect(corrected.classification.assetId).toBe("retl");
    expect(corrected.classification.thesisId).toBe("th_retl");
    expect(corrected.classification.assumptionId).toBe("a_retl_3");
    expect(corrected.classification.rationale).toMatch(/User reframed/);
  });

  it("preserves counter-evidence filtering", async () => {
    const service = createService();
    const counterEvidence = await service.listEvidence("contradicts");

    expect(counterEvidence.length).toBeGreaterThan(0);
    expect(counterEvidence.every((item) => item.classification.impact === "contradicts")).toBe(true);
  });

  it("rejects empty decision rationale without appending a trace entry", async () => {
    const service = createService();
    const before = await service.getThesisWorkspace("th_ngsc");

    await expect(
      service.recordDecision({
        thesisId: "th_ngsc",
        decision: "Hold position",
        newConviction: 79,
        rationale: "",
        followUp: "",
      }),
    ).rejects.toThrow(/human rationale/);

    const after = await service.getThesisWorkspace("th_ngsc");
    expect(after.decisionTrace).toHaveLength(before.decisionTrace.length);
  });

  it("records decisions as human-authored trace entries and refreshes thesis state", async () => {
    const service = createService();

    await service.acceptEvidence("ev_capex");
    await service.recordDecision({
      thesisId: "th_ngsc",
      decision: "Hold position",
      newConviction: 81,
      rationale: "Keeping the thesis active because capex evidence remains supportive.",
      followUp: "Review after next cloud capex update.",
    });

    const workspace = await service.getWorkspace();
    const thesisWorkspace = await service.getThesisWorkspace("th_ngsc");
    const thesis = workspace.theses.find((item) => item.id === "th_ngsc");
    const latestTrace = thesisWorkspace.decisionTrace[0];

    expect(thesis?.conviction).toBe(81);
    expect(thesis?.convictionBand).toBe("high");
    expect(thesis?.pendingChanges).toBe(0);
    expect(latestTrace.rationale).toBe("Keeping the thesis active because capex evidence remains supportive.");
    expect(latestTrace.evidenceIds).toContain("ev_capex");
    expect(Object.keys(latestTrace)).not.toContain("chainOfThought");
  });

  it("returns product-shaped change summaries", async () => {
    const service = createService();
    const changes = await service.getWhatChanged();

    expect(changes.map((change) => change.thesisId)).toContain("th_ngsc");
    expect(JSON.stringify(changes)).not.toMatch(/node|edge|cypher|neo4j/i);
  });
});
