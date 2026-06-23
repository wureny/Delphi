import { describe, expect, it } from "vitest";
import { ApiWorkspaceRepository } from "../repositories/apiWorkspaceRepository";
import type { WorkspaceData } from "../domain/types";
import { WorkspaceService } from "../services/workspaceService";
import { FixtureWorkspaceApiRuntime } from "./fixtureWorkspaceApiRuntime";
import { unwrapApiResult } from "./workspaceApiMappers";
import { HttpWorkspaceApiClient, createWorkspaceHttpHandler } from "./workspaceHttpApi";

function createHttpClient() {
  const runtime = new FixtureWorkspaceApiRuntime();
  const handler = createWorkspaceHttpHandler(runtime);
  return {
    client: new HttpWorkspaceApiClient(handler),
    handler,
  };
}

describe("workspace HTTP runtime adapter", () => {
  it("routes GET workspace to a success envelope", async () => {
    const { handler } = createHttpClient();

    const response = await handler({ method: "GET", path: "/api/workspace" });
    const body = response.body as { ok: true; data: WorkspaceData } | { ok: false };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    if (body.ok) {
      expect(body.data.theses.length).toBeGreaterThan(0);
    }
  });

  it("lets ApiWorkspaceRepository read through the HTTP client", async () => {
    const { client } = createHttpClient();
    const repository = new ApiWorkspaceRepository(client);

    const workspace = await repository.getWorkspace();
    const counterEvidence = await repository.listEvidence("contradicts");

    expect(workspace.theses.map((thesis) => thesis.id)).toContain("th_ngsc");
    expect(counterEvidence.every((item) => item.classification.impact === "contradicts")).toBe(true);
  });

  it("routes correction commands without losing user attribution", async () => {
    const { client } = createHttpClient();
    const repository = new ApiWorkspaceRepository(client);

    const corrected = await repository.correctEvidence({
      evidenceId: "ev_pricebait",
      impact: "neutral",
      thesisId: "th_retl",
      assumptionId: "a_retl_3",
      confidence: "medium",
      rationaleSummary: "User confirmed weak sentiment context.",
    });

    expect(corrected.classification.source).toBe("user");
    expect(corrected.classification.thesisId).toBe("th_retl");
  });

  it("lets WorkspaceService record decisions over the HTTP client", async () => {
    const { client } = createHttpClient();
    const service = new WorkspaceService(new ApiWorkspaceRepository(client));

    await service.recordDecision({
      thesisId: "th_ngsc",
      decision: "Hold position",
      newConviction: 82,
      rationale: "Human review accepts the current thesis while watching custom accelerator risk.",
      followUp: "Review after next cloud capex update.",
    });

    const thesisWorkspace = unwrapApiResult(await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));
    expect(thesisWorkspace.thesis.conviction).toBe(82);
    expect(thesisWorkspace.decisionTrace[0].rationale).toBe(
      "Human review accepts the current thesis while watching custom accelerator risk.",
    );
  });

  it("returns safe failures for unknown routes and invalid methods", async () => {
    const { handler } = createHttpClient();

    const unknown = await handler({ method: "GET", path: "/api/graph/nodes" });
    const wrongMethod = await handler({ method: "GET", path: "/api/decisions" });

    expect(unknown.status).toBe(404);
    expect(wrongMethod.status).toBe(405);
    expect(JSON.stringify([unknown.body, wrongMethod.body])).not.toMatch(/stack|cypher|neo4j|prompt|token|secret/i);
  });

  it("refreshes provider evidence over HTTP without mutating conviction or decision trace", async () => {
    const { client } = createHttpClient();
    const before = unwrapApiResult(await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));

    const refresh = unwrapApiResult(await client.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC"] }));
    const after = unwrapApiResult(await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));

    expect(refresh.added.length).toBeGreaterThan(0);
    expect(after.thesis.conviction).toBe(before.thesis.conviction);
    expect(after.decisionTrace.length).toBe(before.decisionTrace.length);
  });
});
