"use client";

/**
 * Investment Case — the approved institutional state. Everything on this page
 * is "Approved team state" unless explicitly marked as a pending agent
 * proposal (dashed outline).
 */
import { use, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, GitCompareArrows, History } from "lucide-react";
import { Badge, Button, Panel, Kv } from "@/components/ui/primitives";
import { EvidenceDrawer, EvidenceChips } from "@/components/evidence/EvidenceDrawer";
import { useDemoStore, proposalReviewState } from "@/store/demo-store";
import { arctCase, successProposals, thesisV12 } from "@/fixtures/loader";
import { caseSlugToId, formatDate, formatDateTime, proposalDirection, reviewStateMeta } from "@/lib/labels";
import type { ThesisDeltaProposal } from "@/domain/types";

function PendingProposalChip({ proposal }: { proposal: ThesisDeltaProposal }) {
  const direction = proposalDirection(proposal);
  return (
    <Link href={`/deltas/${proposal.proposalId}`} className="inline-flex" title={proposal.headline}>
      <Badge tone={direction.tone} outlined icon={direction.icon}>
        Agent proposal — {direction.label}
      </Badge>
    </Link>
  );
}

const convictionTone = { low: "warn", medium: "info", high: "ok" } as const;
const objectStatusTone: Record<string, "ok" | "warn" | "bad" | "neutral" | "info"> = {
  active: "ok",
  open: "neutral",
  weakened: "warn",
  strengthened: "ok",
  increasing: "warn",
  decreasing: "info",
  review_required: "warn",
  closed: "neutral",
};

