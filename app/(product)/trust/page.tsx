"use client";

import Link from "next/link";
import { TrustReceipt } from "@/components/trust/TrustReceipt";
import { cn } from "@/lib/cn";
import { useState } from "react";

const RUNS = [
  { runId: "run_msft_fy25q4_success", label: "MSFT real-public scenario" },
  { runId: "run_arct_degraded_001", label: "ARCT synthetic degraded fallback" },
];

export default function TrustPage() {
  const [runId, setRunId] = useState(RUNS[0]!.runId);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Trust</h1>
      <p className="mt-1 text-xs text-ink-2">
        A visible receipt of what each run did with data, designed as a product feature rather than a compliance export.
      </p>

      <div role="group" aria-label="Select run" className="mt-6 flex gap-1.5 border-b border-line">
        {RUNS.map((r) => (
          <button
            key={r.runId}
            onClick={() => setRunId(r.runId)}
            aria-pressed={runId === r.runId}
            className={cn(
              "-mb-px border-b-2 px-1 pb-2.5 text-[11px] font-medium",
              runId === r.runId
                ? "border-accent text-ink"
                : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <TrustReceipt runId={runId} />
      </div>

      <p className="mt-3 text-[11px] text-ink-3">
        Real public source facts and demo-authored investment context are labeled separately. Not investment advice.{" "}
        <Link href="/website#security" className="text-accent hover:underline">
          Read about the target security architecture
        </Link>
        .
      </p>
    </div>
  );
}
