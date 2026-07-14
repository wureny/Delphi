"use client";

/**
 * Ledger transition detail — state diff, evidence lineage, approval &
 * responsibility, and execution/privacy metadata, plus safe rollback.
 */
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpenCheck, ShieldCheck, Undo2, UserRound, Plus, Minus } from "lucide-react";
import { Badge, Button, InlineAlert, Kv, Modal, Panel } from "@/components/ui/primitives";
import { useToasts } from "@/components/ui/toast";
import { EvidenceDrawer, EvidenceChips } from "@/components/evidence/EvidenceDrawer";
import { useDemoStore, proposalsById } from "@/store/demo-store";
import { diffThesis } from "@/lib/diff";
import { formatDateTime, runIdToSlug } from "@/lib/labels";
import { DEMO_USERS, REJECT_REASONS } from "@/domain/policies";

export default function TransitionDetailPage({ params }: { params: Promise<{ transitionId: string }> }) {
  const { transitionId } = use(params);
  const domain = useDemoStore((s) => s.domain);
  const rollback = useDemoStore((s) => s.rollback);
  const push = useToasts((s) => s.push);
  const router = useRouter();
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [confirmRollback, setConfirmRollback] = useState(false);

  const transition = domain.transitions.find((t) => t.transitionId === transitionId);
  if (!transition) {
    // The transition can disappear mid-session (demo reset). Render a calm
    // empty state instead of a hard 404 so in-flight navigation completes.
    return (
      <div className="mx-auto max-w-5xl px-4 py-5">
        <Link href="/ledger" className="flex w-fit items-center gap-1 text-xs text-ink-3 hover:text-ink">
          <ArrowLeft size={12} aria-hidden />
          Decision Ledger
        </Link>
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <BookOpenCheck size={22} className="text-ink-3" aria-hidden />
          <p className="text-sm font-medium text-ink">This transition is not in the current demo session.</p>
          <p className="max-w-md text-[13px] text-ink-3">
            It may have been cleared by a demo reset. The Decision Ledger lists all transitions recorded in this
            session.
          </p>
        </div>
      </div>
    );
  }

  const before =
    domain.thesisHistory.find((t) => t.version === transition.fromVersion) ??
    (domain.currentThesis.version === transition.fromVersion ? domain.currentThesis : undefined);
  const after = domain.currentThesis.version === transition.toVersion ? domain.currentThesis : undefined;
  const diff = before && after ? diffThesis(before, after) : undefined;

  const canRollback = transition.status === "applied" && transition.toVersion === domain.currentThesis.version;

  const reviews = domain.reviews.filter((r) => transition.reviewIds.includes(r.reviewId));
  const excludedReviews = domain.reviews.filter(
    (r) =>
      !transition.reviewIds.includes(r.reviewId) &&
      new Date(r.reviewedAt).getTime() <= new Date(transition.approvedAt).getTime(),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <Link href="/ledger" className="flex w-fit items-center gap-1 text-xs text-ink-3 hover:text-ink">
        <ArrowLeft size={12} aria-hidden />
        Decision Ledger
      </Link>

      <header className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-lg font-semibold text-ink tnum">
            v{transition.fromVersion} → v{transition.toVersion}
          </h1>
          <Badge tone={transition.status === "applied" ? "ok" : "neutral"}>{transition.status.replace(/_/g, " ")}</Badge>
          <Badge tone="neutral">{transition.transitionType.replace(/_/g, " ")}</Badge>
          <span className="font-mono text-xs text-ink-3">{transition.transitionId}</span>
        </div>
        {canRollback && (
          <Button variant="danger" size="sm" onClick={() => setConfirmRollback(true)}>
            <Undo2 size={13} aria-hidden />
            Roll back (demo)
          </Button>
        )}
      </header>

      {transition.status === "rolled_back" && (
        <InlineAlert tone="warn" className="mt-3">
          This transition was rolled back. The approved thesis returned to v{transition.fromVersion}; the record is
          preserved for auditability.
        </InlineAlert>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {/* 1 — State diff */}
        <Panel title="State diff" className="lg:col-span-2">
          {diff ? (
            <div className="space-y-2">
              {diff.changes.map((c) => (
                <div key={c.objectId + c.field} className="rounded-sm border border-line bg-inset p-2.5">
                  <p className="text-xs text-ink-3">
                    {c.objectType} · <span className="text-ink">{c.objectLabel}</span> ·{" "}
                    <span className="font-mono">{c.field}</span>
                  </p>
                  <div className="mt-1.5 space-y-1 font-mono text-[12px]">
                    <p className="flex items-start gap-1.5 text-bad">
                      <Minus size={12} className="mt-0.5 shrink-0" aria-hidden />
                      <span className="rounded-sm bg-bad-dim/60 px-1">{c.before.replace(/_/g, " ")}</span>
                    </p>
                    <p className="flex items-start gap-1.5 text-ok">
                      <Plus size={12} className="mt-0.5 shrink-0" aria-hidden />
                      <span className="rounded-sm bg-ok-dim/60 px-1">{c.after.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                </div>
              ))}
              {diff.added.map((a) => (
                <div key={a.objectId} className="rounded-sm border border-line bg-inset p-2.5">
                  <p className="text-xs text-ink-3">
                    {a.objectType} · <span className="font-mono">{a.objectId}</span> · added
                  </p>
                  <p className="mt-1.5 flex items-start gap-1.5 font-mono text-[12px] text-ok">
                    <Plus size={12} className="mt-0.5 shrink-0" aria-hidden />
                    <span className="rounded-sm bg-ok-dim/60 px-1">{a.label}</span>
                  </p>
                </div>
              ))}
              {diff.removed.map((item) => (
                <div key={item.objectId} className="rounded-sm border border-line bg-inset p-2.5">
                  <p className="text-xs text-ink-3">
                    {item.objectType} · <span className="font-mono">{item.objectId}</span> · removed
                  </p>
                  <p className="mt-1.5 flex items-start gap-1.5 font-mono text-[12px] text-bad">
                    <Minus size={12} className="mt-0.5 shrink-0" aria-hidden />
                    <span className="rounded-sm bg-bad-dim/60 px-1">{item.label}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-3">
              The before/after snapshots for this transition are no longer the current head (a later transition or
              rollback occurred). The structured record below remains authoritative.
            </p>
          )}
          <dl className="mt-3 rounded-sm border border-line bg-inset px-3 py-1">
            <Kv label="Before snapshot hash" mono>
              <span className="block max-w-72 truncate">{transition.beforeSnapshotHash}</span>
            </Kv>
            <Kv label="After snapshot hash" mono>
              <span className="block max-w-72 truncate">{transition.afterSnapshotHash}</span>
            </Kv>
          </dl>
        </Panel>

        {/* 2 — Evidence lineage */}
        <Panel title={`Evidence lineage (${transition.evidenceRefs.length})`}>
          <p className="mb-2 text-xs text-ink-3">
            Every applied change cites exact source excerpts. Click to inspect the excerpt, locator, and timestamps.
          </p>
          <EvidenceChips refs={transition.evidenceRefs} onOpen={setEvidenceId} />
          <div className="mt-3 border-t border-line pt-2">
            <h4 className="text-[11px] font-semibold tracking-widest text-ink-3 uppercase">Applied proposals</h4>
            <ul className="mt-1.5 space-y-1">
              {transition.proposalIds.map((id) => {
                const p = proposalsById.get(id);
                return (
                  <li key={id}>
                    <Link href={`/deltas/${id}`} className="block rounded-sm border border-line bg-inset px-2 py-1.5 hover:border-accent/50">
                      <span className="block truncate text-xs text-ink">{p?.headline ?? id}</span>
                      <span className="font-mono text-[10px] text-ink-3">{id}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Panel>

        {/* 3 — Approval & responsibility */}
        <Panel title="Approval & responsibility">
          <dl className="rounded-sm border border-line bg-inset px-3 py-1">
            <Kv label="Requested by">agent (proposal)</Kv>
            <Kv label="Applied by" mono>
              {transition.approvedByUserId}
            </Kv>
            <Kv label="Approved at (UTC)">{formatDateTime(transition.approvedAt)}</Kv>
            <Kv label="Reversible">{transition.reversible ? "Yes — safe rollback" : "No"}</Kv>
          </dl>

          <h4 className="mt-3 text-[11px] font-semibold tracking-widest text-ink-3 uppercase">Review history</h4>
          <ul className="mt-1.5 space-y-1.5">
            {reviews.map((r) => (
              <li key={r.reviewId} className="flex items-start gap-2 rounded-sm border border-line bg-inset px-2.5 py-2 text-xs">
                <UserRound size={13} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                <div>
                  <span className="text-ink">
                    {r.action.toUpperCase()} — {DEMO_USERS[r.reviewerRole === "pm" ? "pm" : "analyst"].displayName}
                  </span>
                  <span className="block text-ink-3">
                    {formatDateTime(r.reviewedAt)} UTC {r.note && `· “${r.note}”`}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {excludedReviews.length > 0 && (
            <>
              <h4 className="mt-3 text-[11px] font-semibold tracking-widest text-ink-3 uppercase">
                Excluded from this transition
              </h4>
              <ul className="mt-1.5 space-y-1.5">
                {excludedReviews.map((r) => {
                  const p = proposalsById.get(r.proposalId);
                  return (
                    <li key={r.reviewId} className="rounded-sm border border-line bg-inset px-2.5 py-2 text-xs">
                      <span className="text-ink">
                        {r.action.toUpperCase()} — {p?.headline ?? r.proposalId}
                      </span>
                      <span className="block text-ink-3">
                        {r.action === "reject" &&
                          `Reason: ${REJECT_REASONS.find((x) => x.code === r.reasonCode)?.label ?? r.reasonCode} · `}
                        {r.action === "escalate" && `Escalated to ${r.escalatedToUserId} · `}
                        {r.action === "defer" && `Deferred until ${r.deferredUntil?.slice(0, 10)} · `}
                        no canonical state change
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>

        {/* 4 — Execution & privacy metadata */}
        <Panel title="Execution & privacy metadata">
          <dl className="rounded-sm border border-line bg-inset px-3 py-1">
            <Kv label="Run" mono>
              <Link href={`/runs/${runIdToSlug[transition.runId]}`} className="text-accent hover:underline">
                {transition.runId}
              </Link>
            </Kv>
            <Kv label="Source event" mono>
              {transition.sourceEventIds.join(", ")}
            </Kv>
            <Kv label="Workflow" mono>
              earnings_to_thesis v{transition.workflowVersion}
            </Kv>
            <Kv label="Model route" mono>
              {transition.modelRoutes[0]?.provider}/{transition.modelRoutes[0]?.model}
            </Kv>
            <Kv label="Endpoint owner">{transition.modelRoutes[0]?.endpointOwner}</Kv>
            <Kv label="Retention">{transition.modelRoutes[0]?.retentionPolicy}</Kv>
          </dl>
          <h4 className="mt-3 text-[11px] font-semibold tracking-widest text-ink-3 uppercase">Skill versions</h4>
          <dl className="mt-1 rounded-sm border border-line bg-inset px-3 py-1">
            {Object.entries(transition.skillVersions).map(([skill, v]) => (
              <Kv key={skill} label={skill.replace(/_/g, " ")} mono>
                v{v}
              </Kv>
            ))}
          </dl>
          <Link href={`/trust/${runIdToSlug[transition.runId]}`} className="mt-3 block">
            <Button size="sm" className="w-full">
              <ShieldCheck size={13} aria-hidden />
              Open Privacy Receipt for this run
            </Button>
          </Link>
        </Panel>
      </div>

      {/* Rollback confirm */}
      <Modal
        open={confirmRollback}
        onClose={() => setConfirmRollback(false)}
        title={`Roll back v${transition.toVersion} → v${transition.fromVersion}?`}
        footer={
          <>
            <Button size="sm" onClick={() => setConfirmRollback(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                const result = rollback(transition.transitionId);
                setConfirmRollback(false);
                if (result.status === "rejected") {
                  push({ tone: "bad", title: "Rollback rejected", detail: result.messages[0]?.message });
                } else {
                  push({
                    tone: "ok",
                    title: `Rolled back to v${transition.fromVersion}`,
                    detail: "The transition record is preserved with status rolled_back.",
                  });
                  router.push("/ledger");
                }
              }}
            >
              <Undo2 size={13} aria-hidden />
              Roll back
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">
          This restores the approved thesis to v{transition.fromVersion} exactly as recorded before the transition. The
          ledger entry is never deleted — it is marked <span className="font-mono text-xs">rolled_back</span> and the
          review history is preserved.
        </p>
      </Modal>

      <EvidenceDrawer excerptId={evidenceId} onClose={() => setEvidenceId(null)} />
    </div>
  );
}
