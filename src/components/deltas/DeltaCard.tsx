"use client";

/**
 * Thesis Delta Proposal card with the full review action set.
 * Authorization and validation live in the domain gateway — this component
 * renders whatever the policy decides and never re-implements the rules.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  PencilLine,
  X,
  ArrowUpCircle,
  Clock4,
  ShieldAlert,
  TriangleAlert,
  ChevronDown,
  UserRound,
} from "lucide-react";
import { Badge, Button, InlineAlert, Modal, Field, inputClass } from "@/components/ui/primitives";
import { useToasts } from "@/components/ui/toast";
import { EvidenceChips } from "@/components/evidence/EvidenceDrawer";
import { cn } from "@/lib/cn";
import {
  useDemoStore,
  proposalReviewState,
  latestReviewFor,
  isProposalBlocked,
  type ProposalReviewState,
} from "@/store/demo-store";
import { DEMO_USERS, REJECT_REASONS, canApplyProposal } from "@/domain/policies";
import { getRunBundle } from "@/fixtures/loader";
import {
  confidenceLabel,
  deltaTypeLabel,
  describePatchOp,
  materialityTone,
  proposalDirection,
  reviewStateMeta,
  formatDateTime,
} from "@/lib/labels";
import type { PatchOperation, ThesisDeltaProposal } from "@/domain/types";

type ActiveModal = "accept" | "edit" | "reject" | "escalate" | "defer" | null;

function usePatchLookup() {
  const thesis = useDemoStore((s) => s.domain.currentThesis);
  return useMemo(
    () => ({
      pillarTitle: (id: string) => thesis.pillars.find((p) => p.pillarId === id)?.title ?? id,
      forecastMetric: (id: string) => thesis.forecasts.find((f) => f.forecastId === id)?.metric ?? id,
      riskTitle: (id: string) => thesis.risks.find((r) => r.riskId === id)?.title ?? id,
    }),
    [thesis],
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">{label}</h4>
      <div className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Structured patch editor (Edit action)
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: Record<string, string[]> = {
  pillars: ["active", "weakened", "strengthened"],
  forecasts: ["active", "review_required"],
  risks: ["open", "increasing", "decreasing", "closed"],
  openQuestions: ["open", "closed"],
};

function PatchOpEditor({
  op,
  onChange,
  lookup,
}: {
  op: PatchOperation;
  onChange: (next: PatchOperation) => void;
  lookup: ReturnType<typeof usePatchLookup>;
}) {
  const segments = op.path.split("/").filter(Boolean);
  const collection = segments[0] ?? "";
  const field = segments[2] ?? "";

  if (op.op === "add" && collection === "openQuestions") {
    const value = op.value as { question: string } & Record<string, unknown>;
    return (
      <Field label="New open question">
        <textarea
          className={cn(inputClass, "min-h-16")}
          value={value.question}
          onChange={(e) => onChange({ ...op, value: { ...value, question: e.target.value } })}
        />
      </Field>
    );
  }

  if (op.op === "replace" && field === "status") {
    return (
      <Field label={describePatchOp({ ...op, value: "…" }, lookup).replace(" → …", "")}>
        <select className={inputClass} value={String(op.value)} onChange={(e) => onChange({ ...op, value: e.target.value })}>
          {(STATUS_OPTIONS[collection] ?? ["active"]).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (op.op === "replace" && field === "teamConviction") {
    return (
      <Field label={describePatchOp({ ...op, value: "…" }, lookup).replace(" → …", "")}>
        <select className={inputClass} value={String(op.value)} onChange={(e) => onChange({ ...op, value: e.target.value })}>
          {["low", "medium", "high"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (op.op === "replace" && field === "statement") {
    return (
      <Field label={describePatchOp({ ...op, value: "…" }, lookup).replace(" → …", "")}>
        <textarea
          className={cn(inputClass, "min-h-20")}
          value={String(op.value)}
          onChange={(e) => onChange({ ...op, value: e.target.value })}
        />
      </Field>
    );
  }

  return (
    <Field label={op.path}>
      <input
        className={inputClass}
        value={String("value" in op ? (op.value ?? "") : "")}
        onChange={(e) => onChange({ ...op, value: e.target.value } as PatchOperation)}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Delta card
// ---------------------------------------------------------------------------

export function DeltaCard({
  proposal,
  focused,
  onOpenEvidence,
}: {
  proposal: ThesisDeltaProposal;
  focused: boolean;
  onOpenEvidence: (excerptId: string) => void;
}) {
  const domain = useDemoStore((s) => s.domain);
  const role = useDemoStore((s) => s.role);
  const transcriptUnavailable = useDemoStore((s) => s.transcriptUnavailable);
  const submitReview = useDemoStore((s) => s.submitReview);
  const push = useToasts((s) => s.push);
  const lookup = usePatchLookup();

  const [modal, setModal] = useState<ActiveModal>(null);
  const [editedPatch, setEditedPatch] = useState<PatchOperation[]>(proposal.proposedPatch);
  const [note, setNote] = useState("");
  const [reasonCode, setReasonCode] = useState<string>(REJECT_REASONS[0].code);
  const [deferUntil, setDeferUntil] = useState("2026-07-27");
  const [showOriginal, setShowOriginal] = useState(false);

  const state: ProposalReviewState = proposalReviewState(domain, proposal, transcriptUnavailable);
  const stateMeta = reviewStateMeta[state];
  const review = latestReviewFor(domain, proposal.proposalId);
  const direction = proposalDirection(proposal);
  const blocked = isProposalBlocked(proposal, transcriptUnavailable);
  const applied = state === "applied";
  const runDegraded = getRunBundle(proposal.runId)?.workflowRun.status === "degraded" || transcriptUnavailable;

  const actor = DEMO_USERS[role];
  const policy = canApplyProposal(actor, proposal, { runDegraded, blockedByPolicy: blocked });

  const closeModal = () => {
    setModal(null);
    setNote("");
  };

  const act = (
    action: "accept" | "edit" | "reject" | "escalate" | "defer",
    extras: Partial<Parameters<typeof submitReview>[0]> = {},
  ) => {
    const result = submitReview({ proposalId: proposal.proposalId, action, note: note || undefined, ...extras });
    if (result.status === "rejected") {
      push({
        tone: "bad",
        title: "Action blocked by policy",
        detail: result.messages[0]?.message,
      });
      return false;
    }
    const titles: Record<string, string> = {
      accept: "Change approved, queued for application",
      edit: "Edited version approved, queued for application",
      reject: "Proposal rejected, approved thesis unchanged",
      escalate: "Escalated to PM queue, approved thesis unchanged",
      defer: "Deferred, approved thesis unchanged",
    };
    push({ tone: action === "reject" ? "neutral" : action === "escalate" ? "esc" : "ok", title: titles[action]!, detail: result.messages[0]?.message });
    closeModal();
    return true;
  };

  const patchChanged = JSON.stringify(editedPatch) !== JSON.stringify(proposal.proposedPatch);

  return (
    <article
      id={proposal.proposalId}
      aria-label={proposal.headline}
      className={cn(
        "rounded-md border bg-panel transition-colors",
        focused ? "border-accent/50" : "border-line",
        blocked && "border-bad/40",
      )}
    >
      {blocked && (
        <div className="flex items-center gap-2 rounded-t-md border-b border-bad/30 bg-bad-dim/50 px-3 py-1.5 text-xs text-bad">
          <ShieldAlert size={13} aria-hidden />
          Blocked — required evidence is unavailable. Approval fails closed; retry the source or escalate.
        </div>
      )}

      <div className="p-3.5">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{deltaTypeLabel[proposal.deltaType] ?? proposal.deltaType}</Badge>
          <Badge tone={direction.tone} icon={direction.icon}>
            {direction.label}
          </Badge>
          <Badge tone={materialityTone[proposal.materiality]}>{proposal.materiality} materiality</Badge>
          <Badge tone="neutral" outlined>
            {confidenceLabel[proposal.confidence]}
          </Badge>
          <span className="ml-auto">
            <Badge tone={stateMeta.tone} icon={stateMeta.icon}>
              {stateMeta.label}
            </Badge>
          </span>
        </div>

        <h3 className="mt-2 text-[15px] font-semibold text-ink">{proposal.headline}</h3>
        <p className="mt-0.5 font-mono text-[10px] text-ink-3">
          {proposal.proposalId} · against approved thesis v{proposal.fromThesisVersion} · required reviewer:{" "}
          {proposal.requiredReviewerRole.toUpperCase()}
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Section label="What changed">{proposal.whatChanged}</Section>
          <Section label="Against our view">{proposal.againstOurView}</Section>
          <Section label="Why it matters">{proposal.whyItMatters}</Section>
          <Section label="Unknown">
            <ul className="list-disc space-y-0.5 pl-4">
              {proposal.uncertainties.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="mt-3">
          <Section label="Evidence">
            <EvidenceChips refs={proposal.evidenceRefs} onOpen={onOpenEvidence} />
          </Section>
        </div>

        <div className="mt-3">
          <Section label="Recommended follow-up">{proposal.recommendedFollowUp}</Section>
        </div>

        {/* Proposed change */}
        <div className="mt-3 rounded-sm border border-dashed border-line-strong bg-inset p-2.5">
          <h4 className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
            Proposed change to approved state
            <Badge tone="accent" outlined>
              Agent proposal
            </Badge>
          </h4>
          <ul className="mt-1.5 space-y-1">
            {(review?.action === "edit" && review.editedPatch ? review.editedPatch : proposal.proposedPatch).map(
              (op, i) => (
                <li key={i} className="font-mono text-[12px] text-ink">
                  {describePatchOp(op, lookup)}
                </li>
              ),
            )}
          </ul>
          {review?.action === "edit" && (
            <p className="mt-1.5 text-[11px] text-ink-3">
              Human-edited by {review.reviewerUserId}. The original agent proposal is retained in review history.
            </p>
          )}
        </div>

        {/* Review record */}
        {review && (
          <div className="mt-3 flex items-start gap-2 rounded-sm border border-line bg-inset px-2.5 py-2 text-xs text-ink-2">
            <UserRound size={13} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
            <div>
              <span className="text-ink">
                {review.action.toUpperCase()} by {review.reviewerUserId} ({review.reviewerRole.toUpperCase()})
              </span>{" "}
              · {formatDateTime(review.reviewedAt)} UTC
              {review.reasonCode && (
                <span className="block">Reason: {REJECT_REASONS.find((r) => r.code === review.reasonCode)?.label ?? review.reasonCode}</span>
              )}
              {review.escalatedToUserId && <span className="block">Escalated to: {review.escalatedToUserId} (PM queue)</span>}
              {review.deferredUntil && <span className="block">Deferred until: {review.deferredUntil.slice(0, 10)}</span>}
              {review.note && <span className="block text-ink-3">“{review.note}”</span>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          {applied ? (
            <p className="text-xs text-ink-3">
              Applied to the approved thesis.{" "}
              <Link href="/ledger" className="text-accent hover:underline">
                View in Decision Ledger
              </Link>
            </p>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setModal("accept")}
                disabled={blocked}
                title={blocked ? "Evidence unavailable; approval fails closed." : undefined}
              >
                <Check size={13} aria-hidden />
                Accept
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditedPatch(structuredClone(review?.editedPatch ?? proposal.proposedPatch));
                  setModal("edit");
                }}
                disabled={blocked}
                title={blocked ? "Evidence unavailable; approval fails closed." : undefined}
              >
                <PencilLine size={13} aria-hidden />
                Edit
              </Button>
              <Button size="sm" onClick={() => setModal("reject")}>
                <X size={13} aria-hidden />
                Reject
              </Button>
              <Button size="sm" onClick={() => setModal("escalate")}>
                <ArrowUpCircle size={13} aria-hidden />
                Escalate
              </Button>
              <Button size="sm" onClick={() => setModal("defer")}>
                <Clock4 size={13} aria-hidden />
                Defer
              </Button>
              {!policy.allowed && !blocked && (
                <span className="ml-auto flex items-center gap-1 text-[11px] text-warn">
                  <TriangleAlert size={12} aria-hidden />
                  {role === "analyst" ? "Requires PM; escalate or switch role" : policy.message}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ----------------------------- Accept ------------------------------ */}
      <Modal
        open={modal === "accept"}
        onClose={closeModal}
        title="Approve and record this change?"
        footer={
          policy.allowed ? (
            <>
              <Button size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => act("accept")}>
                Approve and record
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => act("escalate", { escalatedToUserId: DEMO_USERS.pm.userId })}
              >
                <ArrowUpCircle size={13} aria-hidden />
                Escalate to PM instead
              </Button>
            </>
          )
        }
      >
        {!policy.allowed && (
          <InlineAlert tone="bad" icon={<ShieldAlert size={14} aria-hidden />} className="mb-3">
            <strong>Not authorized.</strong> {policy.message}
          </InlineAlert>
        )}
        <p className="text-[13px] text-ink-2">Approving this proposal will:</p>
        <ul className="mt-2 space-y-1.5 text-[13px] text-ink">
          {proposal.proposedPatch.map((op, i) => (
            <li key={i} className="flex gap-2">
              <Check size={14} className="mt-0.5 shrink-0 text-ok" aria-hidden />
              {describePatchOp(op, lookup)}
            </li>
          ))}
          <li className="flex gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-ok" aria-hidden />
            record you ({actor.displayName}) as the reviewer;
          </li>
          <li className="flex gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-ok" aria-hidden />
            include the change in the next applied batch (v{domain.currentThesis.version} → v
            {domain.currentThesis.version + 1});
          </li>
          <li className="flex gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-ok" aria-hidden />
            retain the original proposal, evidence, and uncertainty in the ledger.
          </li>
        </ul>
        <Field label="Note (optional)" htmlFor={`accept-note-${proposal.proposalId}`}>
          <input
            id={`accept-note-${proposal.proposalId}`}
            className={cn(inputClass, "mt-1")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Context for the decision record"
          />
        </Field>
      </Modal>

      {/* ------------------------------ Edit ------------------------------- */}
      <Modal
        open={modal === "edit"}
        onClose={closeModal}
        title="Edit the proposed change"
        wide
        footer={
          policy.allowed ? (
            <>
              <Button size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => act("edit", { editedPatch })}>
                Approve edited version
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => act("escalate", { escalatedToUserId: DEMO_USERS.pm.userId })}>
                <ArrowUpCircle size={13} aria-hidden />
                Escalate to PM instead
              </Button>
            </>
          )
        }
      >
        {!policy.allowed && (
          <InlineAlert tone="bad" icon={<ShieldAlert size={14} aria-hidden />} className="mb-3">
            <strong>Not authorized.</strong> {policy.message}
          </InlineAlert>
        )}
        <p className="text-[13px] text-ink-2">
          Your edit becomes a human-authored patch attributed to {actor.displayName}. The agent's original proposal is
          preserved in review history.
        </p>
        <div className="mt-3 space-y-3">
          {editedPatch.map((op, i) => (
            <PatchOpEditor
              key={i}
              op={op}
              lookup={lookup}
              onChange={(next) => setEditedPatch(editedPatch.map((o, j) => (j === i ? next : o)))}
            />
          ))}
        </div>
        {patchChanged && (
          <div className="mt-3 rounded-sm border border-line bg-inset p-2.5">
            <h4 className="text-[10px] font-semibold tracking-widest text-ink-3 uppercase">Difference vs agent proposal</h4>
            <ul className="mt-1 space-y-1 font-mono text-[11px]">
              {proposal.proposedPatch.map((op, i) => {
                const edited = editedPatch[i];
                if (!edited || JSON.stringify(op) === JSON.stringify(edited)) return null;
                const originalValue = "value" in op ? op.value : undefined;
                const editedValue = edited && "value" in edited ? edited.value : undefined;
                return (
                  <li key={i}>
                    <span className="text-bad line-through">
                      {typeof originalValue === "object" ? (originalValue as { question?: string }).question : String(originalValue)}
                    </span>{" "}
                    <span className="text-ok">
                      {typeof editedValue === "object" ? (editedValue as { question?: string }).question : String(editedValue)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <button
          className="mt-3 flex items-center gap-1 text-xs text-ink-3 hover:text-ink"
          onClick={() => setShowOriginal(!showOriginal)}
          aria-expanded={showOriginal}
        >
          <ChevronDown size={12} className={cn("transition-transform", showOriginal && "rotate-180")} aria-hidden />
          Agent original proposal
        </button>
        {showOriginal && (
          <ul className="mt-1.5 space-y-1 rounded-sm border border-dashed border-line-strong bg-inset p-2.5 font-mono text-[11px] text-ink-2">
            {proposal.proposedPatch.map((op, i) => (
              <li key={i}>{describePatchOp(op, lookup)}</li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Field label="Edit reason (encouraged)" htmlFor={`edit-note-${proposal.proposalId}`}>
            <input
              id={`edit-note-${proposal.proposalId}`}
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why the team's judgment differs"
            />
          </Field>
        </div>
      </Modal>

      {/* ----------------------------- Reject ------------------------------ */}
      <Modal
        open={modal === "reject"}
        onClose={closeModal}
        title="Reject this proposal"
        footer={
          <>
            <Button size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => act("reject", { reasonCode })}>
              Reject proposal
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">
          Rejecting records your decision in review history. The approved thesis is not modified.
        </p>
        <fieldset className="mt-3">
          <legend className="text-xs font-medium text-ink-2">Reason</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {REJECT_REASONS.map((r) => (
              <label
                key={r.code}
                className={cn(
                  "cursor-pointer rounded-sm border px-2 py-1 text-xs",
                  reasonCode === r.code
                    ? "border-accent/50 bg-accent-dim/40 text-ink"
                    : "border-line bg-panel-2 text-ink-2 hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name={`reject-reason-${proposal.proposalId}`}
                  value={r.code}
                  checked={reasonCode === r.code}
                  onChange={() => setReasonCode(r.code)}
                  className="sr-only"
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3">
          <Field label="Note (optional)" htmlFor={`reject-note-${proposal.proposalId}`}>
            <input
              id={`reject-note-${proposal.proposalId}`}
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
      </Modal>

      {/* ---------------------------- Escalate ----------------------------- */}
      <Modal
        open={modal === "escalate"}
        onClose={closeModal}
        title="Escalate to PM review"
        footer={
          <>
            <Button size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => act("escalate", { escalatedToUserId: DEMO_USERS.pm.userId })}>
              <ArrowUpCircle size={13} aria-hidden />
              Escalate
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">
          The proposal moves to the PM queue. The approved thesis is not modified until the PM approves it.
        </p>
        <div className="mt-3 space-y-3">
          <Field label="Escalate to">
            <select className={inputClass} defaultValue={DEMO_USERS.pm.userId} aria-label="Escalation target">
              <option value={DEMO_USERS.pm.userId}>{DEMO_USERS.pm.displayName}</option>
            </select>
          </Field>
          <Field label="Note for the PM (optional)" htmlFor={`escalate-note-${proposal.proposalId}`}>
            <input
              id={`escalate-note-${proposal.proposalId}`}
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What the PM should look at"
            />
          </Field>
        </div>
      </Modal>

      {/* ------------------------------ Defer ------------------------------ */}
      <Modal
        open={modal === "defer"}
        onClose={closeModal}
        title="Defer this proposal"
        footer={
          <>
            <Button size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => act("defer", { deferredUntil: `${deferUntil}T00:00:00Z` })}>
              <Clock4 size={13} aria-hidden />
              Defer
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">
          The proposal stays in the queue until the review date. The approved thesis is not modified.
        </p>
        <div className="mt-3 space-y-3">
          <Field label="Defer until" htmlFor={`defer-date-${proposal.proposalId}`}>
            <input
              id={`defer-date-${proposal.proposalId}`}
              type="date"
              className={inputClass}
              value={deferUntil}
              min="2026-07-14"
              onChange={(e) => setDeferUntil(e.target.value)}
            />
          </Field>
          <Field label="Note (optional)" htmlFor={`defer-note-${proposal.proposalId}`}>
            <input
              id={`defer-note-${proposal.proposalId}`}
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What needs to happen first"
            />
          </Field>
        </div>
      </Modal>
    </article>
  );
}
