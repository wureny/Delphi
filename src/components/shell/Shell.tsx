"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  Briefcase,
  Activity,
  BookOpenCheck,
  ShieldCheck,
  RotateCcw,
  Search,
  FlaskConical,
  TriangleAlert,
  UserRound,
  Landmark,
  Network,
  DatabaseZap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge, Button, Modal } from "@/components/ui/primitives";
import { ToastViewport, useToasts } from "@/components/ui/toast";
import { useDemoStore } from "@/store/demo-store";
import { allProposals, arctCase } from "@/fixtures/loader";
import type { DemoRole } from "@/domain/types";
import type { RuntimeCapabilities } from "@/runtime/config";
import { RuntimeProvider } from "@/runtime/client-context";

const NAV = [
  { href: "/", label: "Change Inbox", icon: Inbox },
  { href: "/cases", label: "Cases", icon: Briefcase },
  { href: "/runs", label: "Runs", icon: Activity },
  { href: "/ledger", label: "Decision Ledger", icon: BookOpenCheck },
  { href: "/trust", label: "Trust", icon: ShieldCheck },
];

interface SearchTarget {
  label: string;
  hint: string;
  href: string;
}

function useSearchTargets(): SearchTarget[] {
  return useMemo(
    () => [
      { label: "Change Inbox", hint: "Page", href: "/" },
      { label: `${arctCase.companyName} (${arctCase.ticker})`, hint: "Investment case", href: "/cases/arct-demo" },
      { label: "Decision Ledger", hint: "Page", href: "/ledger" },
      { label: "Successful run — FY26 Q2", hint: "Run Observatory", href: "/runs/run-arct-success" },
      { label: "Degraded run — transcript unavailable", hint: "Run Observatory", href: "/runs/run-arct-degraded" },
      { label: "Privacy Receipt", hint: "Trust", href: "/trust/run-arct-success" },
      { label: "Graph Projection Debug", hint: "Internal debug", href: "/debug/graph" },
      { label: "Fund Context Boundary", hint: "Internal debug", href: "/debug/context" },
      ...allProposals.map((p) => ({
        label: p.headline,
        hint: "Thesis delta",
        href: `/deltas/${p.proposalId}`,
      })),
    ],
    [],
  );
}

