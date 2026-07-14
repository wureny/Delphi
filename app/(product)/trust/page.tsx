"use client";

import Link from "next/link";
import { TrustReceipt } from "@/components/trust/TrustReceipt";
import { cn } from "@/lib/cn";
import { useState } from "react";

const RUNS = [
  { runId: "run_arct_success_001", label: "Successful run" },
  { runId: "run_arct_degraded_001", label: "Degraded run" },
];

export default function TrustPage() {
  const [runId, setRunId] = useState(RUNS[0]!.runId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <h1 className="text-lg font-semibold text-ink">Trust</h1>
      <p className="mt-0.5 text-[13px] text-ink-2">
        A visible receipt of what each run did with data — designed as a product feature, not a compliance export.
      </p>

      <div role="group" aria-label="Select run" className="mt-4 flex gap-1.5">
        {RUNS.map((r) => (
          <button
            key={r.runId}
            onClick={() => setRunId(r.runId)}
            aria-pressed={runId === r.runId}
            className={cn(
              "rounded-sm border px-2.5 py-1 text-xs transition-colors",
              runId === r.runId
                ? "border-accent/50 bg-accent-dim/40 font-medium text-ink"
                : "border-line bg-panel text-ink-2 hover:border-line-strong",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <TrustReceipt runId={runId} />
      </div>

      <p className="mt-3 text-[11px] text-ink-3">
        Synthetic demonstration only. Not investment advice.{" "}
        <Link href="/website#security" className="text-accent hover:underline">
          Read about the target security architecture
        </Link>
        .
      </p>
    </div>
  );
}
