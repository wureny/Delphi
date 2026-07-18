"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Button, Panel } from "@/components/ui/primitives";
import { useDemoStore } from "@/store/demo-store";
import { arctCase, defaultCase } from "@/fixtures/loader";
import { formatDate } from "@/lib/labels";

export default function CasesPage() {
  const version = useDemoStore((s) => s.domain.currentThesis.version);
  const approvedAt = useDemoStore((s) => s.domain.currentThesis.approvedAt);
  const arctVersion = useDemoStore((s) => s.arctDomain.currentThesis.version);
  const arctApprovedAt = useDemoStore((s) => s.arctDomain.currentThesis.approvedAt);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Cases</h1>
      <p className="mt-1 text-xs text-ink-2">Long-lived investment cases with approved, versioned team state.</p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Panel className="md:col-span-2" title="Default scenario">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink">{defaultCase.companyName}</h2>
                <span className="font-mono text-xs text-ink-3">{defaultCase.ticker}</span>
                <Badge tone="ok">Approved v{version}</Badge>
                <Badge tone="ok" outlined>
                  Real public event · demo thesis
                </Badge>
              </div>
              <p className="mt-1 text-[13px] text-ink-2">
                {defaultCase.sector} · {defaultCase.horizon} horizon · Owner A. Chen · Last approved {formatDate(approvedAt)}
              </p>
            </div>
            <Link href="/cases/msft-fy25q4">
              <Button variant="primary" size="sm">
                Open case
                <ArrowRight size={13} aria-hidden />
              </Button>
            </Link>
          </div>
        </Panel>

        <Panel title="Synthetic fallback" className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink">{arctCase.companyName}</h2>
                <span className="font-mono text-xs text-ink-3">{arctCase.ticker}</span>
                <Badge tone="neutral">Approved v{arctVersion}</Badge>
                <Badge tone="warn" outlined>Synthetic</Badge>
              </div>
              <p className="mt-1 text-[13px] text-ink-2">
                {arctCase.sector} · {arctCase.horizon} horizon · Degraded-source demonstration · Last approved {formatDate(arctApprovedAt)}
              </p>
            </div>
            <Link href="/cases/arct-demo">
              <Button size="sm">Open fallback case <ArrowRight size={13} aria-hidden /></Button>
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
