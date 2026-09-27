import { describe, expect, it } from "vitest";
import { proposalEffects, scoreCase, type CaseLabels } from "@/engine/eval/score";
import { msftThesisV12 } from "@/fixtures/loader";
import type { ThesisDeltaProposal } from "@/domain/types";

const base = { proposalId: "p1", targetObjectId: "pillar_msft_azure_demand" } as ThesisDeltaProposal;
const p = (id: string, patch: ThesisDeltaProposal["proposedPatch"], target?: string): ThesisDeltaProposal =>
  ({ ...base, proposalId: id, targetObjectId: target, proposedPatch: patch }) as ThesisDeltaProposal;

describe("eval scoring", () => {
  it("reads direction from the patch relative to the baseline thesis", () => {
    const up = p("a", [{ op: "replace", path: "/pillars/pillar_msft_azure_demand/teamConviction", value: "high" }]);
    const down = p("b", [{ op: "replace", path: "/pillars/pillar_msft_azure_demand/teamConviction", value: "low" }]);
    expect([...proposalEffects(up, msftThesisV12).get("pillar_msft_azure_demand")!]).toEqual(["strengthen"]);
    expect([...proposalEffects(down, msftThesisV12).get("pillar_msft_azure_demand")!]).toEqual(["weaken"]);
  });

  it("counts hits, misses, contradictions, and unlabeled proposals", () => {
    const labels: CaseLabels = {
      ticker: "MSFT",
      accessionNumber: "x",
      labelStatus: "draft",
      expected: [
        { importance: "must", objectId: "pillar_msft_azure_demand", direction: "strengthen", note: "" },
        { importance: "should", objectId: "risk_msft_capacity_constraint", direction: "increase", note: "" },
      ],
      contradictions: [{ objectId: "pillar_msft_azure_demand", direction: "weaken" }],
    };
    const proposals = [
      p("hit", [{ op: "replace", path: "/pillars/pillar_msft_azure_demand/teamConviction", value: "high" }]),
      p("contra", [{ op: "replace", path: "/pillars/pillar_msft_azure_demand/status", value: "weakened" }]),
      p("extra", [{ op: "add", path: "/openQuestions/-", value: {} }], ""),
    ];
    const s = scoreCase(labels, proposals, msftThesisV12);
    expect([s.mustHit, s.mustTotal, s.shouldHit, s.shouldTotal]).toEqual([1, 1, 0, 1]);
    expect(s.contradictions.map((c) => c.proposalId)).toEqual(["contra"]);
    expect(s.unlabeledProposals.map((u) => u.proposalId)).toEqual(["contra", "extra"]);
  });
});
