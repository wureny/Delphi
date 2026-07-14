"use client";

import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Badge, Button, Panel, Kv } from "@/components/ui/primitives";
import { useDemoStore } from "@/store/demo-store";
import { runBundles } from "@/fixtures/loader";
import { formatDateTime, runIdToSlug, runStatusMeta } from "@/lib/labels";

export default function RunsPage() {
  const playback = useDemoStore((s) => s.runPlayback);

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <h1 className="text-lg font-semibold text-ink">Runs</h1>
      <p className="mt-0.5 text-[13px] text-ink-2">
        Deterministic workflow executions. Every replay emits the same fixture-backed runtime events.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {runBundles.map((bundle) => {
          const run = bundle.workflowRun;
          const meta = runStatusMeta[run.status];
          const pb = playback[run.runId];
          return (
            <Panel key={run.runId} title={run.runId} bodyClassName="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={meta.tone} icon={meta.icon}>
                  {meta.label}
                </Badge>
                <Badge tone="neutral">Fixture · deterministic</Badge>
                <Badge tone="neutral">Earnings-to-Thesis v{run.workflowVersion}</Badge>
              </div>
              <dl>
                <Kv label="Case" mono>
                  {run.caseId}
                </Kv>
                <Kv label="Started (UTC)">{formatDateTime(run.startedAt)}</Kv>
                <Kv label="Events" mono>
                  {bundle.events.length}
                </Kv>
                <Kv label="Proposals" mono>
                  {run.outputProposalIds.length}
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
