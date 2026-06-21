import { describe, expect, it } from "vitest";
import { FixtureWorkspaceApiRuntime } from "../src/api/fixtureWorkspaceApiRuntime";
import { assertProductSafePayload, unwrapApiResult } from "../src/api/workspaceApiMappers";
import { ApiWorkspaceRepository } from "../src/repositories/apiWorkspaceRepository";
import { WorkspaceService } from "../src/services/workspaceService";

describe("runtime API boundary evals", () => {
  it("serializes workspace payloads without graph, raw provider, prompt, or chain-of-thought leakage", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();
    const workspace = unwrapApiResult(await runtime.getWorkspace());
    const serialized = JSON.stringify(workspace);

    expect(() => assertProductSafePayload(workspace)).not.toThrow();
    expect(serialized).not.toMatch(
      /neo4j|cypher|openbb raw|last_price|previous_close|model_prompt|prompt_tokens|token|chain-of-thought|private reasoning/i,
    );
  });

  it("keeps runtime errors safe and product-shaped", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();
    const result = await runtime.acceptEvidence({ kind: "accept_evidence", evidenceId: "missing" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not_found");
      expect(result.error.message).not.toMatch(/stack|cypher|neo4j|prompt|token|secret/i);
    }
  });

  it("does not produce advice or price targets from runtime provider refresh", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();
    const result = unwrapApiResult(await runtime.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC"] }));
    const text = JSON.stringify(result);

    expect(result.added.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/buy|sell|price target|target price|should own|should short/i);
  });

  it("preserves human-authored decision trace integrity through API-backed workspace service", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();
    const service = new WorkspaceService(new ApiWorkspaceRepository(runtime));

    await service.recordDecision({
      thesisId: "th_ngsc",
      decision: "Hold position",
      newConviction: 79,
      rationale: "Human rationale based on accepted evidence, not model reasoning.",
      followUp: "Review next quarter.",
    });

    const thesisWorkspace = unwrapApiResult(await runtime.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));
    const trace = thesisWorkspace.decisionTrace[0];

    expect(trace.rationale).toBe("Human rationale based on accepted evidence, not model reasoning.");
    expect(JSON.stringify(trace)).not.toMatch(/chain-of-thought|private reasoning|prompt/i);
  });

  it("keeps provider refresh from mutating conviction or appending decisions", async () => {
    const runtime = new FixtureWorkspaceApiRuntime();
    const before = unwrapApiResult(await runtime.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));

    await runtime.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC"] });
    const after = unwrapApiResult(await runtime.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));

    expect(after.thesis.conviction).toBe(before.thesis.conviction);
    expect(after.decisionTrace.length).toBe(before.decisionTrace.length);
  });
});
