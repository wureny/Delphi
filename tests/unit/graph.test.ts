import { describe, expect, it } from "vitest";
import { contentHash } from "@/domain/hash";
import { initialDomainState } from "@/domain/transitions";
import { DeterministicGraphProjectionPort, validateGraphProjection } from "@/runtime/graph";
import {
  allProposals,
  arctCase,
  fundContextManifest,
  runBundles,
  sourceBundles,
  thesisV12,
} from "@/fixtures/loader";

const projector = new DeterministicGraphProjectionPort();
const input = {
  investmentCase: arctCase,
  domain: initialDomainState(thesisV12),
  proposals: allProposals,
  runs: runBundles,
  sources: sourceBundles,
  context: fundContextManifest,
};

describe("deterministic graph projection", () => {
  it("projects stable product nodes and typed relationships without mutating canonical state", () => {
    const before = contentHash(input.domain);
    const first = projector.project(input);
    const second = projector.project(input);

    expect(first).toEqual(second);
    expect(first.mode).toBe("projection_only");
    expect(first.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining(["case", "thesis", "pillar", "evidence", "run", "proposal", "connector"]),
    );
    expect(first.edges.map((edge) => edge.type)).toEqual(
      expect.arrayContaining([
        "HAS_THESIS",
        "HAS_PILLAR",
        "PRODUCED",
        "TARGETS",
        "CITES",
        "PROVIDES_CONTEXT",
        "CONTEXTUALIZES",
      ]),
    );
    const nodeIds = new Set(first.nodes.map((node) => node.id));
    for (const edge of first.edges) {
      expect(nodeIds.has(edge.from), `${edge.id} has an unresolved source endpoint`).toBe(true);
      expect(nodeIds.has(edge.to), `${edge.id} has an unresolved target endpoint`).toBe(true);
    }
    const memoNode = first.nodes.find((node) => node.id === "source_internal_memo_v7");
    expect(memoNode?.attributes).toMatchObject({
      contextRole: "internal_working_context",
      contextClassification: "internal",
      contextAccessPolicyId: "policy_internal_research",
      contextExternalModelAccess: "blocked",
      contextExternalTransfer: false,
    });
    expect(first.edges).toContainEqual(
      expect.objectContaining({
        type: "PROVIDES_CONTEXT",
        from: "connector_customer_research_repository",
        to: "source_internal_memo_v7",
      }),
    );
    expect(first.edges).toContainEqual(
      expect.objectContaining({
        type: "CONTEXTUALIZES",
        from: "source_internal_memo_v7",
        to: "pillar_enterprise_demand",
      }),
    );
    expect(contentHash(input.domain)).toBe(before);
    expect(validateGraphProjection(first, arctCase, thesisV12)).toEqual({ status: "current" });
  });

  it("marks a projection stale when the canonical thesis version advances", () => {
    const projection = projector.project(input);
    const laterThesis = { ...thesisV12, version: thesisV12.version + 1 };
    expect(validateGraphProjection(projection, arctCase, laterThesis)).toEqual({
      status: "stale",
      reasonCode: "version_mismatch",
    });
  });

  it("uses product vocabulary and contains no database-specific fields", () => {
    const serialized = JSON.stringify(projector.project(input));
    expect(serialized).not.toMatch(/cypher|neo4j|stackTrace|apiKey|sharepoint|google drive|bearer/i);
  });
});
