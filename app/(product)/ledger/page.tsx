"use client";

/**
 * Decision Ledger — the append-only record of approved state transitions.
 */
import Link from "next/link";
import { BookOpenCheck, ArrowRight } from "lucide-react";
import { Badge, Panel } from "@/components/ui/primitives";
import { useDemoStore } from "@/store/demo-store";
import { arctCase, defaultCase, defaultSuccessProposals } from "@/fixtures/loader";
import { formatDateTime } from "@/lib/labels";

export default function LedgerPage() {
  const defaultDomain = useDemoStore((s) => s.domain);
  const arctDomain = useDemoStore((s) => s.arctDomain);
  const transitions = [
    ...defaultDomain.transitions.map((transition) => ({ transition, ticker: defaultCase.ticker })),
    ...arctDomain.transitions.map((transition) => ({ transition, ticker: arctCase.ticker })),
  ].sort((a, b) => Date.parse(a.transition.approvedAt) - Date.parse(b.transition.approvedAt));

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Decision Ledger</h1>
          <p className="mt-1 text-xs text-ink-2">
            Every approved change to institutional state: before/after, evidence, actor, and versions.
          </p>
        </div>
        <div className="flex gap-1.5">
          <Badge tone="ok">{defaultCase.ticker} approved v{defaultDomain.currentThesis.version}</Badge>
          <Badge>{arctCase.ticker} approved v{arctDomain.currentThesis.version}</Badge>
        </div>
      </header>

      <Panel className="mt-6" bodyClassName="overflow-x-auto p-0">
        {transitions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <BookOpenCheck size={22} className="text-ink-3" aria-hidden />
            <p className="text-sm font-medium text-ink">No state transitions recorded yet.</p>
            <p className="max-w-md text-[13px] text-ink-3">
              The MSFT demo thesis is at v{defaultDomain.currentThesis.version}. When a reviewer accepts or edits proposals and applies them, the
              exact v{defaultDomain.currentThesis.version} → v{defaultDomain.currentThesis.version + 1} transition will be recorded here.
            </p>
            <Link href={`/deltas/${defaultSuccessProposals[0]!.proposalId}`} className="mt-1 text-[13px] text-accent hover:underline">
              Open the pending review →
            </Link>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-3">
                <th className="px-3 py-2 font-medium">Time (UTC)</th>
                <th className="px-3 py-2 font-medium">Case</th>
                <th className="px-3 py-2 font-medium">Transition</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Approved by</th>
                <th className="px-3 py-2 text-right font-medium">Evidence</th>
                <th className="px-3 py-2 font-medium">Workflow</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {[...transitions].reverse().map(({ transition: t, ticker }, i) => (
                <tr
                  key={t.transitionId}
                  className={`border-b border-line/60 transition-colors last:border-0 hover:bg-panel-2/60 ${i === 0 ? "animate-row-flash" : ""}`}
                >
                  <td className="px-3 py-2 font-mono text-xs text-ink-2 tnum">{formatDateTime(t.approvedAt)}</td>
                  <td className="px-3 py-2 text-ink">{ticker}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink tnum">
                    v{t.fromVersion} → v{t.toVersion}
                  </td>
                  <td className="px-3 py-2 text-ink-2">{t.transitionType.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-2">{t.approvedByUserId}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-ink-2 tnum">{t.evidenceRefs.length}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-2">v{t.workflowVersion}</td>
                  <td className="px-3 py-2">
                    <Badge tone={t.status === "applied" ? "ok" : "neutral"}>{t.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/ledger/${t.transitionId}`}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      Detail
                      <ArrowRight size={11} aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
