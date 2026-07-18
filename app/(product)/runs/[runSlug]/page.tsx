"use client";

/**
 * Run Observatory — deterministic replay with a dual-pane layout:
 * runtime timeline on the left, structured-object inspector on the right.
 * Every animated event is a real fixture event; no hidden chain of thought.
 */
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Play,
  RotateCw,
  TriangleAlert,
  Cpu,
  UserRound,
  Settings2,
  FileText,
  CheckCircle2,
  XCircle,
  CircleDot,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Badge, Button, InlineAlert, Kv, Panel } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { useDemoStore } from "@/store/demo-store";
import {
  getRunBundle,
  proposalsForRun,
  getSourceDocument,
  degradedBlockedProposalIds,
  successProposals,
} from "@/fixtures/loader";
import { useClientRuntime } from "@/runtime/client-context";
import { formatDateTime, formatDuration, runSlugToId, runIdToSlug, runStatusMeta } from "@/lib/labels";
import type { RunEvent, RunEventType } from "@/domain/types";

const EVENT_ICON: Partial<Record<RunEventType, React.ReactNode>> = {
  run_created: <CircleDot size={13} aria-hidden />,
  source_loaded: <FileText size={13} aria-hidden />,
  source_unavailable: <TriangleAlert size={13} aria-hidden />,
  task_assigned: <Settings2 size={13} aria-hidden />,
  agent_started: <Cpu size={13} aria-hidden />,
  finding_created: <CircleDot size={13} aria-hidden />,
  validation_passed: <CheckCircle2 size={13} aria-hidden />,
  validation_failed: <XCircle size={13} aria-hidden />,
  proposal_created: <FileText size={13} aria-hidden />,
  review_required: <UserRound size={13} aria-hidden />,
  degraded_mode_entered: <TriangleAlert size={13} aria-hidden />,
  run_completed: <CheckCircle2 size={13} aria-hidden />,
  run_failed: <XCircle size={13} aria-hidden />,
};

const EVENT_TONE: Partial<Record<RunEventType, string>> = {
  source_unavailable: "text-bad",
  degraded_mode_entered: "text-warn",
  validation_passed: "text-ok",
  validation_failed: "text-bad",
  run_completed: "text-ok",
  run_failed: "text-bad",
  agent_started: "text-accent",
};

const AGENT_NAMES: Record<string, string> = {
  facts_numbers: "Facts & Numbers Analyst",
  thesis_impact: "Thesis Impact Analyst",
  risk_counterevidence: "Risk & Counterevidence Analyst",
  judge_composer: "Judge / Delta Composer",
};

