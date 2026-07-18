import { describe, expect, it } from "vitest";
import { contentHash } from "@/domain/hash";
import { contextSetHash, defaultContextBindings } from "@/context/fund-context";
import { parseLocalContextFile } from "@/context/local-import";
import { msftFundContextManifest, msftThesisV12 } from "@/fixtures/loader";

describe("case context bindings", () => {
  it("hashes the curated set deterministically independent of binding order", () => {
    const bindings = defaultContextBindings(msftFundContextManifest);
    expect(contextSetHash(bindings)).toBe("sha256:0fbbae6f9953b6016874270eb3a3cadf304309f333e707a417ca2999dbcb206e");
    expect(contextSetHash([...bindings].reverse())).toBe(contextSetHash(bindings));
  });

  it("add/remove operations do not mutate canonical thesis content", () => {
    const before = contentHash(msftThesisV12);
    const bindings = defaultContextBindings(msftFundContextManifest);
    const extra = msftFundContextManifest.artifacts.find((artifact) => !artifact.defaultSelected)!;
    const added = [
      ...bindings,
      {
        bindingId: `binding_user_${extra.artifactId}`,
        caseId: msftFundContextManifest.caseId,
        artifactId: extra.artifactId,
        contextRole: extra.contextRole,
        scope: "post_event" as const,
        addedAt: "2026-07-18T08:00:00Z",
        source: "curated_user_added" as const,
      },
    ];
    expect(contextSetHash(added)).not.toBe(contextSetHash(bindings));
    expect(contextSetHash(added.filter((binding) => binding.artifactId !== extra.artifactId))).toBe(contextSetHash(bindings));
    expect(contentHash(msftThesisV12)).toBe(before);
  });
});

describe("browser-local context normalization", () => {
  it("normalizes JSON to a bounded local-only preview and SHA-256 hash", async () => {
    const file = new File(['{"metric":42,"note":"local"}'], "watchlist.json", { type: "application/json" });
    const artifact = await parseLocalContextFile(file, { now: "2026-07-18T09:00:00Z" });
    expect(artifact).toMatchObject({
      fileName: "watchlist.json",
      originKind: "user_provided_local",
      contextRole: "local_reference",
      inputUsage: "excluded",
      inputUsageReason: "not_analyzed_in_deterministic_demo",
    });
    expect(artifact.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(artifact.textPreview).toContain('"metric": 42');
    expect(artifact.warnings.join(" ")).toContain("raw file bytes are not persisted");
  });

  it("rejects invalid JSON and unsupported files", async () => {
    await expect(parseLocalContextFile(new File(["{"], "broken.json"))).rejects.toThrow("not valid JSON");
    await expect(parseLocalContextFile(new File(["x"], "model.xlsx"))).rejects.toThrow("Unsupported file type");
  });
});