function GlobalSearch() {
  const router = useRouter();
  const targets = useSearchTargets();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = query.trim()
    ? targets.filter((t) => t.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7)
    : [];

  return (
    <div className="relative hidden min-w-0 flex-1 max-w-md md:block">
      <Search size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-label="Search cases, deltas, and pages"
        placeholder="Search cases, deltas, runs…  ( / )"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) {
            router.push(results[0].href);
            setQuery("");
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        className="w-full rounded-sm border border-line bg-inset py-1 pr-2 pl-7 text-xs text-ink placeholder:text-ink-3 focus:border-accent/50"
      />
      {open && results.length > 0 && (
        <ul className="absolute top-full right-0 left-0 z-40 mt-1 overflow-hidden rounded-sm border border-line-strong bg-panel-2 shadow-xl">
          {results.map((r) => (
            <li key={r.href + r.label}>
              <button
                className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-accent-dim/30"
                onMouseDown={(e) => {
                  e.preventDefault();
                  router.push(r.href);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="truncate text-ink">{r.label}</span>
                <span className="shrink-0 text-[10px] text-ink-3 uppercase">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoleSwitcher() {
  const role = useDemoStore((s) => s.role);
  const setRole = useDemoStore((s) => s.setRole);
  const push = useToasts((s) => s.push);
  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-2">
      <UserRound size={13} aria-hidden className="text-ink-3" />
      <span className="sr-only md:not-sr-only">Acting as</span>
      <select
        aria-label="Active reviewer role"
        value={role}
        onChange={(e) => {
          const next = e.target.value as DemoRole;
          setRole(next);
          push({
            tone: "info",
            title: next === "pm" ? "Now acting as PM (R. Okafor)" : "Now acting as Analyst (A. Chen)",
            detail: next === "pm" ? "PM can approve high-materiality changes." : "High-materiality changes will require escalation to the PM.",
          });
        }}
        className="rounded-sm border border-line bg-inset px-1.5 py-0.5 text-xs text-ink focus:border-accent/50"
      >
        <option value="analyst">Analyst — A. Chen</option>
        <option value="pm">PM — R. Okafor</option>
      </select>
    </label>
  );
}

function ResetButton({ compact = false }: { compact?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const resetDemo = useDemoStore((s) => s.resetDemo);
  const router = useRouter();
  const push = useToasts((s) => s.push);
  return (
    <>
      <Button variant={compact ? "ghost" : "secondary"} size="sm" onClick={() => setConfirming(true)}>
        <RotateCcw size={13} aria-hidden />
        Reset demo
      </Button>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Reset the demo?"
        footer={
          <>
            <Button size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetDemo();
                setConfirming(false);
                router.push("/");
                push({ tone: "ok", title: "Demo reset", detail: "Approved thesis restored to v12; reviews, transitions, and replays cleared." });
              }}
            >
              Reset to fixture state
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">This deterministically restores the pristine fixture state:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-2">
          <li>approved thesis returns to v12 (original fixture hash);</li>
          <li>all review actions and Decision Ledger transitions are removed;</li>
          <li>run replays and the degraded-source simulation are cleared.</li>
        </ul>
      </Modal>
    </>
  );
}

function RunHealth({ capabilities }: { capabilities: RuntimeCapabilities }) {
  const playback = useDemoStore((s) => s.runPlayback);
  const anyPlaying = Object.values(playback).some((p) => p.status === "playing");
  return (
    <Badge tone={anyPlaying ? "accent" : "neutral"} icon={<Activity size={11} aria-hidden />}>
      {anyPlaying ? "Run replaying" : capabilities.analysis.label}
    </Badge>
  );
}

function DemoControls() {
  const transcriptUnavailable = useDemoStore((s) => s.transcriptUnavailable);
  const setTranscriptUnavailable = useDemoStore((s) => s.setTranscriptUnavailable);
  const version = useDemoStore((s) => s.domain.currentThesis.version);
  const router = useRouter();
  const push = useToasts((s) => s.push);

  return (
    <div className="space-y-2 border-t border-line px-3 py-3">
      <p className="text-[10px] font-semibold tracking-widest text-ink-3 uppercase">Demo controls</p>
      <div className="flex flex-col items-start gap-1">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push("/debug/context")}>
          <DatabaseZap size={13} aria-hidden />
          Fund context boundary
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push("/debug/graph")}>
          <Network size={13} aria-hidden />
          Graph projection debug
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push("/runs/run-arct-success")}>
          <Activity size={13} aria-hidden />
          Replay successful run
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full justify-start", transcriptUnavailable && "text-warn")}
          aria-pressed={transcriptUnavailable}
          onClick={() => {
            const next = !transcriptUnavailable;
            setTranscriptUnavailable(next);
            if (next) {
              push({
                tone: "warn",
                title: "Degraded source simulated",
                detail: "The earnings-call transcript is now unavailable. Transcript-dependent approvals fail closed.",
              });
              router.push("/runs/run-arct-degraded");
            } else {
              push({ tone: "info", title: "Transcript restored", detail: "All sources are available again." });
            }
          }}
        >
          <TriangleAlert size={13} aria-hidden />
          {transcriptUnavailable ? "Restore transcript source" : "Simulate degraded source"}
        </Button>
        <div className="w-full px-2 py-1">
          <ResetButton compact />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-sm border border-line bg-inset px-2 py-1.5">
        <span className="text-[11px] text-ink-3">Approved thesis</span>
        <span className="font-mono text-xs text-ink tnum">v{version}</span>
      </div>
    </div>
  );
}

export function Shell({
  capabilities,
  children,
}: {
  capabilities: RuntimeCapabilities;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hydrated = useDemoStore((s) => s.hydrated);

  return (
    <RuntimeProvider capabilities={capabilities}>
      <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-accent focus:px-3 focus:py-1 focus:text-canvas"
      >
        Skip to content
      </a>

      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-line bg-panel px-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-sm border border-accent/40 bg-accent-dim/40">
            <Landmark size={13} className="text-accent" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink">Delphi</span>
          <span className="hidden text-xs text-ink-3 sm:inline">· Meridian Demo Fund — Research</span>
        </Link>
        <GlobalSearch />
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <Badge tone="warn" icon={<FlaskConical size={11} aria-hidden />} title="All entities, figures, and events are synthetic.">
            <span className="hidden sm:inline">Synthetic demo data</span>
            <span className="sm:hidden">Synthetic</span>
          </Badge>
          <div className="hidden lg:block">
            <RunHealth capabilities={capabilities} />
          </div>
          <RoleSwitcher />
          <div className="hidden lg:block">
            <ResetButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav aria-label="Primary" className="sticky top-12 hidden h-[calc(100vh-3rem)] w-52 shrink-0 flex-col justify-between border-r border-line bg-panel md:flex">
          <ul className="space-y-0.5 p-2">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-[13px] transition-colors",
                      active ? "bg-accent-dim/40 font-medium text-ink" : "text-ink-2 hover:bg-panel-2 hover:text-ink",
                    )}
                  >
                    <Icon size={15} aria-hidden className={active ? "text-accent" : "text-ink-3"} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <DemoControls />
        </nav>

        {/* Mobile nav */}
        <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-panel md:hidden">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
                  active ? "text-accent" : "text-ink-3",
                )}
              >
                <Icon size={16} aria-hidden />
                {label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>

        <main id="main" className="min-w-0 flex-1 pb-16 md:pb-0">
          {hydrated ? (
            children
          ) : (
            <div className="p-6" aria-busy="true" aria-label="Loading demo state">
              <div className="h-5 w-44 animate-pulse rounded-sm bg-panel-2" />
              <div className="mt-4 h-24 animate-pulse rounded-md bg-panel-2" />
              <div className="mt-2 h-24 animate-pulse rounded-md bg-panel-2" />
            </div>
          )}
        </main>
      </div>
      <ToastViewport />
      </div>
    </RuntimeProvider>
  );
}
