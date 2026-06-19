import { describe, expect, it } from "vitest";
import { initialWorkspace } from "../data/fixtures";
import { assembleDecisionTrace, classifyEvidence, refusalForAdvice, summarizeChanges } from "./aiBehaviors";

describe("ai behavior placeholders", () => {
  it("classifies support evidence without losing citation expectations", () => {
    const evidence = initialWorkspace.evidence.find((item) => item.id === "ev_capex")!;
    const classification = classifyEvidence(evidence, initialWorkspace);

    expect(classification.impact).toBe("supports");
    expect(classification.assumptionId).toBe("a_ngsc_1");
    expect(evidence.citation).not.toBeNull();
  });

  it("does not soften counter-evidence to neutral", () => {
    const evidence = initialWorkspace.evidence.find((item) => item.id === "ev_custom_accel")!;
    const classification = classifyEvidence(evidence, initialWorkspace);

    expect(classification.impact).toBe("contradicts");
    expect(classification.impact).not.toBe("neutral");
  });

  it("refuses advice and price target bait", () => {
    expect(refusalForAdvice("Should I buy RETL here?")).toContain("does not provide buy/sell");

    const evidence = initialWorkspace.evidence.find((item) => item.id === "ev_pricebait")!;
    const classification = classifyEvidence(evidence, initialWorkspace);
    expect(classification.impact).toBe("unclear");
    expect(classification.thesisId).toBeNull();
  });

  it("summarizes stale theses without fabricating change", () => {
    const summary = summarizeChanges(initialWorkspace, "th_bcon");
    expect(summary.summary[0].evidenceId).toBeNull();
    expect(summary.summary[0].text).toMatch(/No material new evidence/);
  });

  it("requires human rationale for decision traces", () => {
    expect(() =>
      assembleDecisionTrace(
        {
          actor: "A. Mercer",
          decision: "Hold position",
          priorConviction: 50,
          newConviction: 50,
          evidenceIds: [],
          changedAssumptions: [],
          rationale: "",
          sources: [],
          followUp: "",
          unresolved: [],
        },
        initialWorkspace.now,
      ),
    ).toThrow(/rationale is required/);
  });

  it("assembles auditable trace entries without chain-of-thought", () => {
    const trace = assembleDecisionTrace(
      {
        actor: "A. Mercer",
        decision: "Hold position",
        priorConviction: 50,
        newConviction: 55,
        evidenceIds: ["ev_capex"],
        changedAssumptions: ["a_ngsc_1"],
        rationale: "I want to keep exposure while capex evidence remains supportive.",
        sources: ["Cloud buyer call"],
        followUp: "Revisit after earnings.",
        unresolved: [],
      },
      initialWorkspace.now,
    );

    expect(trace.rationale).toBe("I want to keep exposure while capex evidence remains supportive.");
    expect(Object.keys(trace)).not.toContain("chainOfThought");
  });
});
