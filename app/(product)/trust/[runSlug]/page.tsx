"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TrustReceipt } from "@/components/trust/TrustReceipt";
import { runSlugToId } from "@/lib/labels";

export default function TrustRunPage({ params }: { params: Promise<{ runSlug: string }> }) {
  const { runSlug } = use(params);
  const runId = runSlugToId[runSlug];
  if (!runId) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <Link href="/trust" className="flex w-fit items-center gap-1 text-xs text-ink-3 hover:text-ink">
        <ArrowLeft size={12} aria-hidden />
        Trust
      </Link>
      <h1 className="mt-2 text-lg font-semibold text-ink">Privacy Receipt</h1>
      <p className="mt-0.5 font-mono text-xs text-ink-3">{runId}</p>
      <div className="mt-4">
        <TrustReceipt runId={runId} />
      </div>
    </div>
  );
}
