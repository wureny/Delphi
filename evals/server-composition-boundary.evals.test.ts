import { describe, expect, it } from "vitest";
import { HttpWorkspaceApiClient } from "../src/api/workspaceHttpApi";
import { assertProductSafePayload, unwrapApiResult } from "../src/api/workspaceApiMappers";
import { ApiWorkspaceRepository } from "../src/repositories/apiWorkspaceRepository";
import { WorkspaceService } from "../src/services/workspaceService";
import { createServerComposition } from "../src/server/createServerComposition";

function createClient() {
  return new HttpWorkspaceApiClient(createServerComposition().handler);
}

describe("server composition boundary evals", () => {
  it("keeps serialized workspace and errors free of implementation leakage", async () => {
    const client = createClient();
    const workspace = unwrapApiResult(await client.getWorkspace());
    const failure = await client.acceptEvidence({ kind: "accept_evidence", evidenceId: "missing" });
    const payload = { workspace, failure };

    expect(() => assertProductSafePayload(payload)).not.toThrow();
    expect(JSON.stringify(payload)).not.toMatch(
      /neo4j|cypher|openbb raw|last_price|previous_close|model_prompt|prompt_tokens|secret|chain-of-thought|private reasoning/i,
    );
  });

  it("keeps all provider-derived claims grounded or explicitly uncertain", async () => {
    const client = createClient();
    const refresh = unwrapApiResult(
      await client.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC", "RETL"] }),
    );

    expect(refresh.added.length).toBeGreaterThan(0);
    for (const evidence of refresh.added) {
      expect(Boolean(evidence.citation) !== evidence.uncertain).toBe(true);
      expect(evidence.classification.source).toBe("ai");
      expect(evidence.status).toBe("new");
    }
  });

  it("does not hide counter-evidence or soften its classification", async () => {
    const client = createClient();
    const counterEvidence = unwrapApiResult(await client.listEvidence({ kind: "list_evidence", filter: "contradicts" }));

    expect(counterEvidence.length).toBeGreaterThan(0);
    expect(counterEvidence.map((item) => item.id)).toContain("ev_custom_accel");
    expect(counterEvidence.every((item) => item.classification.impact === "contradicts")).toBe(true);
  });

  it("does not emit advice or mutate thesis judgment during provider refresh", async () => {
    const client = createClient();
    const before = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }),
    );
    const refresh = unwrapApiResult(
      await client.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC"] }),
    );
    const after = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }),
    );

    expect(JSON.stringify(refresh)).not.toMatch(
      /\bbuy\b|\bsell\b|price target|target price|portfolio weight|position size|should own|should short/i,
    );
    expect(after.thesis.conviction).toBe(before.thesis.conviction);
    expect(after.decisionTrace).toHaveLength(before.decisionTrace.length);
  });

  it("preserves correction attribution and human decision rationale", async () => {
    const client = createClient();
    const repository = new ApiWorkspaceRepository(client);
    const service = new WorkspaceService(repository);

    const corrected = await repository.correctEvidence({
      evidenceId: "ev_pricebait",
      impact: "neutral",
      thesisId: "th_retl",
      assumptionId: "a_retl_3",
      confidence: "medium",
      rationaleSummary: "User rejected the price-target framing as decision evidence.",
    });
    const rationale = "Human review records no conviction change until stronger operating evidence arrives.";
    await service.recordDecision({
      thesisId: "th_retl",
      decision: "Continue research",
      newConviction: 54,
      rationale,
      followUp: "Review the next company operations update.",
    });

    const thesis = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_retl" }),
    );
    expect(corrected.classification.source).toBe("user");
    expect(thesis.decisionTrace[0].rationale).toBe(rationale);
    expect(JSON.stringify(thesis.decisionTrace[0])).not.toMatch(/chain-of-thought|private reasoning|model_prompt/i);
  });

  it("refuses a model-authored or absent decision rationale path", async () => {
    const client = createClient();
    const result = await client.recordDecision({
      kind: "record_decision",
      thesisId: "th_ngsc",
      decision: "Increase position",
      newConviction: 95,
      rationale: " ",
      followUp: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
      expect(result.error.message).toMatch(/human rationale/i);
    }
  });
});
