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
import { allProposals, arctCase, defaultCase } from "@/fixtures/loader";
import type { DemoRole } from "@/domain/types";
import type { RuntimeCapabilities } from "@/runtime/config";
import { RuntimeProvider } from "@/runtime/client-context";

const NAV = [
  { href: "/demo", label: "Change Inbox", icon: Inbox },
  { href: "/cases", label: "Cases", icon: Briefcase },
  { href: "/context", label: "Context", icon: DatabaseZap },
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
      { label: "Change Inbox", hint: "Page", href: "/demo" },
      { label: `${defaultCase.companyName} (${defaultCase.ticker})`, hint: "Real-public case", href: "/cases/msft-fy25q4" },
      { label: `${arctCase.companyName} (${arctCase.ticker})`, hint: "Investment case", href: "/cases/arct-demo" },
      { label: "Context Library", hint: "Case inputs", href: "/context" },
      { label: "Decision Ledger", hint: "Page", href: "/ledger" },
      { label: "Microsoft FY2025 Q4 run", hint: "Run Observatory", href: "/runs/run-msft-fy25q4" },
      { label: "Degraded run - transcript unavailable", hint: "Run Observatory", href: "/runs/run-arct-degraded" },
      { label: "Privacy Receipt", hint: "Trust", href: "/trust/run-msft-fy25q4" },
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
  const [activeIndex, setActiveIndex] = useState(0);
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
    <div className="relative hidden min-w-0 max-w-sm flex-1 md:block xl:max-w-md">
      <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-autocomplete="list"
        aria-controls="global-search-results"
        aria-activedescendant={open && results[activeIndex] ? `global-search-option-${activeIndex}` : undefined}
        aria-label="Search cases, deltas, and pages"
        placeholder="Search cases, deltas, runs…  ( / )"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && results.length > 0) {
            e.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, results.length - 1));
          } else if (e.key === "ArrowUp" && results.length > 0) {
            e.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter" && results[activeIndex]) {
            router.push(results[activeIndex].href);
            setQuery("");
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        className="h-8 w-full rounded-[3px] border border-line-strong bg-panel py-1 pr-2 pl-8 text-[11px] text-ink placeholder:text-ink-3 focus:border-accent"
      />
      {open && results.length > 0 && (
        <ul id="global-search-results" role="listbox" className="absolute top-full right-0 left-0 z-40 mt-1 overflow-hidden rounded-[3px] border border-line-strong bg-panel shadow-[0_14px_34px_rgba(21,32,41,0.14)]">
          {results.map((r, index) => (
            <li key={r.href + r.label} role="none">
              <button
                id={`global-search-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full items-center justify-between gap-2 border-b border-line px-3 py-2 text-left text-xs last:border-0 hover:bg-inset",
                  index === activeIndex && "bg-inset",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  router.push(r.href);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="truncate text-ink">{r.label}</span>
                <span className="shrink-0 text-[9px] font-semibold tracking-[0.07em] text-ink-3 uppercase">{r.hint}</span>
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
    <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
      <UserRound size={13} aria-hidden className="hidden text-ink-3 xl:block" />
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
        className="h-8 max-w-32 rounded-[3px] border border-line-strong bg-panel px-2 text-[11px] text-ink focus:border-accent sm:max-w-40"
      >
        <option value="analyst">Analyst - A. Chen</option>
        <option value="pm">PM - R. Okafor</option>
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
                router.push("/demo");
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
          <li>the MSFT demo thesis and synthetic fallback return to their pristine v12 hashes;</li>
          <li>all review actions and Decision Ledger transitions are removed;</li>
          <li>run replays, local context previews, and the degraded-source simulation are cleared.</li>
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
    <div className="space-y-2.5 border-t border-line px-3 py-4">
      <p className="text-[9px] font-semibold tracking-[0.12em] text-ink-3 uppercase">Demo controls</p>
      <div className="flex flex-col items-start gap-0.5">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push("/context")}>
          <DatabaseZap size={13} aria-hidden />
          Context Library
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push("/debug/graph")}>
          <Network size={13} aria-hidden />
          Graph projection debug
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => router.push("/runs/run-msft-fy25q4")}>
          <Activity size={13} aria-hidden />
          Replay MSFT FY25 Q4
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
        <div className="w-full">
          <ResetButton compact />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-2.5">
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
      <div className="flex min-h-[100dvh] flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-accent focus:px-3 focus:py-1 focus:text-canvas"
      >
        Skip to content
      </a>

      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-line-strong bg-panel">
        <Link href="/demo" className="flex h-full w-32 shrink-0 items-center gap-2 border-r border-line px-3 md:w-56 md:gap-2.5 md:px-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[3px] bg-ink">
            <Landmark size={14} className="text-white" strokeWidth={1.7} aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-[-0.025em] text-ink md:text-[15px]">Delphi</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-4 px-3 lg:px-5">
          <span className="hidden truncate text-[11px] text-ink-3 xl:block">Meridian Demo Fund - Research</span>
          <GlobalSearch />
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 px-2 sm:gap-2 sm:px-3 lg:px-5">
          <Badge tone="ok" icon={<ShieldCheck size={11} aria-hidden />} title="Official public sources are combined with an explicitly demo-authored investment thesis.">
            <span className="hidden sm:inline">Real sources + demo thesis</span>
            <span className="sm:hidden">Mixed origin</span>
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
        <nav aria-label="Primary" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 flex-col justify-between border-r border-line bg-panel-2/70 md:flex">
          <ul className="space-y-0.5 px-2 py-4">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/demo" ? pathname === "/demo" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-9 items-center gap-2.5 rounded-[3px] border px-3 py-2 text-xs",
                      active
                        ? "border-line bg-panel font-semibold text-ink shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-0.5 before:bg-accent"
                        : "border-transparent text-ink-2 hover:border-line hover:bg-panel/70 hover:text-ink",
                    )}
                  >
                    <Icon size={15} strokeWidth={1.65} aria-hidden className={active ? "text-accent" : "text-ink-3"} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <DemoControls />
        </nav>

        {/* Mobile nav */}
        <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line-strong bg-panel md:hidden">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/demo" ? pathname === "/demo" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[9px] font-medium",
                  active ? "bg-accent-dim/45 text-accent" : "text-ink-3",
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
              <div className="h-5 w-44 animate-pulse rounded-[3px] bg-panel-2" />
              <div className="mt-4 h-24 animate-pulse rounded-[3px] bg-panel-2" />
              <div className="mt-2 h-24 animate-pulse rounded-[3px] bg-panel-2" />
            </div>
          )}
        </main>
      </div>
      <ToastViewport />
      </div>
    </RuntimeProvider>
  );
}
