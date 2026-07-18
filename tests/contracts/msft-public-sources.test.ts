import { describe, expect, it } from "vitest";
import inventory from "@/fixtures/data/real/msft-fy25q4/source-inventory.json";
import {
  msftFundContextManifest,
  msftSourceBundles,
  msftSuccessRun,
  msftThesisV12,
  msftSuccessProposals,
} from "@/fixtures/loader";
import {
  collectFundContextObjectRefs,
  defaultContextBindings,
  validateCaseContextBindings,
  validateFundContextManifest,
} from "@/context/fund-context";

describe("MSFT real-public source contract", () => {
  it("maps every inventoried public source to complete normalized provenance", () => {
    expect(inventory.runtimeNetworkAccess).toBe(false);
    expect(inventory.sources).toHaveLength(8);
    for (const entry of inventory.sources) {
      const document = msftSourceBundles.find((bundle) => bundle.sourceDocument.sourceId === entry.sourceId)?.sourceDocument;
      expect(document, entry.sourceId).toBeDefined();
      expect(document).toMatchObject({
        originKind: "real_public",
        canonicalUri: entry.canonicalUri,
        publisherName: entry.publisher,
        contentHash: `sha256:${entry.expectedRemoteSha256}`,
      });
      expect(document?.retrievedAt).toBeTruthy();
      expect(document?.rightsNote).toBeTruthy();
    }
  });

  it("keeps post-cutoff evidence out of pre-event thesis scope", () => {
    const bindings = defaultContextBindings(msftFundContextManifest);
    expect(validateCaseContextBindings({ manifest: msftFundContextManifest, bindings })).toEqual([]);
    const annualReport = msftFundContextManifest.artifacts.find((artifact) => artifact.objectRef === "source_msft_fy25_annual_report")!;
    const invalid = [
      ...bindings,
      {
        bindingId: "binding_invalid_hindsight",
        caseId: msftFundContextManifest.caseId,
        artifactId: annualReport.artifactId,
        contextRole: annualReport.contextRole,
        scope: "pre_event" as const,
        addedAt: msftFundContextManifest.generatedAt,
        source: "curated_user_added" as const,
      },
    ];
    expect(validateCaseContextBindings({ manifest: msftFundContextManifest, bindings: invalid })).toContainEqual(
      expect.objectContaining({ code: "point_in_time_violation", artifactId: annualReport.artifactId }),
    );
  });

  it("validates CalPERS references without implying thesis ownership or endorsement", () => {
    const calpersArtifacts = msftFundContextManifest.artifacts.filter((artifact) =>
      ["institution_policy", "portfolio_position"].includes(artifact.contextRole),
    );
    expect(calpersArtifacts).toHaveLength(2);
    for (const artifact of calpersArtifacts) {
      expect(artifact.originKind).toBe("real_public");
      expect(artifact.nonEndorsementNotice?.toLowerCase()).toMatch(/not|does not/);
      expect(artifact.defaultSelected).toBe(false);
    }
  });

  it("resolves the complete MSFT manifest through known product IDs", () => {
    const knownObjectRefs = collectFundContextObjectRefs({
      sources: msftSourceBundles,
      thesis: msftThesisV12,
      proposals: msftSuccessProposals,
      runs: [msftSuccessRun],
    });
    expect(
      validateFundContextManifest({
        manifest: msftFundContextManifest,
        sources: msftSourceBundles,
        thesis: msftThesisV12,
        knownObjectRefs,
      }),
    ).toEqual([]);
  });
});
