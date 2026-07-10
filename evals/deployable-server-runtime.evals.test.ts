import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertProductSafePayload, unwrapApiResult } from "../src/api/workspaceApiMappers";
import type { WorkspaceApiRuntime } from "../src/api/workspaceApiTypes";
import { ApiWorkspaceRepository } from "../src/repositories/apiWorkspaceRepository";
import { WorkspaceService } from "../src/services/workspaceService";
import type { RunningNodeWorkspaceServer } from "../src/server/nodeWorkspaceServer";
import { startNetworkWorkspaceHarness } from "../src/test/networkWorkspaceHarness";

describe("deployable server runtime evals", () => {
  let running: RunningNodeWorkspaceServer | null;
  let client: WorkspaceApiRuntime;

  beforeEach(async () => {
    const harness = await startNetworkWorkspaceHarness();
    running = harness.running;
    client = harness.client;
  });

  afterEach(async () => {
    await running?.close();
    running = null;
  });

  it("keeps network payloads free of implementation and private-reasoning leakage", async () => {
    const workspace = unwrapApiResult(await client.getWorkspace());
    const failure = await client.acceptEvidence({ kind: "accept_evidence", evidenceId: "missing" });
    const payload = { workspace, failure };

    expect(() => assertProductSafePayload(payload)).not.toThrow();
    expect(JSON.stringify(payload)).not.toMatch(
      /neo4j|cypher|openbb raw|last_price|previous_close|model_prompt|prompt_tokens|secret|chain-of-thought|private reasoning/i,
    );
  });

  it("keeps every provider-derived network claim grounded or explicitly uncertain", async () => {
    const refresh = unwrapApiResult(
      await client.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC", "RETL"] }),
    );

    expect(refresh.added.length).toBeGreaterThan(0);
    for (const evidence of refresh.added) {
      expect(Boolean(evidence.citation) !== evidence.uncertain).toBe(true);
      expect(evidence.status).toBe("new");
      expect(evidence.classification.source).toBe("ai");
    }
  });

  it("keeps counter-evidence visible and classified as contradicting over TCP", async () => {
    const counterEvidence = unwrapApiResult(
      await client.listEvidence({ kind: "list_evidence", filter: "contradicts" }),
    );

    expect(counterEvidence.length).toBeGreaterThan(0);
    expect(counterEvidence.map((item) => item.id)).toContain("ev_custom_accel");
    expect(counterEvidence.every((item) => item.classification.impact === "contradicts")).toBe(true);
  });

  it("does not emit advice or mutate judgment during network provider refresh", async () => {
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

  it("preserves user correction and human-authored decision trace integrity over TCP", async () => {
    const repository = new ApiWorkspaceRepository(client);
    const service = new WorkspaceService(repository);
    const corrected = await repository.correctEvidence({
      evidenceId: "ev_pricebait",
      impact: "neutral",
      thesisId: "th_retl",
      assumptionId: "a_retl_3",
      confidence: "medium",
      rationaleSummary: "User rejected price-target framing as decision evidence.",
    });
    const rationale = "Human review keeps conviction unchanged until stronger operating evidence arrives.";

    await service.recordDecision({
      thesisId: "th_retl",
      decision: "Continue research",
      newConviction: 54,
      rationale,
      followUp: "Review the next operations update.",
    });
    const thesis = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_retl" }),
    );

    expect(corrected.classification.source).toBe("user");
    expect(thesis.decisionTrace[0].rationale).toBe(rationale);
    expect(thesis.decisionTrace[0].sources).toContain("Ops post-mortem");
    expect(JSON.stringify(thesis.decisionTrace[0])).not.toMatch(/chain-of-thought|private reasoning|model_prompt/i);
  });

  it("refuses an absent human decision rationale over TCP", async () => {
    const before = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }),
    );
    const result = await client.recordDecision({
      kind: "record_decision",
      thesisId: "th_ngsc",
      decision: "Increase position",
      newConviction: 95,
      rationale: " ",
      followUp: "",
    });
    const after = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
      expect(result.error.message).toMatch(/human rationale/i);
    }
    expect(after.decisionTrace).toHaveLength(before.decisionTrace.length);
  });
});
