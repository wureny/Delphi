"use client";

/**
 * Privacy Receipt — generated from actual demo state so the receipt always
 * reflects real prototype behavior, including live write counts.
 */
import Link from "next/link";
import {
  ShieldCheck,
  Globe,
  CloudOff,
  FlaskConical,
  Wrench,
  UserRound,
  GitCommitHorizontal,
  Cpu,
} from "lucide-react";
import { Badge, Kv, Panel } from "@/components/ui/primitives";
import { useDemoStore } from "@/store/demo-store";
import { getRunBundle, proposalsForRun } from "@/fixtures/loader";
import { generatePrivacyReceipt } from "@/runtime/receipt";
import { formatDateTime, runIdToSlug, runStatusMeta } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { useClientRuntime } from "@/runtime/client-context";

function ReceiptLine({
  icon,
  label,
  value,
  good = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/60 py-2 last:border-0">
      <span className="flex items-center gap-2 text-[13px] text-ink-2">
        <span className={cn("shrink-0", good ? "text-ok" : "text-warn")}>{icon}</span>
        {label}
      </span>
      <span className="text-right text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}

export function TrustReceipt({ runId }: { runId: string }) {
  const domain = useDemoStore((s) => s.domain);
  const { capabilities } = useClientRuntime();
  const bundle = getRunBundle(runId)!;
  const run = bundle.workflowRun;
  const runProposals = proposalsForRun(runId);
  const receipt = generatePrivacyReceipt(bundle, runProposals, domain, new Date().toISOString());
  const statusMeta = runStatusMeta[run.status];

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      <Panel title="Privacy receipt" className="lg:col-span-3" bodyClassName="px-4 py-2">
        <ReceiptLine
          icon={<FlaskConical size={15} aria-hidden />}
          label="Data classification"
          value={<Badge tone="warn">Synthetic demo data</Badge>}
        />
        <ReceiptLine
          icon={<Cpu size={15} aria-hidden />}
          label="Model endpoint"
          value={
            <span className="font-mono text-xs">
              {receipt.modelRoutes[0]?.provider}/{receipt.modelRoutes[0]?.model} · {capabilities.analysis.activeMode} adapter
            </span>
          }
        />
        <ReceiptLine icon={<ShieldCheck size={15} aria-hidden />} label="Execution location" value={receipt.executionLocation} />
        <ReceiptLine
          icon={<CloudOff size={15} aria-hidden />}
          label="Raw content sent to Delphi Cloud"
          value={<Badge tone="ok">No</Badge>}
        />
        <ReceiptLine
          icon={<Globe size={15} aria-hidden />}
          label="External web access"
          value={<Badge tone="ok">{capabilities.externalNetworkAccess ? "Enabled" : "Disabled"}</Badge>}
        />
        <ReceiptLine
          icon={<Wrench size={15} aria-hidden />}
          label="Tools called"
          value={<span className="font-mono text-xs">{receipt.toolNames.join(" · ")}</span>}
        />
        <ReceiptLine
          icon={<GitCommitHorizontal size={15} aria-hidden />}
          label="Canonical writes"
          value={
            <span className="font-mono text-xs tnum">
              {receipt.canonicalWritesProposed} proposed · {receipt.canonicalWritesApproved} human-approved
            </span>
          }
        />
        <ReceiptLine
          icon={<UserRound size={15} aria-hidden />}
          label="Delphi support access"
          value={<Badge tone="ok">None</Badge>}
        />
        <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-ink-3">
          This receipt is generated from the current interactive state. The write counts change as you review proposals. In the
          target production architecture, receipts are generated per run inside a customer-owned data plane.
        </p>
      </Panel>

      <div className="space-y-3 lg:col-span-2">
        <Panel title="Run provenance">
          <dl className="rounded-sm border border-line bg-inset px-3 py-1">
            <Kv label="Run" mono>
              <Link href={`/runs/${runIdToSlug[run.runId]}`} className="text-accent hover:underline">
                {run.runId}
              </Link>
            </Kv>
            <Kv label="Status">
              <Badge tone={statusMeta.tone} icon={statusMeta.icon}>
                {statusMeta.label}
              </Badge>
            </Kv>
            <Kv label="Workflow" mono>
              earnings_to_thesis v{run.workflowVersion}
            </Kv>
            <Kv label="Mode">{capabilities.analysis.label}</Kv>
            <Kv label="Started (UTC)">{formatDateTime(run.startedAt)}</Kv>
            <Kv label="Retention">{run.modelRoutes[0]?.retentionPolicy}</Kv>
            <Kv label="Training use">{run.modelRoutes[0]?.trainingUse}</Kv>
          </dl>
          <h4 className="mt-3 text-[11px] font-semibold tracking-widest text-ink-3 uppercase">Skill versions</h4>
          <dl className="mt-1 rounded-sm border border-line bg-inset px-3 py-1">
            {Object.entries(run.skillVersions).map(([skill, v]) => (
              <Kv key={skill} label={skill.replace(/_/g, " ")} mono>
                v{v}
              </Kv>
            ))}
          </dl>
        </Panel>

        <Panel title="Current stage: honest claims">
          <ul className="space-y-1.5 text-[13px] text-ink-2">
            <li>· Pre-launch prototype with synthetic data only.</li>
            <li>· Human review is required for every canonical write.</li>
            <li>
              · The <strong className="text-ink">target architecture</strong> separates a Delphi control plane from a
              customer-owned data plane; this is a roadmap direction, not a deployed capability.
            </li>
            <li>· No compliance certifications are claimed at this stage.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
