import { describe, expect, it } from "vitest";
import {
  collectFundContextObjectRefs,
  summarizeFundContext,
  validateFundContextManifest,
} from "@/context/fund-context";
import { contentHash } from "@/domain/hash";
import {
  allProposals,
  fundContextManifest,
  runBundles,
  sourceBundles,
  thesisV12,
} from "@/fixtures/loader";

const knownObjectRefs = collectFundContextObjectRefs({
  sources: sourceBundles,
  thesis: thesisV12,
  proposals: allProposals,
  runs: runBundles,
});

function validate(manifest = fundContextManifest) {
  return validateFundContextManifest({
    manifest,
    sources: sourceBundles,
    thesis: thesisV12,
    knownObjectRefs,
  });
}

function firstArtifact(manifest: typeof fundContextManifest) {
  const artifact = manifest.artifacts[0];
  if (!artifact) throw new Error("Fund context manifest has no artifacts");
  return artifact;
}

describe("fund context ingestion boundary", () => {
  it("loads a complete, non-transferring synthetic manifest", () => {
    expect(summarizeFundContext(fundContextManifest)).toEqual({
      connectorCount: 4,
      artifactCount: 5,
      externalTransferCount: 0,
      roleCounts: {
        external_evidence: 2,
        internal_working_context: 2,
        internal_approved_state: 1,
      },
    });
    expect(validate()).toEqual([]);
  });

  it("fails closed when a connector reference cannot be resolved", () => {
    const manifest = structuredClone(fundContextManifest);
    firstArtifact(manifest).connectorId = "connector_missing";
    expect(validate(manifest)).toContainEqual(expect.objectContaining({ code: "connector_missing" }));
  });

  it("detects point-in-time metadata drift", () => {
    const manifest = structuredClone(fundContextManifest);
    firstArtifact(manifest).asOf = "2026-07-09T20:05:01Z";
    expect(validate(manifest)).toContainEqual(
      expect.objectContaining({ code: "metadata_mismatch", message: expect.stringContaining("as-of time") }),
    );
  });

  it("blocks external-model access for fund-owned working context", () => {
    const manifest = structuredClone(fundContextManifest);
    const memo = manifest.artifacts.find((artifact) => artifact.artifactId === "context_internal_memo_v7");
    if (!memo) throw new Error("Internal memo context fixture is missing");
    memo.externalModelAccess = "not_used";
    expect(validate(manifest)).toContainEqual(expect.objectContaining({ code: "unsafe_model_policy" }));
  });

  it("rejects derived links that do not resolve through product IDs", () => {
    const manifest = structuredClone(fundContextManifest);
    firstArtifact(manifest).derivedObjectRefs.push("missing_product_object");
    expect(validate(manifest)).toContainEqual(expect.objectContaining({ code: "derived_reference_missing" }));
  });

  it("validates without mutating source or canonical thesis fixtures", () => {
    const before = contentHash({ sources: sourceBundles, thesis: thesisV12, manifest: fundContextManifest });
    validate();
    expect(contentHash({ sources: sourceBundles, thesis: thesisV12, manifest: fundContextManifest })).toBe(before);
  });
});
