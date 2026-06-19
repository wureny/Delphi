import { describe, expect, it } from "vitest";
import { initialWorkspace } from "../data/fixtures";
import {
  convictionBand,
  filterEvidence,
  freshness,
  hasCitationOrUncertainty,
  newCounterEvidence,
  watchlistWithoutThesis,
} from "./selectors";

describe("selectors", () => {
  it("computes conviction band boundaries", () => {
    expect(convictionBand(0)).toBe("low");
    expect(convictionBand(33)).toBe("low");
    expect(convictionBand(34)).toBe("medium");
    expect(convictionBand(66)).toBe("medium");
    expect(convictionBand(67)).toBe("high");
  });

  it("marks stale theses using each thesis threshold", () => {
    const freshThesis = initialWorkspace.theses.find((thesis) => thesis.id === "th_ngsc");
    const staleThesis = initialWorkspace.theses.find((thesis) => thesis.id === "th_bcon");

    expect(freshThesis).toBeDefined();
    expect(staleThesis).toBeDefined();
    expect(freshness(initialWorkspace.now, freshThesis!).stale).toBe(false);
    expect(freshness(initialWorkspace.now, staleThesis!).stale).toBe(true);
  });

  it("enforces citation-or-uncertainty for every evidence item", () => {
    expect(initialWorkspace.evidence.every(hasCitationOrUncertainty)).toBe(true);
  });

  it("filters evidence by workflow state", () => {
    expect(filterEvidence(initialWorkspace.evidence, "new").every((item) => item.status === "new")).toBe(true);
    expect(filterEvidence(initialWorkspace.evidence, "accepted").every((item) => item.status === "accepted")).toBe(true);
    expect(filterEvidence(initialWorkspace.evidence, "contradicts").every((item) => item.classification.impact === "contradicts")).toBe(true);
    expect(filterEvidence(initialWorkspace.evidence, "uncertain").every((item) => item.uncertain || item.classification.confidence === "low")).toBe(true);
  });

  it("surfaces new counter-evidence and partial watchlist assets", () => {
    expect(newCounterEvidence(initialWorkspace.evidence).map((item) => item.id)).toContain("ev_custom_accel");
    expect(watchlistWithoutThesis(initialWorkspace).map((asset) => asset.ticker)).toContain("MDSR");
  });
});
