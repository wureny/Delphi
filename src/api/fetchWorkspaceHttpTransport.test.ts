import { describe, expect, it, vi } from "vitest";
import { createFetchWorkspaceHttpTransport } from "./fetchWorkspaceHttpTransport";

function response(status: number, body: unknown): Response {
  return {
    status,
    json: async () => body,
  } as Response;
}

describe("fetch workspace HTTP transport", () => {
  it("serializes query parameters and command bodies", async () => {
    const fetchImpl = vi.fn(async () => response(200, { ok: true, data: [] }));
    const transport = createFetchWorkspaceHttpTransport({
      baseUrl: "https://api.example.test/",
      fetchImpl: fetchImpl as typeof fetch,
    });

    await transport({ method: "GET", path: "/api/evidence", query: { filter: "contradicts" } });
    await transport({
      method: "POST",
      path: "/api/evidence/example/accept",
      body: { kind: "accept_evidence", evidenceId: "example" },
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/evidence?filter=contradicts",
      expect.objectContaining({ method: "GET", body: undefined }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/evidence/example/accept",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ kind: "accept_evidence", evidenceId: "example" }),
      }),
    );
  });

  it("normalizes network failures without exposing transport details", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("connect ECONNREFUSED secret-host");
    });
    const transport = createFetchWorkspaceHttpTransport({ fetchImpl: fetchImpl as typeof fetch });

    const result = await transport({ method: "GET", path: "/api/workspace" });

    expect(result.status).toBe(503);
    expect(result.body).toEqual({
      ok: false,
      error: { code: "runtime_unavailable", message: "Delphi workspace service is unavailable." },
    });
    expect(JSON.stringify(result.body)).not.toMatch(/ECONNREFUSED|secret-host/i);
  });

  it("rejects non-JSON and malformed API envelopes", async () => {
    const invalidJson = vi.fn(async () => ({
      status: 502,
      json: async () => {
        throw new Error("HTML proxy response");
      },
    } as unknown as Response));
    const malformed = vi.fn(async () => response(200, { workspace: "raw" }));

    const first = await createFetchWorkspaceHttpTransport({ fetchImpl: invalidJson as typeof fetch })({
      method: "GET",
      path: "/api/workspace",
    });
    const second = await createFetchWorkspaceHttpTransport({ fetchImpl: malformed as typeof fetch })({
      method: "GET",
      path: "/api/workspace",
    });

    expect(first.status).toBe(503);
    expect(second.status).toBe(503);
    expect(JSON.stringify([first, second])).not.toMatch(/HTML proxy response|workspace.*raw/i);
  });
});
