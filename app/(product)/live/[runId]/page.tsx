"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, ChevronDown, ExternalLink, GitCommitHorizontal, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge, Button, InlineAlert, Panel } from "@/components/ui/primitives";
import { useToasts } from "@/components/ui/toast";
import { LiveProposalCard, liveReviewState, objectLabel, thesisLookup } from "@/components/live/LiveProposalCard";
import { cn } from "@/lib/cn";
import { describePatchOp, formatDateTime, runStatusMeta } from "@/lib/labels";
import { diffThesis } from "@/lib/diff";
import { stripHandles } from "@/engine/analysis/prompt";
import { pendingApprovals } from "@/domain/transitions";
import { useDemoStore } from "@/store/demo-store";
import { proposalsIndex, useLiveStore } from "@/store/live-store";

export default function LiveRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params);
  const ws = useLiveStore((s) => s.workspaces[runId]);
  const apply = useLiveStore((s) => s.apply);
  const role = useDemoStore((s) => s.role);
  const push = useToasts((s) => s.push);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const pending = useMemo(() => (ws ? pendingApprovals(ws.domain, proposalsIndex(ws.result)) : []), [ws]);

  if (!ws) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <InlineAlert tone="warn">This live run is not saved in this browser.</InlineAlert>
        <Link href="/live" className="mt-3 inline-block text-xs text-accent">← Back to Live Desk</Link>
      </div>
    );
  }

  const { result, domain } = ws;
  const wf = result.run.workflowRun;
  const statusMeta = runStatusMeta[wf.status];
  const secs = (Date.parse(wf.completedAt ?? wf.startedAt) - Date.parse(wf.startedAt)) / 1000;
  const release = result.sources.find((b) => b.sourceDocument.originKind === "real_public")?.sourceDocument;
  const counts = result.proposals.reduce<Record<string, number>>((acc, p) => {
    const st = liveReviewState(domain, p.proposalId);
    acc[st] = (acc[st] ?? 0) + 1;
    return acc;
  }, {});

  const onApply = () => {
    const outcome = apply(runId, role);
    if (outcome.status === "rejected") {
      push({ tone: "bad", title: "Could not apply", detail: outcome.messages[0]?.message });
    } else {
      const t = outcome.value!.transition;
      push({ tone: "ok", title: `Thesis v${t.fromVersion} → v${t.toVersion} recorded`, detail: `${t.proposalIds.length} approved changes applied.` });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <Link href="/live" className="inline-flex items-center gap-1 text-xs text-ink-2 hover:text-ink">
        <ArrowLeft size={12} aria-hidden /> Live Desk
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{result.event.title}</h1>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="ok">Real SEC filing</Badge>
        <Badge tone="warn" outlined>Demo-authored thesis v{result.baselineThesis.version}</Badge>
        <Badge tone={statusMeta.tone} icon={statusMeta.icon}>{wf.status === "degraded" ? "Release only — transcript not ingested" : statusMeta.label}</Badge>
        <Badge tone="neutral">{wf.modelRoutes[0]?.provider}/{wf.modelRoutes[0]?.model}</Badge>
        <Badge tone="neutral">Analysis {secs.toFixed(0)}s</Badge>
        {release?.canonicalUri && (
          <a href={release.canonicalUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline">
            Open filing <ExternalLink size={11} aria-hidden />
          </a>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Brief">
            <p className="text-[13px] leading-relaxed text-ink">{stripHandles(result.eventSummary)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["To review", counts.needs_review ?? 0, "text-accent"],
                  ["Approved", (counts.accepted ?? 0) + (counts.edited ?? 0), "text-ok"],
                  ["Escalated", counts.escalated ?? 0, "text-esc"],
                  ["Blocked by validators", result.blockedProposals.length, "text-bad"],
                ] as const
              ).map(([label, n, toneClass]) => (
                <div key={label} className="rounded-[3px] border border-line bg-inset px-2.5 py-2">
                  <div className={cn("font-mono text-lg font-semibold", toneClass)}>{n}</div>
                  <div className="text-[10px] text-ink-3">{label}</div>
                </div>
              ))}
            </div>
          </Panel>

          {result.proposals.map((p) => (
            <LiveProposalCard key={p.proposalId} runId={runId} result={result} proposal={p} domain={domain} />
          ))}

          {result.blockedProposals.length > 0 && (
            <Panel
              title={`Blocked by validators · ${result.blockedProposals.length}`}
              actions={
                <Button size="sm" variant="ghost" aria-expanded={showBlocked} onClick={() => setShowBlocked(!showBlocked)}>
                  {showBlocked ? "Hide" : "Show"} <ChevronDown size={12} aria-hidden className={cn(showBlocked && "rotate-180")} />
                </Button>
              }
            >
              <p className="text-xs text-ink-2">
                The model proposed these, but they failed verification (quote not found in the filing, ungrounded number, or a disallowed change). They can never be approved.
              </p>
              {showBlocked && (
                <ul className="mt-2 space-y-2">
                  {result.blockedProposals.map((b) => (
                    <li key={b.proposal.proposalId} className="rounded-[3px] border border-bad/25 bg-bad-dim/40 px-3 py-2">
                      <div className="text-xs font-semibold text-ink">{b.proposal.headline}</div>
                      <ul className="mt-1 space-y-0.5">
                        {b.messages.filter((m) => m.severity === "error").map((m, i) => (
                          <li key={i} className="flex gap-1.5 text-[11px] text-bad">
                            <ShieldAlert size={11} aria-hidden className="mt-0.5 shrink-0" />
                            <span><span className="font-mono">{m.code}</span> — {m.message}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {result.coverageGaps.length > 0 && (
            <Panel title="Not resolvable from this filing">
              <ul className="space-y-1.5">
                {result.coverageGaps.map((g) => (
                  <li key={g.objectId} className="flex gap-2 text-xs">
                    <TriangleAlert size={12} aria-hidden className="mt-0.5 shrink-0 text-warn" />
                    <span className="text-ink-2">
                      <span className="font-medium text-ink">{objectLabel(result.baselineThesis, g.objectId)}</span>{" "}
                      — {stripHandles(g.reason)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel title="Apply to thesis">
            <p className="text-xs text-ink-2">
              Approved thesis is <span className="font-semibold text-ink">v{domain.currentThesis.version}</span>.{" "}
              {pending.length > 0 ? `${pending.length} approved change${pending.length > 1 ? "s" : ""} waiting.` : "Nothing approved yet."}
            </p>
            {pending.length > 0 && (
              <ul className="mt-2 space-y-0.5 font-mono text-[10.5px] text-ink-2">
                {pending.flatMap((p) => p.patch.map((op) => (
                  <li key={`${p.proposal.proposalId}${op.path}`}>{describePatchOp(op as { op: string; path: string; value?: unknown }, thesisLookup(domain.currentThesis))}</li>
                )))}
              </ul>
            )}
            <Button variant="primary" size="sm" className="mt-3 w-full" disabled={pending.length === 0} onClick={onApply}>
              <GitCommitHorizontal size={13} aria-hidden />
              Apply → v{domain.currentThesis.version + 1}
            </Button>
          </Panel>

          <Panel title="Decision ledger (this run)">
            {domain.transitions.length === 0 ? (
              <p className="text-xs text-ink-3">No transitions yet.</p>
            ) : (
              <ol className="space-y-3">
                {domain.transitions.map((t) => {
                  const before = [result.baselineThesis, ...domain.thesisHistory].find((th) => th.version === t.fromVersion);
                  const after = [...domain.thesisHistory, domain.currentThesis].find((th) => th.version === t.toVersion);
                  const diff = before && after ? diffThesis(before, after) : null;
                  return (
                    <li key={t.transitionId} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <BookOpenCheck size={12} aria-hidden className="text-accent" />
                        <span className="font-semibold text-ink">v{t.fromVersion} → v{t.toVersion}</span>
                        <span className="text-[10px] text-ink-3">{formatDateTime(t.approvedAt)}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5 pl-4 text-[11px] text-ink-2">
                        {diff?.changes.map((c) => (
                          <li key={`${c.objectId}${c.field}`}>
                            {c.objectLabel} · {c.field}: <span className="line-through">{c.before}</span> → <span className="text-ink">{c.after}</span>
                          </li>
                        ))}
                        {diff?.added.map((a) => <li key={a.objectId}>+ {a.objectType}: {a.label}</li>)}
                      </ul>
                      <div className="mt-1 pl-4 font-mono text-[9.5px] text-ink-3 break-all">{t.afterSnapshotHash}</div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>

          <Panel
            title="Run log"
            actions={
              <Button size="sm" variant="ghost" aria-expanded={showLog} onClick={() => setShowLog(!showLog)}>
                {showLog ? "Hide" : "Show"}
              </Button>
            }
          >
            <div className="flex items-center gap-1.5 text-[11px] text-ink-2">
              <ShieldCheck size={12} aria-hidden className="text-ok" />
              {result.run.events.length} events · prompt {result.promptVersion}
            </div>
            {showLog && (
              <ol className="mt-2 space-y-1">
                {result.run.events.map((e) => (
                  <li key={e.runEventId} className="text-[10.5px] leading-snug text-ink-2">
                    <span className="font-mono text-ink-3">{e.eventType}</span> {e.publicMessage}
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-2 text-[10px] text-ink-3">
              Tokens: {result.usage.inputTokens.toLocaleString()} in / {result.usage.outputTokens.toLocaleString()} out
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
