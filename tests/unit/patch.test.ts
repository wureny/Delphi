import { describe, expect, it } from "vitest";
import { applySemanticPatch, validateSemanticPatch } from "@/domain/patch";
import { thesisV12 } from "@/fixtures/loader";

describe("semantic patch engine", () => {
  it("applies an allowlisted replace by stable id", () => {
    const result = applySemanticPatch(thesisV12, [
      { op: "replace", path: "/pillars/pillar_midmarket_demand/status", value: "weakened" },
    ]);
    expect(result.status).toBe("accepted");
    const pillar = result.value!.pillars.find((p) => p.pillarId === "pillar_midmarket_demand");
    expect(pillar?.status).toBe("weakened");
    // Input snapshot never mutated.
    expect(thesisV12.pillars.find((p) => p.pillarId === "pillar_midmarket_demand")?.status).toBe("active");
  });

  it("appends a schema-valid open question", () => {
    const result = applySemanticPatch(thesisV12, [
      {
        op: "add",
        path: "/openQuestions/-",
        value: {
          questionId: "question_new",
          question: "Is the new question schema-valid?",
          ownerUserId: "user_analyst_01",
          status: "open",
          evidenceRefs: [],
        },
      },
    ]);
    expect(result.status).toBe("accepted");
    expect(result.value!.openQuestions).toHaveLength(4);
  });

  it("rejects a non-allowlisted path", () => {
    const result = validateSemanticPatch(thesisV12, [
      { op: "replace", path: "/summary/anything/else", value: "x" },
    ]);
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("patch_not_allowlisted");
  });

  it("rejects remove operations outright", () => {
    const result = validateSemanticPatch(thesisV12, [{ op: "remove", path: "/pillars/pillar_enterprise_demand/status" }]);
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("patch_op_forbidden");
  });

  it("rejects a replace on a missing object", () => {
    const result = validateSemanticPatch(thesisV12, [
      { op: "replace", path: "/pillars/pillar_nonexistent/status", value: "weakened" },
    ]);
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("patch_target_missing");
  });

  it("rejects an invalid enum value", () => {
    const result = validateSemanticPatch(thesisV12, [
      { op: "replace", path: "/pillars/pillar_enterprise_demand/status", value: "moonshot" },
    ]);
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("patch_value_invalid");
  });

  it("rejects replacing a governed field with its current value", () => {
    const result = validateSemanticPatch(thesisV12, [
      { op: "replace", path: "/pillars/pillar_midmarket_demand/status", value: "active" },
    ]);
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("patch_noop");
  });

  it("rejects adding a duplicate open question id", () => {
    const result = validateSemanticPatch(thesisV12, [
      {
        op: "add",
        path: "/openQuestions/-",
        value: {
          questionId: "question_midmarket",
          question: "Duplicate of an existing question id.",
          ownerUserId: "user_analyst_01",
          status: "open",
          evidenceRefs: [],
        },
      },
    ]);
    expect(result.status).toBe("rejected");
    expect(result.messages[0]?.code).toBe("patch_duplicate_add");
  });
});