function EventInspector({ event, nextEventAt, runId }: { event: RunEvent; nextEventAt?: string; runId: string }) {
  const runProposals = proposalsForRun(runId);
  const duration = nextEventAt
    ? formatDuration(new Date(nextEventAt).getTime() - new Date(event.occurredAt).getTime())
    : "Not available";

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <span className={EVENT_TONE[event.eventType] ?? "text-ink-2"}>{EVENT_ICON[event.eventType]}</span>
          <h3 className="font-mono text-[13px] font-semibold text-ink">{event.eventType}</h3>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{event.publicMessage}</p>
      </div>

      <dl className="rounded-sm border border-line bg-inset px-3 py-1">
        <Kv label="Event ID" mono>
          {event.runEventId}
        </Kv>
        <Kv label="Actor">
          {event.actorType === "agent" ? (AGENT_NAMES[event.actorId] ?? event.actorId) : event.actorId}
          <span className="ml-1.5 text-ink-3">({event.actorType})</span>
        </Kv>
        <Kv label="Occurred (UTC)">{formatDateTime(event.occurredAt)}</Kv>
        <Kv label="Step duration" mono>
          {duration}
        </Kv>
      </dl>

      {event.objectRefs.length > 0 && (
        <div>
          <h4 className="mb-1 text-[11px] font-semibold tracking-widest text-ink-3 uppercase">Object references</h4>
          <ul className="space-y-1">
            {event.objectRefs.map((ref) => {
              const isProposal = ref.startsWith("proposal_");
              const source = getSourceDocument(ref);
              return (
                <li key={ref}>
                  {isProposal ? (
                    <Link
                      href={`/deltas/${ref}`}
                      className="flex items-center gap-1.5 rounded-sm border border-line bg-inset px-2 py-1 font-mono text-[11px] text-accent hover:border-accent/50"
                    >
                      {ref}
                      <ArrowRight size={11} aria-hidden />
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-sm border border-line bg-inset px-2 py-1 font-mono text-[11px] text-ink-2">
                      {ref}
                      {source && <span className="truncate text-ink-3">- {source.title}</span>}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {event.eventType === "proposal_created" && (
        <div>
          <h4 className="mb-1 text-[11px] font-semibold tracking-widest text-ink-3 uppercase">Structured output</h4>
          <ul className="space-y-1">
            {runProposals.map((p) => (
              <li key={p.proposalId}>
                <Link
                  href={`/deltas/${p.proposalId}`}
                  className="block rounded-sm border border-line bg-inset px-2 py-1.5 hover:border-accent/50"
                >
                  <span className="block truncate text-xs text-ink">{p.headline}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-ink-3">
                    {p.proposalId} · {p.materiality} materiality · reviewer: {p.requiredReviewerRole.toUpperCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {event.eventType === "review_required" && (
        <InlineAlert tone="info" icon={<UserRound size={14} aria-hidden />}>
          No canonical state changes without an authorized human review. Open the proposals to accept, edit, reject,
          escalate, or defer.
        </InlineAlert>
      )}
    </div>
  );
}

export default function RunObservatoryPage({ params }: { params: Promise<{ runSlug: string }> }) {
  const { runSlug } = use(params);
  const runId = runSlugToId[runSlug];
  const bundle = runId ? getRunBundle(runId) : undefined;

  const playback = useDemoStore((s) => (runId ? s.runPlayback[runId] : undefined));
  const setPlayback = useDemoStore((s) => s.setPlayback);
  const setTranscriptUnavailable = useDemoStore((s) => s.setTranscriptUnavailable);
  const transcriptUnavailable = useDemoStore((s) => s.transcriptUnavailable);
  const { analysisAdapter: adapter, capabilities } = useClientRuntime();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!runId || !bundle) notFound();

  const run = bundle.workflowRun;
  const isDegraded = run.status === "degraded";
  const visibleCount = playback?.visibleEvents ?? 0;
  const playing = playback?.status === "playing";
  const visibleEvents = bundle.events.slice(0, visibleCount);
  const selected = selectedIndex !== null ? bundle.events[selectedIndex] : visibleEvents[visibleEvents.length - 1];
  const selectedIdx = selectedIndex ?? visibleEvents.length - 1;
  const statusMeta = playing
    ? runStatusMeta.running
    : visibleCount === 0
      ? { label: "Recorded · not replayed", tone: "neutral" as const, icon: <CircleDot size={12} aria-hidden /> }
      : runStatusMeta[run.status];
  const totalDuration = run.completedAt
    ? formatDuration(new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime())
    : "Not available";

  const replay = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (isDegraded) setTranscriptUnavailable(true);
    setPlayback(runId, { status: "playing", visibleEvents: 0 });
    setSelectedIndex(null);
    let count = 0;
    try {
      for await (const _event of adapter.run({
        caseId: run.caseId,
        domainEventId: run.domainEventId,
        runKind: isDegraded ? "degraded" : "success",
        signal: controller.signal,
      })) {
        count++;
        setPlayback(runId, { status: "playing", visibleEvents: count });
      }
      setPlayback(runId, { status: "completed", visibleEvents: count });
    } catch {
      // Replay aborted (navigation or restart) — persisted count stays as-is.
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-ink">Run Observatory</h1>
            <Badge tone={statusMeta.tone} icon={statusMeta.icon}>
              {statusMeta.label}
            </Badge>
            <Badge tone={capabilities.analysis.state === "fixture" ? "neutral" : "warn"}>
              {capabilities.analysis.label}
            </Badge>
            <Badge tone={bundle.synthetic ? "warn" : "ok"} outlined>
              {bundle.synthetic ? "Synthetic scenario" : "Real-public inputs · demo-derived outputs"}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-ink-3">
            {run.runId} · earnings_to_thesis v{run.workflowVersion} · total {totalDuration}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={replay} disabled={playing}>
            {visibleCount > 0 ? <RotateCw size={13} aria-hidden /> : <Play size={13} aria-hidden />}
            {playing ? "Replaying…" : visibleCount > 0 ? "Replay deterministic demo" : "Replay deterministic demo"}
          </Button>
          <Link href={`/runs/${isDegraded ? "run-msft-fy25q4" : "run-arct-degraded"}`}>
            <Button size="sm">
              {isDegraded ? "View real-public scenario" : "View synthetic degraded fallback"}
              <ArrowRight size={13} aria-hidden />
            </Button>
          </Link>
          <Link href={`/trust/${runIdToSlug[run.runId]}`}>
            <Button size="sm">
              <ShieldCheck size={13} aria-hidden />
              Privacy receipt
            </Button>
          </Link>
        </div>
      </header>

      {isDegraded && (transcriptUnavailable || visibleCount > 0) && (
        <InlineAlert tone="warn" icon={<TriangleAlert size={14} aria-hidden />} className="mt-3">
          <strong>Analysis completed with gaps.</strong> The earnings-call transcript was unavailable, so
          management-guidance interpretation is not proposed for approval. Valid partial findings are retained;{" "}
          {degradedBlockedProposalIds.length} transcript-dependent proposals are blocked and fail closed.
        </InlineAlert>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {/* Timeline */}
        <Panel
          title={`Runtime timeline · ${visibleCount}/${bundle.events.length} events`}
          className="lg:col-span-3"
          bodyClassName="p-0"
        >
          {visibleCount === 0 && !playing ? (
            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
              <Play size={20} className="text-ink-3" aria-hidden />
              <p className="text-sm text-ink-2">This run has not been replayed in your session yet.</p>
              <p className="text-xs text-ink-3">
                Replay emits the recorded runtime events deterministically: same input, same events, same order.
              </p>
              <Button variant="primary" size="sm" onClick={replay} className="mt-1">
                <Play size={13} aria-hidden />
                Replay deterministic demo
              </Button>
            </div>
          ) : (
            <ol aria-live="polite" className="max-h-[520px] overflow-y-auto">
              {visibleEvents.map((event, i) => {
                const next = bundle.events[i + 1];
                const duration = next
                  ? formatDuration(new Date(next.occurredAt).getTime() - new Date(event.occurredAt).getTime())
                  : "Not available";
                const active = i === selectedIdx;
                return (
                  <li key={event.runEventId} className="animate-event-in">
                    <button
                      onClick={() => setSelectedIndex(i)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-center gap-2.5 border-b border-line/60 px-3 py-2 text-left transition-colors",
                        active ? "bg-accent-dim/30" : "hover:bg-panel-2/60",
                      )}
                    >
                      <span className={cn("shrink-0", EVENT_TONE[event.eventType] ?? "text-ink-3")}>
                        {EVENT_ICON[event.eventType] ?? <CircleDot size={13} aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">{event.publicMessage}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-ink-3">
                          {event.eventType} ·{" "}
                          {event.actorType === "agent" ? (AGENT_NAMES[event.actorId] ?? event.actorId) : event.actorId}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-ink-3 tnum">{duration}</span>
                    </button>
                  </li>
                );
              })}
              {playing && (
                <li className="flex items-center gap-2 px-3 py-2 text-xs text-ink-3">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
                  streaming events…
                </li>
              )}
            </ol>
          )}
        </Panel>

        {/* Inspector */}
        <div className="space-y-3 lg:col-span-2">
          <Panel title="Event inspector">
            {selected ? (
              <EventInspector
                event={selected}
                nextEventAt={bundle.events[selectedIdx + 1]?.occurredAt}
                runId={run.runId}
              />
            ) : (
              <p className="py-6 text-center text-[13px] text-ink-3">
                Replay the run, then select a timeline event to inspect its structured details.
              </p>
            )}
          </Panel>

          <Panel title="Run provenance">
            <dl>
              <Kv label="Mode">
                <Badge tone={capabilities.analysis.state === "fixture" ? "neutral" : "warn"}>
                  {capabilities.analysis.activeMode}
                </Badge>
              </Kv>
              <Kv label="Model route" mono>
                {run.modelRoutes[0]?.provider}/{run.modelRoutes[0]?.model}
              </Kv>
              <Kv label="Endpoint owner">{run.modelRoutes[0]?.endpointOwner}</Kv>
              <Kv label="Skills" mono>
                {Object.keys(run.skillVersions).length} @ v{Object.values(run.skillVersions)[0]}
              </Kv>
              <Kv label="Sources">
                {run.sourceRefs.length} loaded{isDegraded ? " · 1 unavailable" : ""}
              </Kv>
              {run.contextSetHash && (
                <Kv label="Context set" mono>
                  <span className="inline-block max-w-44 truncate align-bottom" title={run.contextSetHash}>{run.contextSetHash}</span>
                </Kv>
              )}
            </dl>
            {run.degradedReasons.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {run.degradedReasons.map((reason) => (
                  <InlineAlert key={reason.code} tone="warn" icon={<TriangleAlert size={13} aria-hidden />}>
                    <span className="font-mono text-[11px]">{reason.code}</span>: {reason.message}
                    <span className="mt-1 block font-mono text-[10px] text-ink-3">
                      affects: {reason.affectedObjectRefs.join(", ")} · recoverable: {String(reason.recoverable)}
                    </span>
                  </InlineAlert>
                ))}
              </div>
            )}
          </Panel>

          {run.contextUsage && (
            <Panel title={`Declared inputs · ${run.contextUsage.filter((item) => item.status === "used").length} used`} bodyClassName="space-y-1.5">
              {run.contextUsage.map((item) => (
                <div key={item.artifactId} className="rounded-[3px] border border-line bg-inset p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[10px] text-ink">{item.artifactId}</span>
                    <Badge tone={item.status === "used" ? "ok" : item.status === "excluded" ? "warn" : "neutral"}>{item.status}</Badge>
                  </div>
                  <p className="mt-1 text-[10px] text-ink-3">{item.originKind.replaceAll("_", " ")} · {item.reason}</p>
                </div>
              ))}
              <Link href="/context" className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                Inspect provenance in Context Library <ArrowRight size={11} aria-hidden />
              </Link>
            </Panel>
          )}

          {(playback?.status === "completed" || visibleCount === bundle.events.length) && visibleCount > 0 && (
            <Link href={`/deltas/${proposalsForRun(run.runId)[0]?.proposalId ?? successProposals[0]!.proposalId}`} className="block">
              <Button variant="primary" size="sm" className="w-full">
                Review {run.outputProposalIds.length} thesis delta proposals
                <ArrowRight size={13} aria-hidden />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
