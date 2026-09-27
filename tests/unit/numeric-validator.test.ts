import { describe, expect, it } from "vitest";
import { stripPeriodLabels, validateNumbers, type EvidenceContext } from "@/domain/validators";
import { extractNumbers } from "@/domain/validators";
import type { SourceDocument, SourceExcerpt, ThesisDeltaProposal } from "@/domain/types";

function excerpt(excerptId: string, text: string): SourceExcerpt {
  return {
    excerptId,
    sourceId: "src",
    locator: {},
    text,
    numericValues: extractNumbers(text).map((value) => ({ label: "stated", value, unit: "as_stated", basis: "text", sourceExcerptId: excerptId })),
    classification: "public",
    contentHash: "sha256:x",
  };
}

const doc = { sourceId: "src", title: "Release" } as SourceDocument;
const excerpts = [
  excerpt("row", "Additions to property and equipment | (35,802) | (17,079) | (115,948) | (64,551)"),
  excerpt("text", "Revenue was $90.0 billion and increased 18% (up 17% in constant currency)"),
];
const ctx: EvidenceContext = {
  resolveExcerpt: (id) => {
    const e = excerpts.find((x) => x.excerptId === id);
    return e ? { excerpt: e, document: doc } : undefined;
  },
  unavailableSourceIds: new Set(),
};

function check(whatChanged: string, evidenceRefs = ["row", "text"]) {
  return validateNumbers({ whatChanged, evidenceRefs } as ThesisDeltaProposal, ctx).map((m) => m.message);
}

describe("numeric validator", () => {
  it("accepts exact, rescaled, and same-row growth figures", () => {
    expect(check("Capex was $35.8 billion versus $17.1 billion, up 110%; revenue was $90.0 billion, up 18%.")).toEqual([]);
    expect(check("Full-year capex rose 79.6% to $115.9 billion.")).toEqual([]);
  });

  it("ignores dates and calendar years", () => {
    expect(check("For the quarter ended June 30, 2026, fiscal 2026 revenue was $90.0 billion.")).toEqual([]);
    expect(stripPeriodLabels("filed 2026-07-29 for fiscal 2026, $2,026 million")).not.toMatch(/2026-07-29|fiscal 2026/);
    expect(stripPeriodLabels("$2,026 million")).toContain("2,026");
  });

  it("still rejects numbers that are not grounded", () => {
    expect(check("Capex was $36.5 billion, up 45%.")).toHaveLength(2);
    // growth is only derivable within one row, not across unrelated figures
    expect(check("Revenue grew 150%.")).toHaveLength(1);
  });
});
