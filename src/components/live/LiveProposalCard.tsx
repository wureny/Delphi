"use client";

/**
 * Review card for a live-run proposal. Every cited quote was verified
 * verbatim against its excerpt before this card could render; the actions
 * delegate to the transition gateway, which owns authorization.
 */
import { useMemo, useState } from "react";
import { ArrowUpCircle, Check, ChevronDown, Clock4, ExternalLink, Quote, X } from "lucide-react";
import { Badge, Button, Field, InlineAlert, Modal, inputClass } from "@/components/ui/primitives";
import { useToasts } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { deltaTypeLabel, describePatchOp, materialityTone, reviewStateMeta } from "@/lib/labels";
import { REJECT_REASONS } from "@/domain/policies";
import { appliedProposalIds, latestReviewFor } from "@/domain/transitions";
import type { DomainState, ThesisDeltaProposal, ThesisSnapshot } from "@/domain/types";
import type { LiveRunResult } from "@/engine/analysis/run";
import { stripHandles } from "@/engine/analysis/prompt";
import type { ProposalReviewState } from "@/store/demo-store";
import { useLiveStore, type LiveReviewCommand } from "@/store/live-store";
import { useDemoStore } from "@/store/demo-store";

export function liveReviewState(domain: DomainState, proposalId: string): ProposalReviewState {
  if (appliedProposalIds(domain).has(proposalId)) return "applied";
  const review = latestReviewFor(domain, proposalId);
  if (!review) return "needs_review";
  return review.action === "accept"
    ? "accepted"
    : review.action === "edit"
      ? "edited"
      : review.action === "reject"
        ? "rejected"
        : review.action === "escalate"
          ? "escalated"
          : "deferred";
}

export function thesisLookup(thesis: ThesisSnapshot) {
  return {
    pillarTitle: (id: string) => thesis.pillars.find((p) => p.pillarId === id)?.title ?? id,
    forecastMetric: (id: string) => thesis.forecasts.find((f) => f.forecastId === id)?.metric ?? id,
    riskTitle: (id: string) => thesis.risks.find((r) => r.riskId === id)?.title ?? id,
  };
}

