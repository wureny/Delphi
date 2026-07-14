"use client";

/**
 * Change Inbox — the home surface. Material changes awaiting a human
 * decision against the approved investment view. Not a chat page.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FileSearch2, TriangleAlert, Eye } from "lucide-react";
import { Badge, Button, type Tone } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { useDemoStore, proposalReviewState, type ProposalReviewState } from "@/store/demo-store";
import { successProposals, degradedProposals, earningsEvent, arctCase, degradedBlockedProposalIds } from "@/fixtures/loader";
import { evidenceHealth } from "@/components/evidence/EvidenceDrawer";
import { formatDateTime, materialityTone, reviewStateMeta } from "@/lib/labels";

type InboxFilter = "all" | "needs_review" | "escalated" | "approved" | "degraded";

const FILTERS: Array<{ id: InboxFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "needs_review", label: "Needs review" },
  { id: "escalated", label: "Escalated" },
  { id: "approved", label: "Approved" },
  { id: "degraded", label: "Degraded" },
];

interface InboxRowData {
  id: string;
  kind: "review" | "degraded" | "monitoring";
  state: ProposalReviewState | "monitoring";
  stateLabel: string;
  stateTone: Tone;
  company: string;
  ticker: string;
  event: string;
  summary: string;
  materiality: "low" | "medium" | "high" | "critical";
  evidence: { available: number; total: number };
  reviewer: string;
  time: string;
  href?: string;
  cta: string;
  disabledReason?: string;
  degraded?: boolean;
}

function useInboxRows(): InboxRowData[] {
  const domain = useDemoStore((s) => s.domain);
  const transcriptUnavailable = useDemoStore((s) => s.transcriptUnavailable);

  return useMemo(() => {
    // --- Successful-run review item -------------------------------------
    const states = successProposals.map((p) => proposalReviewState(domain, p, false));
    const applied = states.filter((s) => s === "applied").length;
    const escalated = states.filter((s) => s === "escalated").length;
    const open = states.filter((s) => s === "needs_review").length;
    const successState: ProposalReviewState =
      open > 0 ? "needs_review" : applied > 0 ? "applied" : escalated > 0 ? "escalated" : "needs_review";

    const successRow: InboxRowData = {
      id: "inbox_arct_success",
      kind: "review",
      state: successState,
      stateLabel:
        successState === "needs_review"
          ? open === successProposals.length
            ? "Needs review"
            : `Needs review · ${open} open`
          : successState === "applied"
            ? "Approved · v13 recorded"
            : "Escalated to PM",
      stateTone: successState === "needs_review" ? "accent" : successState === "applied" ? "ok" : "esc",
      company: arctCase.companyName,
      ticker: arctCase.ticker,
      event: "FY2026 Q2 Earnings",
      summary: "2 pillar deltas · 1 forecast review · 1 new open question",
      materiality: "high",
      evidence: evidenceHealth(
        successProposals.flatMap((p) => p.evidenceRefs),
        transcriptUnavailable,
      ),
      reviewer: "PM (1 delta) · Analyst (3)",
      time: earningsEvent.observedAt,
      href: `/deltas/${successProposals[0]!.proposalId}`,
      cta: successState === "applied" ? "View review" : "Open review",
      degraded: false,
    };

    // --- Degraded-run item ------------------------------------------------
    const degradedStates = degradedProposals.map((p) => proposalReviewState(domain, p, transcriptUnavailable));
    const degradedOpen = degradedStates.filter((s) => s === "needs_review").length;
    const degradedRow: InboxRowData = {
      id: "inbox_arct_degraded",
      kind: "degraded",
      state: transcriptUnavailable ? (degradedOpen > 0 ? "needs_review" : "applied") : "blocked",
      stateLabel: transcriptUnavailable
        ? degradedOpen > 0
          ? "Needs review · Degraded"
          : "Reviewed · Degraded"
        : "Degraded scenario available",
      stateTone: "warn",
      company: arctCase.companyName,
      ticker: arctCase.ticker,
      event: "FY2026 Q2 Earnings: transcript unavailable",
      summary: `2 safe deltas retained · ${degradedBlockedProposalIds.length} transcript-dependent proposals blocked`,
      materiality: "medium",
      evidence: evidenceHealth(
        degradedProposals.flatMap((p) => p.evidenceRefs),
        transcriptUnavailable,
      ),
      reviewer: "Analyst · PM for blocked items",
      time: earningsEvent.observedAt,
      href: "/runs/run-arct-degraded",
      cta: transcriptUnavailable ? "Open degraded review" : "Simulate & replay",
      degraded: true,
    };

    // --- Monitoring rows (intentionally outside demo scope) ---------------
    const monitoring: InboxRowData[] = [
      {
        id: "inbox_helios",
        kind: "monitoring",
        state: "monitoring",
        stateLabel: "Monitoring",
        stateTone: "neutral",
        company: "Helios Compute",
        ticker: "HELX-DEMO",
        event: "No material changes since v8 approval",
        summary: "Next expected event: FY2026 Q3 earnings",
        materiality: "low",
        evidence: { available: 0, total: 0 },
        reviewer: "Not assigned",
        time: "2026-07-11T14:00:00Z",
        cta: "No action",
        disabledReason: "Outside the scope of this demo fixture. Only the ARCT-DEMO case is interactive.",
      },
      {
        id: "inbox_meridian_grid",
        kind: "monitoring",
        state: "monitoring",
        stateLabel: "Monitoring",
        stateTone: "neutral",
        company: "Meridian Grid Systems",
        ticker: "MGRD-DEMO",
        event: "No material changes since v15 approval",
        summary: "Watching hyperscaler capex commentary",
        materiality: "low",
        evidence: { available: 0, total: 0 },
        reviewer: "Not assigned",
        time: "2026-07-10T09:30:00Z",
        cta: "No action",
        disabledReason: "Outside the scope of this demo fixture. Only the ARCT-DEMO case is interactive.",
      },
    ];

    return [successRow, degradedRow, ...monitoring];
  }, [domain, transcriptUnavailable]);
}

function matchesFilter(row: InboxRowData, filter: InboxFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "needs_review":
      return row.state === "needs_review";
    case "escalated":
      return row.state === "escalated";
    case "approved":
      return row.state === "applied";
    case "degraded":
      return row.kind === "degraded";
  }
}

function InboxRow({ row }: { row: InboxRowData }) {
  const router = useRouter();
  const setTranscriptUnavailable = useDemoStore((s) => s.setTranscriptUnavailable);
  const transcriptUnavailable = useDemoStore((s) => s.transcriptUnavailable);
  const interactive = row.kind !== "monitoring";

  const open = () => {
    if (!row.href) return;
    if (row.kind === "degraded" && !transcriptUnavailable) setTranscriptUnavailable(true);
    router.push(row.href);
  };

  return (
    <li
      className={cn(
        "group relative border-b border-line px-5 py-4 last:border-0",
        interactive ? "cursor-pointer hover:bg-inset" : "opacity-50",
        row.state === "needs_review" && "before:absolute before:top-3 before:bottom-3 before:left-0 before:w-0.5 before:bg-accent",
        row.degraded && transcriptUnavailable && "border-l-2 border-l-warn",
      )}
      onClick={interactive ? open : undefined}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={row.stateTone} icon={row.kind === "degraded" ? <TriangleAlert size={11} aria-hidden /> : undefined}>
          {row.stateLabel}
        </Badge>
        <Badge tone={materialityTone[row.materiality]}>{row.materiality} materiality</Badge>
        {row.evidence.total > 0 && (
          <Badge tone={row.evidence.available === row.evidence.total ? "ok" : "bad"}>
            Evidence {row.evidence.available}/{row.evidence.total}
          </Badge>
        )}
        <Badge tone="warn" outlined className="hidden sm:inline-flex">
          Synthetic
        </Badge>
        <span className="w-full font-mono text-[10px] tracking-wide text-ink-3 tnum sm:ml-auto sm:w-auto">
          {formatDateTime(row.time)} UTC
        </span>
      </div>
      <div className="mt-2.5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.015em] text-ink sm:truncate">
            {row.company} <span className="font-mono text-xs font-normal text-ink-3">({row.ticker})</span>
            <span className="text-ink-2">: {row.event}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-2 sm:truncate">
            {row.summary}
            <span className="text-ink-3"> · Required reviewer: {row.reviewer}</span>
          </p>
        </div>
        {interactive ? (
          <Button
            variant={row.state === "needs_review" ? "primary" : "secondary"}
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            {row.cta}
            <ArrowRight size={13} aria-hidden />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full shrink-0 sm:w-auto" disabled title={row.disabledReason}>
            {row.cta}
          </Button>
        )}
      </div>
    </li>
  );
}

export default function ChangeInboxPage() {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const rows = useInboxRows();
  const visible = rows.filter((r) => matchesFilter(r, filter));
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.id, rows.filter((r) => matchesFilter(r, f.id)).length]),
  ) as Record<InboxFilter, number>;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line-strong pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Change Inbox</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-2">
            Material changes awaiting a human decision against the approved investment view.
          </p>
        </div>
        <p className="flex items-center gap-1.5 pb-0.5 text-[11px] text-ink-3">
          <Eye size={13} strokeWidth={1.6} aria-hidden />
          Delphi is monitoring 18 active cases
        </p>
      </header>

      <div role="group" aria-label="Inbox filters" className="mt-5 flex flex-wrap gap-6 border-b border-line">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              "relative -mb-px border-b-2 px-0.5 pb-2.5 text-[11px] font-medium",
              filter === f.id
                ? "border-accent text-ink"
                : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink",
            )}
          >
            {f.label} <span className="ml-1 font-mono text-[10px] text-ink-3 tnum">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <ul className="mt-4 overflow-hidden rounded-[3px] border border-line-strong bg-panel shadow-[0_1px_0_rgba(21,32,41,0.03)]">
        {visible.length === 0 ? (
          <li className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <FileSearch2 size={22} className="text-ink-3" aria-hidden />
            <p className="text-sm font-medium text-ink">No material changes need your review.</p>
            <p className="text-[13px] text-ink-3">
              Delphi is monitoring 18 active cases. New earnings events will appear here with cited thesis deltas.
            </p>
          </li>
        ) : (
          visible.map((row) => <InboxRow key={row.id} row={row} />)
        )}
      </ul>

      <p className="mt-4 max-w-3xl text-[10px] leading-relaxed text-ink-3">
        All companies, events, figures, and statements are synthetic.{" "}
        <Link href="/trust" className="text-accent hover:underline">
          See the Privacy Receipt
        </Link>{" "}
        for what this demo does and does not do. Not investment advice.
      </p>
    </div>
  );
}
