import { describe, expect, it } from "vitest";
import { FixtureWorkspaceApiRuntime } from "../src/api/fixtureWorkspaceApiRuntime";
import { unwrapApiResult } from "../src/api/workspaceApiMappers";
import { HttpWorkspaceApiClient, createWorkspaceHttpHandler } from "../src/api/workspaceHttpApi";

function createClient() {
  return new HttpWorkspaceApiClient(createWorkspaceHttpHandler(new FixtureWorkspaceApiRuntime()));
}

describe("HTTP runtime adapter evals", () => {
  it("does not leak graph, raw provider, prompt, token, or chain-of-thought fields", async () => {
    const client = createClient();
    const workspace = unwrapApiResult(await client.getWorkspace());
    const serialized = JSON.stringify(workspace);

    expect(serialized).not.toMatch(/neo4j|cypher|openbb raw|last_price|previous_close|model_prompt|prompt_tokens|token|chain-of-thought/i);
  });

  it("does not generate advice or price targets when routing provider refresh", async () => {
    const client = createClient();
    const result = unwrapApiResult(await client.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC"] }));
    const serialized = JSON.stringify(result);

    expect(result.added.length).toBeGreaterThan(0);
    expect(serialized).not.toMatch(/buy|sell|price target|target price|portfolio weight|should own|should short/i);
  });

  it("keeps provider refresh from mutating conviction or decision trace over HTTP", async () => {
    const client = createClient();
    const before = unwrapApiResult(await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));

    await client.refreshProviderEvidence({ kind: "refresh_provider_evidence", symbols: ["NGSC"] });
    const after = unwrapApiResult(await client.getThesisWorkspace({ kind: "get_thesis_workspace", thesisId: "th_ngsc" }));

    expect(after.thesis.conviction).toBe(before.thesis.conviction);
    expect(after.decisionTrace.length).toBe(before.decisionTrace.length);
  });

  it("returns safe errors for unknown HTTP routes", async () => {
    const handler = createWorkspaceHttpHandler(new FixtureWorkspaceApiRuntime());

    const response = await handler({ method: "GET", path: "/api/neo4j/cypher" });

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
    expect(JSON.stringify(response.body)).not.toMatch(/stack|cypher|neo4j|secret|token|chain-of-thought/i);
  });
});
