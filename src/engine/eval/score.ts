/**
 * Eval scoring for Earnings-to-Thesis.
 *
 * Labels say which thesis objects a competent analyst would move after the
 * event, and in which direction. A proposal's direction is read from its
 * validated patch against the baseline thesis, never from its prose.
 */
import type { ThesisDeltaProposal, ThesisSnapshot } from "@/domain/types";

export type Effect = "strengthen" | "weaken" | "increase" | "decrease" | "close" | "review" | "update" | "new_question";

export type ExpectedDirection =
  | "touch"
  | "strengthen"
  | "weaken"
  | "weaken_or_review"
  | "increase"
  | "decrease"
  | "decrease_or_review"
  | "close_or_review"
  | "new_question";

export interface CaseLabels {
  ticker: string;
  accessionNumber: string;
  labelStatus: string;
  expected: Array<{ importance: "must" | "should"; objectId: string; direction: ExpectedDirection; note: string }>;
  contradictions: Array<{ objectId: string; direction: Effect }>;
}

const CONVICTION = { low: 1, medium: 2, high: 3 } as const;
const SEVERITY = { low: 1, medium: 2, high: 3, critical: 4 } as const;
const STATUS_EFFECT: Record<string, Effect> = {
  strengthened: "strengthen",
  weakened: "weaken",
  increasing: "increase",
  decreasing: "decrease",
  closed: "close",
  review_required: "review",
  active: "review",
  open: "review",
};

function currentValue(thesis: ThesisSnapshot, collection: string, id: string, field: string): unknown {
  const list = (thesis as unknown as Record<string, Array<Record<string, unknown>>>)[collection] ?? [];
  const obj = list.find((o) => Object.values(o).includes(id));
  return obj?.[field];
}

/** Effects a proposal has on each thesis object, keyed by object ID ("*" for new questions). */
export function proposalEffects(proposal: ThesisDeltaProposal, thesis: ThesisSnapshot): Map<string, Set<Effect>> {
  const out = new Map<string, Set<Effect>>();
  const add = (id: string, effect: Effect) => {
    if (!out.has(id)) out.set(id, new Set());
    out.get(id)!.add(effect);
  };
  for (const op of proposal.proposedPatch) {
    const seg = op.path.split("/").filter(Boolean);
    if (op.op === "add" && seg[0] === "openQuestions") {
      add("*", "new_question");
      continue;
    }
    if (op.op !== "replace" || seg.length !== 3) continue;
    const [collection, id, field] = seg as [string, string, string];
    const value = op.value;
    const before = currentValue(thesis, collection, id, field);
    if (field === "teamConviction" && typeof value === "string" && typeof before === "string") {
      const d = (CONVICTION[value as keyof typeof CONVICTION] ?? 0) - (CONVICTION[before as keyof typeof CONVICTION] ?? 0);
      add(id, d > 0 ? "strengthen" : d < 0 ? "weaken" : "review");
    } else if (field === "severity" && typeof value === "string" && typeof before === "string") {
      const d = (SEVERITY[value as keyof typeof SEVERITY] ?? 0) - (SEVERITY[before as keyof typeof SEVERITY] ?? 0);
      add(id, d > 0 ? "increase" : d < 0 ? "decrease" : "review");
    } else if (field === "status" && typeof value === "string") {
      add(id, STATUS_EFFECT[value] ?? "review");
    } else if (field === "value" || field === "actualValue") {
      add(id, "update");
    } else {
      add(id, "review");
    }
  }
  return out;
}

function satisfies(direction: ExpectedDirection, effects: Set<Effect> | undefined, targeted: boolean): boolean {
  const has = (...e: Effect[]) => e.some((x) => effects?.has(x));
  switch (direction) {
    case "touch":
      return targeted || (effects?.size ?? 0) > 0;
    case "strengthen":
      return has("strengthen");
    case "weaken":
      return has("weaken");
    case "weaken_or_review":
      return has("weaken", "review");
    case "increase":
      return has("increase");
    case "decrease":
      return has("decrease");
    case "decrease_or_review":
      return has("decrease", "close", "review");
    case "close_or_review":
      return has("close", "review", "decrease");
    case "new_question":
      return has("new_question");
  }
}

export interface CaseScore {
  ticker: string;
  mustHit: number;
  mustTotal: number;
  shouldHit: number;
  shouldTotal: number;
  contradictions: Array<{ objectId: string; direction: Effect; proposalId: string }>;
  missed: Array<{ importance: string; objectId: string; direction: string; note: string }>;
  /** Proposals that overwrite a forecast's original value (eval forecasts all cover the reported period). */
  forecastOverwrites: Array<{ proposalId: string; forecastId: string }>;
  /** Reviewable proposals that match no label — not necessarily wrong; needs human judgment. */
  unlabeledProposals: Array<{ proposalId: string; headline: string }>;
}

export function scoreCase(labels: CaseLabels, proposals: ThesisDeltaProposal[], thesis: ThesisSnapshot): CaseScore {
  const effects = proposals.map((p) => ({ p, e: proposalEffects(p, thesis) }));
  const used = new Set<string>();
  const missed: CaseScore["missed"] = [];
  let mustHit = 0;
  let shouldHit = 0;

  for (const exp of labels.expected) {
    const hit = effects.find(({ p, e }) => {
      if (exp.direction === "new_question") return satisfies("new_question", e.get("*"), false);
      return satisfies(exp.direction, e.get(exp.objectId), p.targetObjectId === exp.objectId);
    });
    if (hit) {
      used.add(hit.p.proposalId);
      if (exp.importance === "must") mustHit++;
      else shouldHit++;
    } else {
      missed.push(exp);
    }
  }

  const contradictions: CaseScore["contradictions"] = [];
  for (const c of labels.contradictions) {
    for (const { p, e } of effects) {
      if (e.get(c.objectId)?.has(c.direction)) contradictions.push({ ...c, proposalId: p.proposalId });
    }
  }

  const forecastOverwrites = proposals.flatMap((p) =>
    p.proposedPatch
      .filter((op) => op.op === "replace" && /^\/forecasts\/[^/]+\/value$/.test(op.path))
      .map((op) => ({ proposalId: p.proposalId, forecastId: op.path.split("/")[2]! })),
  );

  return {
    ticker: labels.ticker,
    forecastOverwrites,
    mustHit,
    mustTotal: labels.expected.filter((x) => x.importance === "must").length,
    shouldHit,
    shouldTotal: labels.expected.filter((x) => x.importance === "should").length,
    contradictions,
    missed,
    unlabeledProposals: proposals.filter((p) => !used.has(p.proposalId)).map((p) => ({ proposalId: p.proposalId, headline: p.headline })),
  };
}
