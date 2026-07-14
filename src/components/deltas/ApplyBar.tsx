"use client";

/**
 * Sticky apply bar — turns approved reviews into exactly one recorded
 * v(n) → v(n+1) state transition via the gateway.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Check, GitCommitHorizontal } from "lucide-react";
import { Button, Modal } from "@/components/ui/primitives";
import { useToasts } from "@/components/ui/toast";
import { useDemoStore, pendingApprovals, proposalsById } from "@/store/demo-store";
import { describePatchOp } from "@/lib/labels";
import { useMemo } from "react";

export function ApplyBar({ runId, proposalIds }: { runId: string; proposalIds: string[] }) {
  const domain = useDemoStore((s) => s.domain);
  const applyApproved = useDemoStore((s) => s.applyApproved);
  const push = useToasts((s) => s.push);
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const thesis = domain.currentThesis;
  const scope = new Set(proposalIds);
  const pending = pendingApprovals(domain, proposalsById).filter((p) => scope.has(p.proposal.proposalId));

  const lookup = useMemo(
    () => ({
      pillarTitle: (id: string) => thesis.pillars.find((p) => p.pillarId === id)?.title ?? id,
      forecastMetric: (id: string) => thesis.forecasts.find((f) => f.forecastId === id)?.metric ?? id,
      riskTitle: (id: string) => thesis.risks.find((r) => r.riskId === id)?.title ?? id,
    }),
    [thesis],
  );

  if (pending.length === 0) return null;

  const apply = () => {
    const result = applyApproved(runId, scope);
    if (result.status === "rejected") {
      push({ tone: "bad", title: "Transition rejected", detail: result.messages[0]?.message });
      setConfirming(false);
      return;
    }
    const transition = result.value!.transition;
    setConfirming(false);
    push({
      tone: "ok",
      title: `Recorded transition v${transition.fromVersion} → v${transition.toVersion}`,
      detail: `${transition.proposalIds.length} approved change(s) applied. Rejected, escalated, and deferred proposals were excluded.`,
    });
    router.push(`/ledger/${transition.transitionId}`);
  };

  return (
    <>
      <div className="sticky bottom-16 z-30 md:bottom-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-md border border-accent/40 bg-panel-2/95 px-4 py-2.5 shadow-2xl backdrop-blur">
          <p className="text-[13px] text-ink">
            <span className="font-semibold">{pending.length}</span> approved change{pending.length === 1 ? "" : "s"}{" "}
            ready ·{" "}
            <span className="font-mono text-xs text-ink-2 tnum">
              v{thesis.version} → v{thesis.version + 1}
            </span>
          </p>
          <Button variant="primary" size="sm" onClick={() => setConfirming(true)}>
            <GitCommitHorizontal size={13} aria-hidden />
            Apply approved changes
          </Button>
        </div>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Apply ${pending.length} approved change${pending.length === 1 ? "" : "s"} → v${thesis.version + 1}?`}
        wide
        footer={
          <>
            <Button size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={apply}>
              <BookOpenCheck size={13} aria-hidden />
              Record state transition
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">
          This creates exactly one Decision Ledger transition. Only the changes below are applied — rejected,
          escalated, and deferred proposals are excluded and the version increments once.
        </p>
        <ul className="mt-3 space-y-2">
          {pending.map(({ proposal, review, patch }) => (
            <li key={proposal.proposalId} className="rounded-sm border border-line bg-inset p-2.5">
              <p className="text-[13px] font-medium text-ink">{proposal.headline}</p>
              <ul className="mt-1 space-y-0.5">
                {patch.map((op, i) => (
                  <li key={i} className="flex gap-1.5 font-mono text-[11px] text-ink-2">
                    <Check size={12} className="mt-px shrink-0 text-ok" aria-hidden />
                    {describePatchOp(op, lookup)}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-ink-3">
                {review.action === "edit" ? "Human-edited and approved" : "Accepted"} by {review.reviewerUserId} (
                {review.reviewerRole.toUpperCase()})
              </p>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
