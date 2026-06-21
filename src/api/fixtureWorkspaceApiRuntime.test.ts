import { describe, expect, it } from "vitest";
import { FixtureWorkspaceApiRuntime } from "./fixtureWorkspaceApiRuntime";
import { WorkspaceApiClientError, assertProductSafePayload, unwrapApiResult } from "./workspaceApiMappers";
import { ApiWorkspaceRepository } from "../repositories/apiWorkspaceRepository";
import { WorkspaceService } from "../services/workspaceService";

describe("FixtureWorkspaceApiRuntime", () => {
  it("loads workspace through a product-shaped API envelope", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();

    const result = await runtime.getWorkspace();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.theses.length).toBeGreaterThan(0);
      expect(JSON.stringify(result.data)).not.toMatch(/neo4j|cypher|openbb raw|chain-of-thought|model_prompt|prompt_tokens|token/i);
      expect(() => assertProductSafePayload(result.data)).not.toThrow();
    }
  });

  it("returns safe validation failure envelopes", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();

    const result = await runtime.recordDecision({
      kind: "record_decision",
      thesisId: "th_ngsc",
      decision: "Hold position",
      newConviction: 78,
      rationale: "",
      followUp: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
      expect(result.error.message).toMatch(/human rationale/);
      expect(result.error.message).not.toMatch(/stack|cypher|prompt|chain-of-thought/i);
    }
  });

  it("preserves correction source through the API repository", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();
    const repository = new ApiWorkspaceRepository(runtime);

    const corrected = await repository.correctEvidence({
      evidenceId: "ev_pricebait",
      impact: "neutral",
      thesisId: "th_retl",
      assumptionId: "a_retl_3",
      confidence: "medium",
      rationaleSummary: "User confirmed the item is weak sentiment context.",
    });

    expect(corrected.classification.source).toBe("user");
    expect(corrected.classification.thesisId).toBe("th_retl");
  });

  it("lets WorkspaceService record decisions through runtime-backed repository methods", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();
    const service = new WorkspaceService(new ApiWorkspaceRepository(runtime));

    await service.recordDecision({
      thesisId: "th_ngsc",
      decision: "Hold position",
      newConviction: 80,
      rationale: "Human review keeps the thesis active while monitoring margin pressure.",
      followUp: "Review after next fundamentals refresh.",
    });

    const thesisWorkspace = unwrapApiResult(await runtime.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));
    expect(thesisWorkspace.thesis.conviction).toBe(80);
    expect(thesisWorkspace.decisionTrace[0].rationale).toBe(
      "Human review keeps the thesis active while monitoring margin pressure.",
    );
    expect(Object.keys(thesisWorkspace.decisionTrace[0])).not.toContain("chainOfThought");
  });

  it("refreshes provider evidence through runtime without changing conviction or decision trace", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();
    const before = unwrapApiResult(await runtime.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));

    const refresh = unwrapApiResult(await runtime.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC"] }));
    const after = unwrapApiResult(await runtime.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));

    expect(refresh.added.length).toBeGreaterThan(0);
    expect(after.thesis.conviction).toBe(before.thesis.conviction);
    expect(after.decisionTrace.length).toBe(before.decisionTrace.length);
  });

  it("throws client errors when API repository unwraps failures", async () => {
    const repository = new ApiWorkspaceRepository(new FixtureWorkspaceApiRuntime());

    await expect(repository.acceptEvidence("missing")).rejects.toBeInstanceOf(WorkspaceApiClientError);
  });
});
