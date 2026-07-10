import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { unwrapApiResult } from "../api/workspaceApiMappers";
import type { RunningNodeWorkspaceServer } from "./nodeWorkspaceServer";
import { startNetworkWorkspaceHarness } from "../test/networkWorkspaceHarness";
import type { WorkspaceApiRuntime } from "../api/workspaceApiTypes";

describe("Node workspace server", () => {
  let running: RunningNodeWorkspaceServer | null;
  let client: WorkspaceApiRuntime;

  beforeEach(async () => {
    const harness = await startNetworkWorkspaceHarness({ bodyLimitBytes: 1_024 });
    running = harness.running;
    client = harness.client;
  });

  afterEach(async () => {
    await running?.close();
    running = null;
  });

  it("serves a minimal health check and workspace over real HTTP", async () => {
    const health = await fetch(`${running?.url}/healthz`);
    const workspace = unwrapApiResult(await client.getWorkspace());

    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    expect(workspace.theses.map((thesis) => thesis.id)).toContain("th_ngsc");
  });

  it("preserves correction attribution through the network", async () => {
    const corrected = unwrapApiResult(
      await client.correctEvidence({
        kind: "correct_evidence",
        evidenceId: "ev_pricebait",
        impact: "neutral",
        thesisId: "th_retl",
        assumptionId: "a_retl_3",
        confidence: "medium",
        rationaleSummary: "User rejected the item as decision-grade evidence.",
      }),
    );

    expect(corrected.classification.source).toBe("user");
    expect(corrected.classification.impact).toBe("neutral");
  });

  it("enforces browser origin allowlisting and preflight", async () => {
    const allowed = await fetch(`${running?.url}/api/workspace`, {
      headers: { Origin: "http://127.0.0.1:5173" },
    });
    const denied = await fetch(`${running?.url}/api/workspace`, {
      headers: { Origin: "https://untrusted.example" },
    });
    const preflight = await fetch(`${running?.url}/api/workspace`, {
      method: "OPTIONS",
      headers: { Origin: "http://127.0.0.1:5173" },
    });

    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
    expect(denied.status).toBe(403);
    expect(JSON.stringify(await denied.json())).not.toMatch(/workspace|thesis|secret/i);
    expect(preflight.status).toBe(204);
  });

  it("rejects malformed JSON and oversized bodies safely", async () => {
    const malformed = await fetch(`${running?.url}/api/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const oversized = await fetch(`${running?.url}/api/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rationale: "x".repeat(2_000) }),
    });

    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(JSON.stringify([await malformed.json(), await oversized.json()])).not.toMatch(
      /not-json|x{20}|stack|token|secret/i,
    );
  });

  it("keeps provider refresh from mutating conviction or decision traces", async () => {
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
    expect(after.thesis.conviction).toBe(before.thesis.conviction);
    expect(after.decisionTrace).toHaveLength(before.decisionTrace.length);
  });
});
