/**
 * Shared label, formatting, and status-semantics helpers.
 * Status is always icon + text; color reinforces but never carries meaning alone.
 */
import {
  ArrowUpRight,
  ArrowDownRight,
  CircleHelp,
  FileSearch,
  CheckCircle2,
  PencilLine,
  XCircle,
  ArrowUpCircle,
  Clock4,
  ShieldAlert,
  CircleDot,
  AlertTriangle,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Materiality, Confidence, ThesisDeltaProposal, RunStatus } from "@/domain/types";
import type { Tone } from "@/components/ui/primitives";
import type { ProposalReviewState } from "@/store/demo-store";

export const runSlugToId: Record<string, string> = {
  "run-arct-success": "run_arct_success_001",
  "run-arct-degraded": "run_arct_degraded_001",
  run_arct_success_001: "run_arct_success_001",
  run_arct_degraded_001: "run_arct_degraded_001",
};

export const runIdToSlug: Record<string, string> = {
  run_arct_success_001: "run-arct-success",
  run_arct_degraded_001: "run-arct-degraded",
};

export const caseSlugToId: Record<string, string> = {
  "arct-demo": "case_arct_001",
  case_arct_001: "case_arct_001",
};

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const materialityTone: Record<Materiality, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warn",
  critical: "bad",
};

export const confidenceLabel: Record<Confidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

/** Direction of a delta relative to the approved view. */
export function proposalDirection(p: ThesisDeltaProposal): { label: string; tone: Tone; icon: ReactNode } {
  if (p.deltaType === "thesis_pillar_update") {
    const weakens = p.proposedPatch.some(
      (op) => op.op === "replace" && op.path.endsWith("/status") && op.value === "weakened",
    );
    return weakens
      ? { label: "Weakens", tone: "warn", icon: <ArrowDownRight size={12} aria-hidden /> }
      : { label: "Supports", tone: "ok", icon: <ArrowUpRight size={12} aria-hidden /> };
  }
  if (p.deltaType === "forecast_review" || p.deltaType === "forecast_update") {
    return { label: "Forecast review", tone: "info", icon: <FileSearch size={12} aria-hidden /> };
  }
  return { label: "New open question", tone: "esc", icon: <CircleHelp size={12} aria-hidden /> };
}

export const deltaTypeLabel: Record<string, string> = {
  thesis_pillar_update: "Thesis pillar",
  forecast_review: "Forecast",
  forecast_update: "Forecast",
  open_question_create: "Open question",
  open_question: "Open question",
  risk_update: "Risk",
};

export const reviewStateMeta: Record<ProposalReviewState, { label: string; tone: Tone; icon: ReactNode }> = {
  needs_review: { label: "Needs review", tone: "accent", icon: <CircleDot size={12} aria-hidden /> },
  accepted: { label: "Accepted", tone: "ok", icon: <CheckCircle2 size={12} aria-hidden /> },
  edited: { label: "Edited & approved", tone: "ok", icon: <PencilLine size={12} aria-hidden /> },
  rejected: { label: "Rejected", tone: "bad", icon: <XCircle size={12} aria-hidden /> },
  escalated: { label: "Escalated to PM", tone: "esc", icon: <ArrowUpCircle size={12} aria-hidden /> },
  deferred: { label: "Deferred", tone: "neutral", icon: <Clock4 size={12} aria-hidden /> },
  applied: { label: "Applied", tone: "ok", icon: <CheckCircle2 size={12} aria-hidden /> },
  blocked: { label: "Blocked — evidence insufficient", tone: "bad", icon: <ShieldAlert size={12} aria-hidden /> },
};

export const runStatusMeta: Record<RunStatus, { label: string; tone: Tone; icon: ReactNode }> = {
  queued: { label: "Queued", tone: "neutral", icon: <Clock4 size={12} aria-hidden /> },
  running: { label: "Running", tone: "accent", icon: <CircleDot size={12} aria-hidden /> },
  completed: { label: "Completed", tone: "ok", icon: <CheckCircle2 size={12} aria-hidden /> },
  degraded: { label: "Degraded", tone: "warn", icon: <AlertTriangle size={12} aria-hidden /> },
  failed: { label: "Failed", tone: "bad", icon: <XCircle size={12} aria-hidden /> },
};

/** Human-readable description of one semantic patch operation. */
export function describePatchOp(
  op: { op: string; path: string; value?: unknown },
  lookup: { pillarTitle: (id: string) => string; forecastMetric: (id: string) => string; riskTitle: (id: string) => string },
): string {
  const segments = op.path.split("/").filter(Boolean);
  if (op.op === "add" && segments[0] === "openQuestions") {
    const q = op.value as { question?: string } | undefined;
    return `Add open question: “${q?.question ?? "…"}”`;
  }
  const [collection, id, field] = segments as [string, string, string];
  const name =
    collection === "pillars"
      ? `pillar “${lookup.pillarTitle(id)}”`
      : collection === "forecasts"
        ? `forecast “${lookup.forecastMetric(id)}”`
        : collection === "risks"
          ? `risk “${lookup.riskTitle(id)}”`
          : `${collection}/${id}`;
  const fieldLabel = field === "teamConviction" ? "team conviction" : field.replace(/_/g, " ");
  return `Set ${name} ${fieldLabel} → ${String(op.value).replace(/_/g, " ")}`;
}
