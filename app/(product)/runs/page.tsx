"use client";

import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Badge, Button, Panel, Kv } from "@/components/ui/primitives";
import { useDemoStore } from "@/store/demo-store";
import { getCase, productRunBundles } from "@/fixtures/loader";
import { formatDateTime, runIdToSlug, runStatusMeta } from "@/lib/labels";

export default function RunsPage() {
  const playback = useDemoStore((s) => s.runPlayback);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Runs</h1>
      <p className="mt-1 text-xs text-ink-2">
        Deterministic workflow executions. Every replay emits the same fixture-backed runtime events.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {productRunBundles.map((bundle) => {
          const run = bundle.workflowRun;
          const investmentCase = getCase(run.caseId);
          const meta = runStatusMeta[run.status];
          const pb = playback[run.runId];
          return (
            <Panel key={run.runId} title={run.runId} bodyClassName="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={meta.tone} icon={meta.icon}>
                  {meta.label}
                </Badge>
                <Badge tone={bundle.synthetic ? "warn" : "ok"}>{bundle.synthetic ? "Synthetic fixture" : "Real-public snapshots"}</Badge>
                <Badge tone="neutral">Deterministic replay</Badge>
                <Badge tone="neutral">Earnings-to-Thesis v{run.workflowVersion}</Badge>
              </div>
              <dl>
                <Kv label="Case" mono>
                  {investmentCase ? `${investmentCase.ticker} · ${investmentCase.companyName}` : run.caseId}
                </Kv>
                <Kv label="Started (UTC)">{formatDateTime(run.startedAt)}</Kv>
                <Kv label="Events" mono>
                  {bundle.events.length}
                </Kv>
                <Kv label="Proposals" mono>
                  {run.outputProposalIds.length}
                </Kv>
                <Kv label="Context inputs">
                  {run.contextUsage ? `${run.contextUsage.filter((item) => item.status === "used").length} used · ${run.contextUsage.length} declared` : "Legacy fixture"}
                </Kv>
                <Kv label="Replay state">
                  {pb?.status === "completed" ? "Replayed" : pb?.status === "playing" ? "Replaying…" : "Not replayed yet"}
                </Kv>
              </dl>
              <Link href={`/runs/${runIdToSlug[run.runId]}`} className="block">
                <Button variant="primary" size="sm" className="w-full">
                  <PlayCircle size={13} aria-hidden />
                  Open Run Observatory
                  <ArrowRight size={13} aria-hidden />
                </Button>
              </Link>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
