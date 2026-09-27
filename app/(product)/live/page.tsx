"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleDot, FileUp, KeyRound, Play, Radio, ShieldAlert, Trash2 } from "lucide-react";
import { Badge, Button, Field, InlineAlert, Panel, inputClass } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/labels";
import { THESIS_PRESETS } from "@/live/presets";
import { useLiveStore } from "@/store/live-store";
import type { RunEvent } from "@/domain/types";
import type { LiveRunResult } from "@/engine/analysis/run";
import { verifyLiveRunResult } from "@/engine/analysis/verify";

interface LiveStatus {
  enabled: boolean;
  requiresToken: boolean;
  reason: string | null;
  provider: string | null;
  model: string | null;
  effort: string | null;
}

const REASON_TEXT: Record<string, string> = {
  provider_key_missing: "No model provider key is configured on this server.",
  sec_user_agent_missing: "DELPHI_SEC_USER_AGENT is not configured (required by SEC EDGAR).",
  access_token_missing: "Live runs are disabled in production until DELPHI_LIVE_ACCESS_TOKEN is set.",
};

type Phase = { kind: "idle" } | { kind: "running"; ticker: string; startedAt: number } | { kind: "error"; message: string };

export default function LiveDeskPage() {
  const router = useRouter();
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [ticker, setTicker] = useState(THESIS_PRESETS[0]!.ticker);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [now, setNow] = useState(Date.now());
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const { order, workspaces, accessToken, setAccessToken, saveRun, removeRun } = useLiveStore();

  useEffect(() => {
    fetch("/api/live/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ enabled: false, requiresToken: false, reason: null, provider: null, model: null, effort: null }));
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (phase.kind !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase.kind]);

  const preset = THESIS_PRESETS.find((p) => p.ticker === ticker)!;

  async function start() {
    const controller = new AbortController();
    abortRef.current = controller;
    setEvents([]);
    setPhase({ kind: "running", ticker, startedAt: Date.now() });
    try {
      const res = await fetch("/api/live/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { "x-delphi-live-token": accessToken } : {}) },
        body: JSON.stringify({ ticker }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: LiveRunResult | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line) as
            | { type: "event"; event: RunEvent }
            | { type: "result"; result: LiveRunResult }
            | { type: "error"; message: string };
          if (msg.type === "event") setEvents((prev) => [...prev, msg.event]);
          else if (msg.type === "result") result = msg.result;
          else throw new Error(msg.message);
        }
      }
      if (!result) throw new Error("The run ended without a result.");
      saveRun(result);
      router.push(`/live/${result.run.workflowRun.runId}`);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setPhase({ kind: "error", message: (error as Error).message });
    }
  }

  async function importFile(file: File) {
    setImportErrors(null);
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setImportErrors(["The file is not valid JSON."]);
      return;
    }
    const outcome = verifyLiveRunResult(raw);
    if (!outcome.ok) {
      setImportErrors(outcome.errors);
      return;
    }
    saveRun(outcome.result);
    router.push(`/live/${outcome.result.run.workflowRun.runId}`);
  }

  const running = phase.kind === "running";
  const elapsed = running ? Math.max(0, Math.round((now - phase.startedAt) / 1000)) : 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Live Desk</h1>
        <Badge tone="ok" icon={<Radio size={11} aria-hidden />}>Real SEC filings</Badge>
        {status?.enabled && (
          <Badge tone="neutral">
            {status.provider}/{status.model} · effort {status.effort}
          </Badge>
        )}
      </div>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-2">
        Pull the latest earnings release from SEC EDGAR and compare it against a team thesis. Every quote is verified word-for-word against the filing and every number is checked against the source. Anything that fails is blocked and shown with its reason. Nothing changes the thesis until someone approves it.{" "}
        <Link href="/guide#quick-start" className="text-accent hover:underline">New here? Read the 5-minute guide →</Link>
      </p>

      {status && !status.enabled && (
        <InlineAlert tone="warn" icon={<ShieldAlert size={14} aria-hidden />} className="mt-4">
          {REASON_TEXT[status.reason ?? ""] ?? "Live analysis is not available."} Saved runs below remain reviewable.
        </InlineAlert>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="1 · Choose a thesis">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Thesis preset">
            {THESIS_PRESETS.map((p) => (
              <button
                key={p.ticker}
                type="button"
                role="radio"
                aria-checked={ticker === p.ticker}
                disabled={running}
                onClick={() => setTicker(p.ticker)}
                className={cn(
                  "rounded-[3px] border px-3 py-2 text-left transition-colors disabled:opacity-60",
                  ticker === p.ticker ? "border-accent bg-accent-dim/40" : "border-line hover:border-line-strong hover:bg-inset",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-ink">{p.ticker}</span>
                  <span className="text-[10px] text-ink-3">{p.sector}</span>
                </div>
                <div className="text-xs text-ink-2">{p.companyName}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-[3px] border border-line bg-inset p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-ink">Thesis v{preset.thesis.version}</span>
              <Badge tone="warn" outlined>Demo-authored</Badge>
              <span className="text-[10px] text-ink-3">
                {preset.thesis.pillars.length} pillars · {preset.thesis.forecasts.length} forecasts · {preset.thesis.risks.length} risks
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">{preset.thesis.summary}</p>
            <p className="mt-1 text-[10px] text-ink-3">{preset.thesis.authorshipLabel}</p>
          </div>
        </Panel>

        <Panel title="2 · Run on the latest filing">
          <div className="space-y-3">
            {status?.requiresToken && (
              <Field label="Live-access token" htmlFor="live-token" hint="Required on shared deployments; stored only in this browser.">
                <div className="relative">
                  <KeyRound size={13} aria-hidden className="absolute top-2.5 left-2.5 text-ink-3" />
                  <input
                    id="live-token"
                    type="password"
                    autoComplete="off"
                    className={cn(inputClass, "pl-8")}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                  />
                </div>
              </Field>
            )}
            <Button variant="primary" className="w-full" disabled={!status?.enabled || running} onClick={start}>
              <Play size={13} aria-hidden />
              {running ? `Analyzing ${phase.ticker}… ${elapsed}s` : `Analyze ${ticker}'s latest earnings release`}
            </Button>
            {running && (
              <Button size="sm" variant="ghost" className="w-full" onClick={() => { abortRef.current?.abort(); setPhase({ kind: "idle" }); }}>
                Cancel
              </Button>
            )}
            {phase.kind === "error" && <InlineAlert tone="bad">{phase.message}</InlineAlert>}
            <ol className="space-y-1" aria-live="polite" aria-label="Run progress">
              {events.map((e) => (
                <li key={e.runEventId} className="flex gap-2 text-[11px] leading-snug">
                  <CircleDot
                    size={11}
                    aria-hidden
                    className={cn(
                      "mt-0.5 shrink-0",
                      e.eventType === "validation_failed" ? "text-bad" : e.eventType === "degraded_mode_entered" ? "text-warn" : "text-accent",
                    )}
                  />
                  <span className="text-ink-2">{e.publicMessage}</span>
                </li>
              ))}
              {running && events.length > 0 && (
                <li className="pl-5 text-[11px] text-ink-3">Model is reading the filing against the thesis — typically 40–120s.</li>
              )}
            </ol>
          </div>
        </Panel>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold tracking-[0.075em] text-ink-2 uppercase">Saved live runs</h2>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Import run file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <FileUp size={12} aria-hidden /> Import run file
          </Button>
        </div>
      </div>
      {importErrors && (
        <InlineAlert tone="bad" className="mt-2">
          <div className="font-semibold">Import rejected — the file failed re-verification.</div>
          <ul className="mt-1 list-disc pl-4">
            {importErrors.slice(0, 6).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </InlineAlert>
      )}
      {order.length === 0 ? (
        <p className="mt-2 text-xs text-ink-3">No live runs yet in this browser.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[3px] border border-line bg-panel">
          {order.map((id) => {
            const ws = workspaces[id];
            if (!ws) return null;
            const r = ws.result;
            const secs = (Date.parse(r.run.workflowRun.completedAt ?? r.run.workflowRun.startedAt) - Date.parse(r.run.workflowRun.startedAt)) / 1000;
            return (
              <li key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <span className="font-mono text-sm font-semibold text-ink">{r.event.entityId.replace("entity_", "").toUpperCase()}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-2">{r.event.title}</span>
                <Badge tone="accent">{r.proposals.length} to review</Badge>
                {r.blockedProposals.length > 0 && <Badge tone="bad">{r.blockedProposals.length} blocked</Badge>}
                <span className="text-[10px] text-ink-3">{secs.toFixed(0)}s · {formatDateTime(r.run.workflowRun.startedAt)}</span>
                <Link href={`/live/${id}`}>
                  <Button size="sm">Open <ArrowRight size={12} aria-hidden /></Button>
                </Link>
                <Button size="sm" variant="ghost" aria-label={`Delete run ${id}`} onClick={() => removeRun(id)}>
                  <Trash2 size={12} aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
