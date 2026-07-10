import { describe, expect, it } from "vitest";
import { HttpWorkspaceApiClient } from "../api/workspaceHttpApi";
import { unwrapApiResult } from "../api/workspaceApiMappers";
import { ApiWorkspaceRepository } from "../repositories/apiWorkspaceRepository";
import { WorkspaceService } from "../services/workspaceService";
import { createServerComposition } from "./createServerComposition";

function createClient() {
  const composition = createServerComposition();
  return {
    composition,
    client: new HttpWorkspaceApiClient(composition.handler),
  };
}

describe("server composition", () => {
  it("assembles configuration, runtime, and HTTP handler for workspace reads", async () => {
    const { composition, client } = createClient();

    const workspace = unwrapApiResult(await client.getWorkspace());

    expect(composition.config).toEqual({ repositoryMode: "fixture", financialDataProviderMode: "mock" });
    expect(workspace.theses.map((thesis) => thesis.id)).toContain("th_ngsc");
  });

  it("keeps composition instances isolated", async () => {
    const first = createClient().client;
    const second = createClient().client;

    unwrapApiResult(await first.acceptEvidence({ kind: "accept_evidence", evidenceId: "ev_pricebait" }));
    const firstWorkspace = unwrapApiResult(await first.getWorkspace());
    const secondWorkspace = unwrapApiResult(await second.getWorkspace());

    expect(firstWorkspace.evidence.find((item) => item.id === "ev_pricebait")?.status).toBe("accepted");
    expect(secondWorkspace.evidence.find((item) => item.id === "ev_pricebait")?.status).toBe("new");
  });

  it("preserves counter-evidence and user correction through the full path", async () => {
    const { client } = createClient();
    const counterEvidence = unwrapApiResult(await client.listEvidence({ kind: "list_evidence", filter: "contradicts" }));

    expect(counterEvidence.some((item) => item.id === "ev_custom_accel")).toBe(true);
    expect(counterEvidence.every((item) => item.classification.impact === "contradicts")).toBe(true);

    const corrected = unwrapApiResult(
      await client.correctEvidence({
        kind: "correct_evidence",
        evidenceId: "ev_pricebait",
        impact: "neutral",
        thesisId: "th_retl",
        assumptionId: "a_retl_3",
        confidence: "medium",
        rationaleSummary: "User reviewed the source and retained it only as weak context.",
      }),
    );

    expect(corrected.classification.source).toBe("user");
    expect(corrected.classification.impact).toBe("neutral");
  });

  it("keeps provider refresh reviewable without changing conviction or decisions", async () => {
    const { client } = createClient();
    const before = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }),
    );

    const refresh = unwrapApiResult(
      await client.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC"] }),
    );
    const after = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }),
    );

    expect(refresh.added.length).toBeGreaterThan(0);
    expect(refresh.added.every((item) => Boolean(item.citation) !== item.uncertain)).toBe(true);
    expect(after.thesis.conviction).toBe(before.thesis.conviction);
    expect(after.decisionTrace).toHaveLength(before.decisionTrace.length);
  });

  it("rejects empty rationale without appending a decision", async () => {
    const { client } = createClient();
    const before = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }),
    );

    const result = await client.recordDecision({
      kind: "record_decision",
      thesisId: "th_ngsc",
      decision: "Hold position",
      newConviction: 78,
      rationale: "",
      followUp: "Review after the next fundamentals update.",
    });
    const after = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation_failed");
    expect(after.decisionTrace).toHaveLength(before.decisionTrace.length);
  });

  it("records only the human rationale through API-backed services", async () => {
    const { client } = createClient();
    const service = new WorkspaceService(new ApiWorkspaceRepository(client));
    const rationale = "Human review keeps the thesis active while monitoring the accepted reliability evidence.";

    await service.recordDecision({
      thesisId: "th_retl",
      decision: "Continue research",
      newConviction: 55,
      rationale,
      followUp: "Review the next operations update.",
    });

    const workspace = unwrapApiResult(
      await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_retl" }),
    );
    const trace = workspace.decisionTrace[0];

    expect(trace.rationale).toBe(rationale);
    expect(trace.sources).toContain("Ops post-mortem");
    expect(trace.followUp).toBe("Review the next operations update.");
    expect(trace.at).toBeTruthy();
    expect(JSON.stringify(trace)).not.toMatch(/chain-of-thought|private reasoning|model_prompt/i);
  });
});
