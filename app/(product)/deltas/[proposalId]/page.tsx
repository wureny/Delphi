"use client";

/**
 * Delta Review — structured, cited Thesis Delta Proposals with the full
 * human review action set. Only approved actions ever reach the gateway.
 */
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, TriangleAlert } from "lucide-react";
import { Badge, InlineAlert } from "@/components/ui/primitives";
import { DeltaCard } from "@/components/deltas/DeltaCard";
import { ApplyBar } from "@/components/deltas/ApplyBar";
import { EvidenceDrawer, evidenceHealth } from "@/components/evidence/EvidenceDrawer";
import { proposalReviewState, useDemoStore } from "@/store/demo-store";
import {
  getProposal,
  proposalsForRun,
  successProposals,
  degradedBlockedProposalIds,
  getRunBundle,
  earningsEvent,
  defaultEvent,
  defaultCase,
  getCase,
} from "@/fixtures/loader";
import { formatDateTime, runIdToSlug, runStatusMeta } from "@/lib/labels";

export default function DeltaReviewPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = use(params);
  const transcriptUnavailable = useDemoStore((s) => s.transcriptUnavailable);
  const setTranscriptUnavailable = useDemoStore((s) => s.setTranscriptUnavailable);
  const defaultDomain = useDemoStore((s) => s.domain);
  const arctDomain = useDemoStore((s) => s.arctDomain);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  const focusedProposal = getProposal(proposalId);
  const isFirstCard = focusedProposal ? proposalsForRun(focusedProposal.runId)[0]?.proposalId === proposalId : true;
  const isDegradedRun = focusedProposal
    ? getRunBundle(focusedProposal.runId)?.workflowRun.status === "degraded"
    : false;

  useEffect(() => {
    // Keep the review header visible when the focused card is already first.
    if (!isFirstCard) focusRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [proposalId, isFirstCard]);

  useEffect(() => {
    // The degraded run happened in a world where the transcript was
    // unavailable. Deep-linking into its review activates the simulation so
    // blocked proposals actually fail closed.
    if (isDegradedRun && !transcriptUnavailable) setTranscriptUnavailable(true);
  }, [isDegradedRun, transcriptUnavailable, setTranscriptUnavailable]);

  if (!focusedProposal) notFound();

  const runId = focusedProposal.runId;
  const investmentCase = getCase(focusedProposal.caseId);
  if (!investmentCase) notFound();
  const isDefaultCase = focusedProposal.caseId === defaultCase.caseId;
  const domain = isDefaultCase ? defaultDomain : arctDomain;
  const version = domain.currentThesis.version;
  const event = isDefaultCase ? defaultEvent : earningsEvent;

  // Cards for this review context. In the degraded run, the safe proposals are
  // shown alongside the transcript-dependent proposals that policy blocked.
  const runProposals = proposalsForRun(runId);
  const blockedExtras = isDegradedRun
    ? successProposals.filter((p) => degradedBlockedProposalIds.includes(p.proposalId))
    : [];
  const cards = [...runProposals, ...blockedExtras];

  const statusMeta = runStatusMeta[getRunBundle(runId)!.workflowRun.status];
  const health = evidenceHealth(
    cards.flatMap((p) => p.evidenceRefs),
    transcriptUnavailable,
  );
  const reviewStates = cards.map((proposal) => proposalReviewState(domain, proposal, transcriptUnavailable));
  const completedReviews = reviewStates.filter((state) => !["needs_review", "blocked"].includes(state)).length;
  const unresolvedHighMateriality = cards.filter(
    (proposal, index) =>
      ["high", "critical"].includes(proposal.materiality) &&
      ["needs_review", "blocked"].includes(reviewStates[index] ?? "needs_review"),
  ).length;
  const progress = cards.length > 0 ? Math.round((completedReviews / cards.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <Link href="/demo" className="flex w-fit items-center gap-1 text-xs text-ink-3 hover:text-ink">
        <ArrowLeft size={12} aria-hidden />
        Change Inbox
      </Link>

      <header className="mt-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-ink">
            {investmentCase.companyName} <span className="font-mono text-sm font-normal text-ink-3">({investmentCase.ticker})</span>
          </h1>
          <Badge tone={statusMeta.tone} icon={statusMeta.icon}>
            Run {statusMeta.label}
          </Badge>
          <Badge tone="ok">Approved v{version}</Badge>
          <Badge tone="accent" outlined>
            Proposed v{version + 1}
          </Badge>
          <Badge tone={health.available === health.total ? "ok" : "bad"}>
            Evidence {health.available}/{health.total}
          </Badge>
          <Badge tone={isDefaultCase ? "ok" : "warn"} outlined>
            {isDefaultCase ? "Real event · demo thesis" : "Synthetic fallback"}
          </Badge>
        </div>
        <p className="mt-1 text-[13px] text-ink-2">
          {event.title} · observed {formatDateTime(event.observedAt)} UTC ·{" "}
          <Link href={`/runs/${runIdToSlug[runId]}`} className="inline-flex items-center gap-1 text-accent hover:underline">
            <Activity size={12} aria-hidden />
            Run Observatory
          </Link>{" "}
          ·{" "}
          <Link href={`/cases/${isDefaultCase ? "msft-fy25q4" : "arct-demo"}`} className="text-accent hover:underline">
            Investment case
          </Link>
        </p>
      </header>

      {isDegradedRun && (
        <InlineAlert tone="warn" icon={<TriangleAlert size={14} aria-hidden />} className="mt-3">
          <strong>Degraded analysis.</strong> The earnings-call transcript was unavailable. Safe partial findings are
          retained below; {blockedExtras.length} transcript-dependent proposal{blockedExtras.length === 1 ? " is" : "s are"}{" "}
          blocked and cannot be approved until the source is restored or a PM reviews the escalation.
        </InlineAlert>
      )}

      <div className="mt-4 mb-2 rounded-[3px] border border-line bg-panel px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-ink-2">Review progress · {completedReviews} of {cards.length} decisions recorded · {unresolvedHighMateriality} unresolved high-materiality</span>
          <span className="font-mono text-ink-3 tnum">{progress}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-inset" role="progressbar" aria-label="Review progress" aria-valuenow={completedReviews} aria-valuemin={0} aria-valuemax={cards.length}>
          <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-ink-3">The focused proposal is expanded; other proposals start collapsed. Only authorized reviews can mutate approved state.</p>
      </div>

      <div className="space-y-3">
        {cards.map((p) => (
          <div key={p.proposalId} ref={p.proposalId === proposalId ? focusRef : undefined} className="scroll-mt-16">
            <DeltaCard proposal={p} focused={p.proposalId === proposalId} onOpenEvidence={setEvidenceId} />
          </div>
        ))}
      </div>

      <ApplyBar runId={runId} proposalIds={cards.map((p) => p.proposalId)} />
      <EvidenceDrawer excerptId={evidenceId} onClose={() => setEvidenceId(null)} />
    </div>
  );
}