/** Human label for any thesis object ID. */
export function objectLabel(thesis: ThesisSnapshot, id: string): string {
  return (
    thesis.pillars.find((p) => p.pillarId === id)?.title ??
    thesis.forecasts.find((f) => f.forecastId === id)?.metric ??
    thesis.risks.find((r) => r.riskId === id)?.title ??
    thesis.openQuestions.find((q) => q.questionId === id)?.question ??
    thesis.catalysts.find((c) => c.catalystId === id)?.title ??
    id
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">{label}</h4>
      <div className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}

export function EvidenceQuotes({ result, proposalId }: { result: LiveRunResult; proposalId: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const index = useMemo(() => {
    const m = new Map<string, { text: string; title: string; url?: string; external: boolean }>();
    for (const b of result.sources) {
      for (const e of b.excerpts) {
        m.set(e.excerptId, {
          text: e.text,
          title: b.sourceDocument.title,
          url: b.sourceDocument.canonicalUri,
          external: b.sourceDocument.originKind === "real_public",
        });
      }
    }
    return m;
  }, [result.sources]);
  const quotes = result.citedQuotes[proposalId] ?? [];

  return (
    <ul className="space-y-1.5">
      {quotes.map((q, i) => {
        const ex = index.get(q.excerptId);
        const key = `${q.excerptId}-${i}`;
        return (
          <li key={key} className="rounded-[3px] border border-line bg-inset px-2.5 py-2">
            <div className="flex items-start gap-2">
              <Quote size={12} aria-hidden className={cn("mt-0.5 shrink-0", ex?.external ? "text-accent" : "text-ink-3")} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-relaxed text-ink">“{q.quote}”</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-ink-3">
                  <Badge tone={ex?.external ? "ok" : "neutral"}>{ex?.external ? "SEC filing" : "Approved thesis"}</Badge>
                  <span className="truncate">{ex?.title}</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-ink-2 hover:text-ink"
                    aria-expanded={open === key}
                    onClick={() => setOpen(open === key ? null : key)}
                  >
                    Full excerpt <ChevronDown size={11} aria-hidden className={cn(open === key && "rotate-180")} />
                  </button>
                  {ex?.external && ex.url && (
                    <a href={ex.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-accent hover:underline">
                      Filing <ExternalLink size={10} aria-hidden />
                    </a>
                  )}
                </div>
                {open === key && ex && (
                  <pre className="mt-1.5 max-h-56 overflow-auto rounded-[3px] border border-line bg-panel p-2 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap text-ink-2">
                    {ex.text}
                  </pre>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function LiveProposalCard({
  runId,
  result,
  proposal,
  domain,
}: {
  runId: string;
  result: LiveRunResult;
  proposal: ThesisDeltaProposal;
  domain: DomainState;
}) {
  const role = useDemoStore((s) => s.role);
  const review = useLiveStore((s) => s.review);
  const push = useToasts((s) => s.push);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<string>(REJECT_REASONS[0].code);
  const [note, setNote] = useState("");

  const state = liveReviewState(domain, proposal.proposalId);
  const meta = reviewStateMeta[state];
  const lookup = thesisLookup(domain.currentThesis);
  const closed = state === "applied" || state === "rejected";
  const warnings = result.proposalWarnings[proposal.proposalId] ?? [];

  const act = (command: LiveReviewCommand, success: string) => {
    const outcome = review(runId, role, command);
    if (outcome.status === "rejected") {
      push({ tone: "bad", title: "Not permitted", detail: outcome.messages[0]?.message });
      return false;
    }
    push({ tone: "ok", title: success });
    return true;
  };

  return (
    <article className="rounded-[3px] border border-line bg-panel" aria-labelledby={`${proposal.proposalId}-h`}>
      <header className="flex flex-wrap items-center gap-1.5 border-b border-line bg-inset px-3 py-2">
        <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>
        <Badge tone={materialityTone[proposal.materiality]}>{proposal.materiality} materiality</Badge>
        <Badge tone="neutral">{deltaTypeLabel[proposal.deltaType] ?? proposal.deltaType}</Badge>
        <Badge tone={proposal.requiredReviewerRole === "pm" ? "esc" : "neutral"}>
          Requires {proposal.requiredReviewerRole.toUpperCase()}
        </Badge>
        <Badge tone="neutral">{proposal.confidence} confidence</Badge>
      </header>
      <div className="space-y-3 p-3">
        <h3 id={`${proposal.proposalId}-h`} className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {proposal.headline}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Section label="What changed">{stripHandles(proposal.whatChanged)}</Section>
          <Section label="Against our view">{stripHandles(proposal.againstOurView)}</Section>
          <Section label="Why it matters">{stripHandles(proposal.whyItMatters)}</Section>
          <Section label="Follow-up">{stripHandles(proposal.recommendedFollowUp)}</Section>
        </div>
        {proposal.uncertainties.length > 0 && (
          <Section label="Uncertainties">
            <ul className="list-disc space-y-0.5 pl-4">
              {proposal.uncertainties.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </Section>
        )}
        <Section label="Proposed change to approved thesis">
          <ul className="space-y-0.5 font-mono text-[11.5px] text-ink">
            {proposal.proposedPatch.map((op) => (
              <li key={op.path}>{describePatchOp(op as { op: string; path: string; value?: unknown }, lookup)}</li>
            ))}
          </ul>
        </Section>
        <Section label={`Evidence · ${result.citedQuotes[proposal.proposalId]?.length ?? 0} verified quotes`}>
          <EvidenceQuotes result={result} proposalId={proposal.proposalId} />
        </Section>
        {warnings.length > 0 && (
          <InlineAlert tone="warn">{warnings.map((w) => w.message).join(" ")}</InlineAlert>
        )}
      </div>
      {!closed && (
        <footer className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
          <Button variant="primary" size="sm" onClick={() => act({ proposalId: proposal.proposalId, action: "accept" }, "Approved — apply to create a new thesis version")}>
            <Check size={13} aria-hidden /> Accept
          </Button>
          <Button size="sm" onClick={() => setRejectOpen(true)}>
            <X size={13} aria-hidden /> Reject
          </Button>
          <Button size="sm" onClick={() => act({ proposalId: proposal.proposalId, action: "escalate" }, "Escalated to PM")}>
            <ArrowUpCircle size={13} aria-hidden /> Escalate
          </Button>
          <Button size="sm" variant="ghost" onClick={() => act({ proposalId: proposal.proposalId, action: "defer" }, "Deferred for 7 days")}>
            <Clock4 size={13} aria-hidden /> Defer
          </Button>
        </footer>
      )}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject proposal"
        footer={
          <>
            <Button size="sm" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (act({ proposalId: proposal.proposalId, action: "reject", reasonCode: reason, note: note || undefined }, "Rejected — recorded in review history")) {
                  setRejectOpen(false);
                }
              }}
            >
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Reason" htmlFor="reject-reason">
            <select id="reject-reason" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
              {REJECT_REASONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Note (optional)" htmlFor="reject-note" hint="Recorded in this run's review history.">
            <textarea id="reject-note" rows={3} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </article>
  );
}