export default function InvestmentCasePage({ params }: { params: Promise<{ caseSlug: string }> }) {
  const { caseSlug } = use(params);
  const domain = useDemoStore((s) => s.domain);
  const transcriptUnavailable = useDemoStore((s) => s.transcriptUnavailable);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);

  const caseId = caseSlugToId[caseSlug];
  const thesis = domain.currentThesis;

  const pendingByTarget = useMemo(() => {
    const map = new Map<string, ThesisDeltaProposal[]>();
    for (const p of successProposals) {
      const state = proposalReviewState(domain, p, transcriptUnavailable);
      if (state === "needs_review" || state === "escalated" || state === "deferred" || state === "blocked") {
        const key = p.targetObjectId ?? "thesis";
        map.set(key, [...(map.get(key) ?? []), p]);
      }
    }
    return map;
  }, [domain, transcriptUnavailable]);

  if (!caseId) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-ink">{arctCase.companyName}</h1>
            <span className="font-mono text-sm text-ink-3">{arctCase.ticker}</span>
            <Badge tone="ok">Approved team state · v{thesis.version}</Badge>
            <Badge tone="warn" outlined>
              Synthetic
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-ink-2">
            {arctCase.sector} · {arctCase.horizon} horizon · Owner <span className="text-ink">A. Chen (Analyst)</span> ·
            Approved by <span className="text-ink">R. Okafor (PM)</span> · {formatDate(thesis.approvedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ledger">
            <Button size="sm">
              <GitCompareArrows size={13} aria-hidden />
              Version history
            </Button>
          </Link>
          <Link href={`/deltas/${successProposals[0]!.proposalId}`}>
            <Button variant="primary" size="sm">
              Open latest event
              <ArrowRight size={13} aria-hidden />
            </Button>
          </Link>
        </div>
      </header>

      {/* Summary */}
      <Panel title="Approved thesis summary" className="mt-4">
        <p className="text-[14px] leading-relaxed text-ink">{thesis.summary}</p>
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {/* Pillars */}
        <div className="space-y-3 lg:col-span-2">
          <Panel title={`Thesis pillars (${thesis.pillars.length})`} bodyClassName="space-y-2 p-2">
            {thesis.pillars.map((pillar, i) => (
              <article key={pillar.pillarId} className="rounded-sm border border-line bg-inset p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] text-ink-3">Pillar {String(i + 1).padStart(2, "0")}</span>
                  <Badge tone={objectStatusTone[pillar.status] ?? "neutral"}>{pillar.status.replace(/_/g, " ")}</Badge>
                  <Badge tone={convictionTone[pillar.teamConviction]}>Team conviction: {pillar.teamConviction}</Badge>
                  <span className="ml-auto flex gap-1.5">
                    {(pendingByTarget.get(pillar.pillarId) ?? []).map((p) => (
                      <PendingProposalChip key={p.proposalId} proposal={p} />
                    ))}
                  </span>
                </div>
                <h3 className="mt-1.5 text-[14px] font-semibold text-ink">{pillar.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{pillar.statement}</p>
                <div className="mt-2">
                  <EvidenceChips refs={pillar.evidenceRefs} onOpen={setEvidenceId} />
                </div>
              </article>
            ))}
          </Panel>

          {/* Forecasts */}
          <Panel title={`Forecasts (${thesis.forecasts.length})`} bodyClassName="p-0">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-3">
                  <th className="px-3 py-2 font-medium">Metric</th>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 text-right font-medium">Base case</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium" aria-label="Proposals" />
                </tr>
              </thead>
              <tbody>
                {thesis.forecasts.map((f) => (
                  <tr key={f.forecastId} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2 text-ink">{f.metric}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink-2 tnum">{f.period}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-ink tnum">
                      {f.value !== undefined
                        ? `${f.currency === "USD" ? "$" : ""}${f.value}${f.unit === "percent" ? "%" : f.unit === "million" ? "M" : ""}`
                        : `${f.minValue}–${f.maxValue}${f.unit === "percent" ? "%" : ""}`}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={objectStatusTone[f.status] ?? "neutral"}>{f.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(pendingByTarget.get(f.forecastId) ?? []).map((p) => (
                        <PendingProposalChip key={p.proposalId} proposal={p} />
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <Panel title="Approval metadata">
            <dl>
              <Kv label="Approved version" mono>
                v{thesis.version}
              </Kv>
              <Kv label="Status">
                <Badge tone="ok">{thesis.status}</Badge>
              </Kv>
              <Kv label="Owner">A. Chen — Analyst</Kv>
              <Kv label="Approved by">R. Okafor — PM</Kv>
              <Kv label="Approved at (UTC)">{formatDateTime(thesis.approvedAt)}</Kv>
              <Kv label="Valid from (UTC)">{formatDateTime(thesis.validFrom)}</Kv>
            </dl>
          </Panel>

          <Panel title={`Risks (${thesis.risks.length})`} bodyClassName="space-y-2">
            {thesis.risks.map((r) => (
              <div key={r.riskId} className="rounded-sm border border-line bg-inset p-2.5">
                <div className="flex items-center gap-1.5">
                  <Badge tone={r.severity === "high" || r.severity === "critical" ? "bad" : "warn"}>{r.severity}</Badge>
                  <Badge tone={objectStatusTone[r.status] ?? "neutral"}>{r.status}</Badge>
                </div>
                <p className="mt-1 text-[13px] font-medium text-ink">{r.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{r.description}</p>
              </div>
            ))}
          </Panel>

          <Panel title={`Open questions (${thesis.openQuestions.length})`} bodyClassName="space-y-2">
            {thesis.openQuestions.map((q) => (
              <div key={q.questionId} className="rounded-sm border border-line bg-inset p-2.5">
                <div className="flex items-center gap-1.5">
                  <Badge tone={objectStatusTone[q.status] ?? "neutral"}>{q.status}</Badge>
                  {q.evidenceRefs.length > 0 && <Badge tone="info">{q.evidenceRefs.length} evidence</Badge>}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink">{q.question}</p>
              </div>
            ))}
          </Panel>

          <Panel title="Recent history" bodyClassName="space-y-0">
            <ol className="relative space-y-3 before:absolute before:top-1 before:bottom-1 before:left-[5px] before:w-px before:bg-line">
              {[...domain.transitions].reverse().map((t) => (
                <li key={t.transitionId} className="relative pl-5">
                  <span
                    className={`absolute top-1 left-0 size-2.5 rounded-full border-2 ${t.status === "applied" ? "border-ok bg-ok-dim" : "border-ink-3 bg-panel"}`}
                    aria-hidden
                  />
                  <Link href={`/ledger/${t.transitionId}`} className="group block">
                    <p className="text-[13px] text-ink group-hover:text-accent">
                      v{t.fromVersion} → v{t.toVersion} {t.status === "rolled_back" && "(rolled back)"}
                    </p>
                    <p className="text-xs text-ink-3">
                      {t.proposalIds.length} change{t.proposalIds.length === 1 ? "" : "s"} ·{" "}
                      {formatDateTime(t.approvedAt)} UTC
                    </p>
                  </Link>
                </li>
              ))}
              <li className="relative pl-5">
                <span className="absolute top-1 left-0 size-2.5 rounded-full border-2 border-ok bg-ok-dim" aria-hidden />
                <p className="text-[13px] text-ink">v{thesisV12.version} approved</p>
                <p className="text-xs text-ink-3">Quarterly review · {formatDateTime(thesisV12.approvedAt)} UTC</p>
              </li>
              <li className="relative pl-5">
                <span className="absolute top-1 left-0 size-2.5 rounded-full border-2 border-ink-3 bg-panel" aria-hidden />
                <p className="text-[13px] text-ink-2">v11 superseded</p>
                <p className="text-xs text-ink-3">Prior review cycle · May 2026 (not in fixture)</p>
              </li>
            </ol>
            <div className="mt-3 border-t border-line pt-2">
              <Link href="/ledger" className="flex items-center gap-1 text-xs text-accent hover:underline">
                <History size={12} aria-hidden />
                Full Decision Ledger
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <EvidenceDrawer excerptId={evidenceId} onClose={() => setEvidenceId(null)} />
    </div>
  );
}
