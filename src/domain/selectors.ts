import type {
  AssumptionStatus,
  ConvictionBand,
  Evidence,
  EvidenceStatus,
  Impact,
  Thesis,
  WorkspaceData,
} from "./types";

export function convictionBand(score: number): ConvictionBand {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

export function daysBetween(laterIso: string, earlierIso: string): number {
  const later = new Date(laterIso).getTime();
  const earlier = new Date(earlierIso).getTime();
  return Math.max(0, Math.round((later - earlier) / 86_400_000));
}

export function freshness(nowIso: string, thesis: Thesis): { days: number; stale: boolean; label: string } {
  const days = daysBetween(nowIso, thesis.lastReviewed);
  return {
    days,
    stale: days > thesis.staleThresholdDays,
    label: days === 0 ? "reviewed today" : `reviewed ${days}d ago`,
  };
}

export function filterEvidence(evidence: Evidence[], filter: "new" | "contradicts" | "uncertain" | "accepted" | "all"): Evidence[] {
  switch (filter) {
    case "new":
      return evidence.filter((item) => item.status === "new");
    case "contradicts":
      return evidence.filter((item) => item.classification.impact === "contradicts");
    case "uncertain":
      return evidence.filter((item) => item.uncertain || item.classification.confidence === "low");
    case "accepted":
      return evidence.filter((item) => item.status === "accepted");
    case "all":
      return evidence;
  }
}

export function newCounterEvidence(evidence: Evidence[]): Evidence[] {
  return evidence.filter((item) => item.status === "new" && item.classification.impact === "contradicts");
}

export function acceptedEvidenceForThesis(data: WorkspaceData, thesisId: string): Evidence[] {
  return data.evidence.filter((item) => item.status === "accepted" && item.classification.thesisId === thesisId);
}

export function evidenceForThesis(data: WorkspaceData, thesisId: string, status?: EvidenceStatus): Evidence[] {
  return data.evidence.filter((item) => item.classification.thesisId === thesisId && (!status || item.status === status));
}

export function watchlistWithoutThesis(data: WorkspaceData) {
  return data.assets.filter((asset) => !data.theses.some((thesis) => thesis.assetId === asset.id));
}

export function assumptionStatusCounts(thesis: Thesis): Record<AssumptionStatus, number> {
  return thesis.assumptions.reduce(
    (counts, assumption) => {
      counts[assumption.status] += 1;
      return counts;
    },
    { holding: 0, weakening: 0, broken: 0, uncertain: 0 } satisfies Record<AssumptionStatus, number>,
  );
}

export function hasCitationOrUncertainty(item: Evidence): boolean {
  return Boolean(item.citation) !== item.uncertain;
}

export function impactLabel(impact: Impact): string {
  const labels: Record<Impact, string> = {
    supports: "Supports",
    contradicts: "Counter-evidence",
    neutral: "Neutral",
    unclear: "Unclear",
  };
  return labels[impact];
}

export function statusLabel(status: AssumptionStatus): string {
  const labels: Record<AssumptionStatus, string> = {
    holding: "Holding",
    weakening: "Weakening",
    broken: "Broken",
    uncertain: "Uncertain",
  };
  return labels[status];
}

export function timeAgo(nowIso: string, thenIso: string): string {
  const days = daysBetween(nowIso, thenIso);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}
