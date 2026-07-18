"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronRight,
  Database,
  ExternalLink,
  FilePlus2,
  FileText,
  Filter,
  FolderInput,
  Info,
  Link2,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge, Button, Drawer, Field, InlineAlert, Modal, Panel } from "@/components/ui/primitives";
import { useToasts } from "@/components/ui/toast";
import { contextSetHash } from "@/context/fund-context";
import { LOCAL_IMPORT_ACCEPT, parseLocalContextFile } from "@/context/local-import";
import type {
  CaseContextBinding,
  FundContextArtifact,
  FundContextRole,
  LocalContextArtifact,
  OriginKind,
} from "@/domain/types";
import { defaultCase, defaultContextManifest } from "@/fixtures/loader";
import { useDemoStore } from "@/store/demo-store";
import { cn } from "@/lib/cn";

const ROLE_LABELS: Record<FundContextRole, string> = {
  external_evidence: "External evidence",
  institution_policy: "Institution policy",
  portfolio_position: "Portfolio position",
  internal_working_context: "Demo working context",
  internal_approved_state: "Approved demo state",
  local_reference: "Local reference",
};

const ORIGIN_LABELS: Record<OriginKind, string> = {
  real_public: "Real public",
  demo_derived: "Demo-derived",
  synthetic: "Synthetic",
  user_provided_local: "User-provided local",
};

function originTone(origin: OriginKind) {
  if (origin === "real_public") return "ok" as const;
  if (origin === "user_provided_local") return "warn" as const;
  if (origin === "synthetic") return "esc" as const;
  return "info" as const;
}

type LibraryItem =
  | { kind: "catalog"; artifact: FundContextArtifact }
  | { kind: "local"; artifact: LocalContextArtifact };
type CatalogItem = Extract<LibraryItem, { kind: "catalog" }>;
type LocalItem = Extract<LibraryItem, { kind: "local" }>;

function itemId(item: LibraryItem) {
  return item.artifact.artifactId;
}

function itemOrigin(item: LibraryItem): OriginKind {
  return item.kind === "local" ? "user_provided_local" : (item.artifact.originKind ?? "synthetic");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(value));
}

function MetaRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-line py-2 last:border-0">
      <dt className="text-[11px] text-ink-3">{label}</dt>
      <dd className={cn("min-w-0 break-words text-right text-xs text-ink", mono && "font-mono text-[10px]")}>{value}</dd>
    </div>
  );
}

function ContextInspector({ item, binding }: { item: LibraryItem; binding?: CaseContextBinding }) {
  const origin = itemOrigin(item);
  const artifact = item.artifact;
  const catalogArtifact = item.kind === "catalog" ? item.artifact : null;
  const localArtifact = item.kind === "local" ? item.artifact : null;
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Badge tone={originTone(origin)}>{ORIGIN_LABELS[origin]}</Badge>
          <Badge>{ROLE_LABELS[artifact.contextRole]}</Badge>
          {binding && <Badge tone="accent">Active · {binding.scope.replace("_", " ")}</Badge>}
        </div>
        <h2 className="text-base font-semibold text-ink">{artifact.title}</h2>
        <p className="mt-1 font-mono text-[10px] text-ink-3">{artifact.artifactId}</p>
      </div>

      <InlineAlert tone={origin === "real_public" ? "ok" : "info"} icon={<Info size={14} aria-hidden />}>
        {origin === "real_public"
          ? "Facts and short excerpts are normalized from a named public publisher. The official page remains the canonical source."
          : origin === "user_provided_local"
            ? "Parsed in this browser. The raw file is not persisted or sent to a model; this deterministic run did not analyze it."
            : "Created by the Delphi demo team to simulate an institution's working thesis. It is not a public investment recommendation."}
      </InlineAlert>

      <dl>
        <MetaRow label="Origin" value={ORIGIN_LABELS[origin]} />
        <MetaRow label="Context role" value={ROLE_LABELS[artifact.contextRole]} />
        <MetaRow label="As of" value={formatDate(artifact.asOf)} />
        <MetaRow label="Classification" value={artifact.classification} />
        <MetaRow label="Content hash" value={artifact.contentHash} mono />
        {catalogArtifact ? (
          <>
            <MetaRow label="Publisher" value={catalogArtifact.publisherName ?? catalogArtifact.authorshipLabel ?? "Not named"} />
            <MetaRow label="Retrieved" value={catalogArtifact.retrievedAt ? formatDate(catalogArtifact.retrievedAt) : "Bundled fixture"} />
            <MetaRow label="Input usage" value={`${catalogArtifact.inputUsage ?? "eligible"} — ${catalogArtifact.inputUsageReason ?? "No reason recorded"}`} />
            <MetaRow label="Rights note" value={catalogArtifact.rightsNote ?? "Demo fixture"} />
            {catalogArtifact.nonEndorsementNotice && <MetaRow label="Non-endorsement" value={catalogArtifact.nonEndorsementNotice} />}
          </>
        ) : localArtifact ? (
          <>
            <MetaRow label="File" value={localArtifact.fileName} />
            <MetaRow label="Stored" value="Normalized preview + hash only" />
            <MetaRow label="Input usage" value="Excluded from deterministic analysis" />
          </>
        ) : null}
      </dl>

      {catalogArtifact?.canonicalUri && (
        <Link
          href={catalogArtifact.canonicalUri}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        >
          Open official source <ExternalLink size={12} aria-hidden />
        </Link>
      )}

      {localArtifact && (
        <Panel title="Local text preview" bodyClassName="p-0">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 font-mono text-[10px] leading-relaxed text-ink-2">
            {localArtifact.textPreview || "No machine-readable text found."}
          </pre>
        </Panel>
      )}
    </div>
  );
}

type ImportMode = "catalog" | "local";

export function ContextLibrary() {
  const bindings = useDemoStore((state) => state.contextBindings);
  const localArtifacts = useDemoStore((state) => state.localContextArtifacts);
  const addContextBinding = useDemoStore((state) => state.addContextBinding);
  const removeContextBinding = useDemoStore((state) => state.removeContextBinding);
  const addLocalContext = useDemoStore((state) => state.addLocalContext);
  const removeLocalContext = useDemoStore((state) => state.removeLocalContext);
  const push = useToasts((state) => state.push);

  const [query, setQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | OriginKind>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | FundContextRole>("all");
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<ImportMode | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [scope, setScope] = useState<CaseContextBinding["scope"]>("pre_event");
  const [localCandidate, setLocalCandidate] = useState<LocalContextArtifact | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const bindingById = useMemo(() => new Map(bindings.map((binding) => [binding.artifactId, binding])), [bindings]);
  const catalogItems = useMemo<CatalogItem[]>(
    () => defaultContextManifest.artifacts.map((artifact) => ({ kind: "catalog", artifact })),
    [],
  );
  const localItems = useMemo<LocalItem[]>(
    () => localArtifacts.map((artifact) => ({ kind: "local", artifact })),
    [localArtifacts],
  );
  const allItems = [...catalogItems, ...localItems];
  const activeItems = allItems.filter((item) => bindingById.has(itemId(item)));
  const filteredCatalog = catalogItems.filter((item) => {
    const origin = itemOrigin(item);
    const matchesOrigin = originFilter === "all" || origin === originFilter;
    const matchesRole = roleFilter === "all" || item.artifact.contextRole === roleFilter;
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || `${item.artifact.title} ${ROLE_LABELS[item.artifact.contextRole]}`.toLowerCase().includes(needle);
    return matchesOrigin && matchesRole && matchesQuery;
  });
  const contextHash = contextSetHash(bindings);
  const candidate = candidateId
    ? defaultContextManifest.artifacts.find((artifact) => artifact.artifactId === candidateId) ?? null
    : null;
  const candidateAsOf = candidate?.observedAt ?? localCandidate?.asOf;
  const pointInTimeViolation =
    scope === "pre_event" &&
    Boolean(candidateAsOf && defaultContextManifest.eventCutoff && Date.parse(candidateAsOf) > Date.parse(defaultContextManifest.eventCutoff));

  function resetAddFlow() {
    setStep(1);
    setMode(null);
    setCandidateId(null);
    setScope("pre_event");
    setLocalCandidate(null);
    setFileError(null);
    setFileBusy(false);
  }

  function closeAddFlow() {
    setAddOpen(false);
    resetAddFlow();
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileBusy(true);
    setFileError(null);
    try {
      const artifact = await parseLocalContextFile(file);
      setLocalCandidate(artifact);
      setScope("post_event");
      setStep(3);
    } catch (error) {
      setFileError((error as Error).message);
    } finally {
      setFileBusy(false);
      event.target.value = "";
    }
  }

  function confirmAdd() {
    if (mode === "catalog" && candidate) {
      addContextBinding(candidate.artifactId, scope);
      push({ tone: "ok", title: "Context attached", detail: `${candidate.title} is now active for this case.` });
      setStep(4);
      return;
    }
    if (mode === "local" && localCandidate) {
      addLocalContext(localCandidate, scope);
      push({ tone: "ok", title: "Local context attached", detail: "Stored as a browser-local preview and hash; excluded from this replay." });
      setStep(4);
    }
  }

  function remove(item: LibraryItem) {
    if (item.kind === "local") removeLocalContext(item.artifact.artifactId);
    else removeContextBinding(item.artifact.artifactId);
    push({ tone: "info", title: "Context removed", detail: `${item.artifact.title} is no longer active for this case.` });
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 lg:p-6">
      <header className="mb-5 flex flex-col gap-3 border-b border-line pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="ok" icon={<ShieldCheck size={11} aria-hidden />}>Mixed provenance, explicit</Badge>
            <span className="font-mono text-[10px] text-ink-3">{defaultCase.ticker} · FY2025 Q4</span>
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">Context Library</h1>
          <p className="mt-1 max-w-3xl text-[13px] text-ink-2">
            Inspect exactly what the demo treats as public evidence, demo-authored thesis context, and browser-local reference material.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus size={14} aria-hidden /> Add context
        </Button>
        <Link
          href="/debug/graph"
          className="inline-flex min-h-8 w-fit items-center justify-center gap-1.5 rounded-[3px] border border-line-strong bg-panel px-3 py-1.5 text-xs whitespace-nowrap text-ink shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] hover:border-ink-3 hover:bg-inset"
        >
          <Link2 size={13} aria-hidden /> Graph provenance
        </Link>
      </header>

      <div className="mb-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
        <Panel className="min-w-0">
          <p className="text-[10px] font-semibold tracking-widest text-ink-3 uppercase">Active context set</p>
          <p className="mt-2 text-2xl font-semibold text-ink tnum">{activeItems.length}</p>
          <p className="mt-1 truncate font-mono text-[9px] text-ink-3" title={contextHash}>{contextHash}</p>
        </Panel>
        <Panel className="min-w-0">
          <p className="text-[10px] font-semibold tracking-widest text-ink-3 uppercase">Real public inputs</p>
          <p className="mt-2 text-2xl font-semibold text-ink tnum">{activeItems.filter((item) => itemOrigin(item) === "real_public").length}</p>
          <p className="mt-1 text-xs text-ink-3">Issuer, regulator, or public institution</p>
        </Panel>
        <Panel className="min-w-0">
          <p className="text-[10px] font-semibold tracking-widest text-ink-3 uppercase">Local-only inputs</p>
          <p className="mt-2 text-2xl font-semibold text-ink tnum">{localItems.length}</p>
          <p className="mt-1 text-xs text-ink-3">Never analyzed by this deterministic replay</p>
        </Panel>
      </div>

      <InlineAlert tone="info" icon={<Info size={14} aria-hidden />} className="mb-4">
        The default run replays a frozen seven-item context set. Attaching another item changes the visible case context, but does not pretend the existing replay consumed it.
      </InlineAlert>

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] text-ink-2 uppercase">Active on this case</h2>
          <span className="text-[11px] text-ink-3">{activeItems.length} attached</span>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 xl:grid-cols-2">
          {activeItems.map((item) => {
            const origin = itemOrigin(item);
            const binding = bindingById.get(itemId(item));
            return (
              <article key={itemId(item)} className="min-w-0 flex items-start gap-3 rounded-[3px] border border-line bg-panel p-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[3px] bg-inset text-ink-3">
                  {item.kind === "local" ? <FolderInput size={15} aria-hidden /> : <FileText size={15} aria-hidden />}
                </span>
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelected(item)}>
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="min-w-0 max-w-full truncate text-[13px] font-semibold text-ink">{item.artifact.title}</span>
                    <Badge tone={originTone(origin)}>{ORIGIN_LABELS[origin]}</Badge>
                  </span>
                  <span className="mt-1 block text-[11px] text-ink-3">
                    {ROLE_LABELS[item.artifact.contextRole]} · {binding?.scope.replace("_", " ")} · as of {formatDate(item.artifact.asOf)}
                  </span>
                </button>
                <Button variant="ghost" size="sm" aria-label={`Remove ${item.artifact.title}`} onClick={() => remove(item)}>
                  <Trash2 size={13} aria-hidden />
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <Panel
        title="Available catalog"
        actions={<span className="text-[10px] font-normal tracking-normal text-ink-3 normal-case">Frozen, normalized snapshots</span>}
        className="min-w-0"
        bodyClassName="p-0"
      >
        <div className="flex flex-col gap-2 border-b border-line p-3 md:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search context catalog</span>
            <Search size={13} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title or context role"
              className="h-8 w-full rounded-[3px] border border-line-strong bg-panel py-1 pr-2 pl-8 text-xs text-ink focus:border-accent"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-ink-2">
            <Filter size={13} aria-hidden />
            <select
              aria-label="Filter catalog by provenance"
              value={originFilter}
              onChange={(event) => setOriginFilter(event.target.value as typeof originFilter)}
              className="h-8 rounded-[3px] border border-line-strong bg-panel px-2 text-xs text-ink"
            >
              <option value="all">All provenance</option>
              <option value="real_public">Real public</option>
              <option value="demo_derived">Demo-derived</option>
              <option value="synthetic">Synthetic</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-ink-2">
            <span className="sr-only">Filter by context role</span>
            <select
              aria-label="Filter catalog by context role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
              className="h-8 rounded-[3px] border border-line-strong bg-panel px-2 text-xs text-ink"
            >
              <option value="all">All roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="divide-y divide-line">
          {filteredCatalog.map((item) => {
            const origin = itemOrigin(item);
            const isActive = bindingById.has(item.artifact.artifactId);
            return (
              <div key={item.artifact.artifactId} className="min-w-0 flex items-center gap-3 px-3 py-2.5 hover:bg-inset/50">
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelected(item)}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-ink">{item.artifact.title}</span>
                    <Badge tone={originTone(origin)}>{ORIGIN_LABELS[origin]}</Badge>
                    {isActive && <Badge tone="accent" icon={<Check size={10} aria-hidden />}>Active</Badge>}
                  </span>
                  <span className="mt-1 block text-[10px] text-ink-3">
                    {ROLE_LABELS[item.artifact.contextRole]} · {item.artifact.publisherName ?? item.artifact.authorshipLabel ?? "Demo fixture"} · {item.artifact.inputUsage ?? "eligible"}
                  </span>
                </button>
                <Button
                  size="sm"
                  variant={isActive ? "ghost" : "secondary"}
                  onClick={() => (isActive ? removeContextBinding(item.artifact.artifactId) : addContextBinding(item.artifact.artifactId))}
                >
                  {isActive ? "Remove" : "Attach"}
                </Button>
                <ChevronRight size={13} className="text-ink-3" aria-hidden />
              </div>
            );
          })}
        </div>
      </Panel>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="Context provenance">
        {selected && <ContextInspector item={selected} binding={bindingById.get(itemId(selected))} />}
      </Drawer>

      <Modal open={addOpen} onClose={closeAddFlow} title="Add context to MSFT FY2025 Q4" wide>
        <ol className="mb-5 grid grid-cols-4 gap-1" aria-label="Import progress">
          {["Source", "Select", "Review", "Attached"].map((label, index) => (
            <li key={label} className={cn("border-t-2 pt-1.5 text-[10px]", step >= index + 1 ? "border-accent text-ink" : "border-line text-ink-3")}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className="grid gap-3 md:grid-cols-2">
            <button
              className="rounded-[3px] border border-line-strong p-4 text-left hover:border-accent hover:bg-accent-dim/20"
              onClick={() => { setMode("catalog"); setStep(2); }}
            >
              <Database className="mb-3 text-accent" size={20} aria-hidden />
              <span className="block text-sm font-semibold text-ink">Public/demo catalog</span>
              <span className="mt-1 block text-xs text-ink-2">Choose a normalized official snapshot or demo-authored object.</span>
            </button>
            <button
              className="rounded-[3px] border border-line-strong p-4 text-left hover:border-accent hover:bg-accent-dim/20"
              onClick={() => { setMode("local"); setStep(2); }}
            >
              <Upload className="mb-3 text-accent" size={20} aria-hidden />
              <span className="block text-sm font-semibold text-ink">Local file</span>
              <span className="mt-1 block text-xs text-ink-2">Parse CSV, JSON, TXT, Markdown, or PDF in this browser.</span>
            </button>
          </div>
        )}

        {step === 2 && mode === "catalog" && (
          <div className="space-y-2">
            <p className="text-xs text-ink-2">Choose one catalog item. Existing active items remain available for inspection.</p>
            {defaultContextManifest.artifacts.map((artifact) => (
              <button
                key={artifact.artifactId}
                className="flex w-full items-center gap-3 rounded-[3px] border border-line p-3 text-left hover:border-accent hover:bg-accent-dim/20"
                onClick={() => {
                  setCandidateId(artifact.artifactId);
                  setScope(artifact.defaultScope ?? "pre_event");
                  setStep(3);
                }}
              >
                <FilePlus2 size={15} className="shrink-0 text-ink-3" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-ink">{artifact.title}</span>
                  <span className="mt-0.5 block text-[10px] text-ink-3">{ORIGIN_LABELS[artifact.originKind ?? "synthetic"]} · {ROLE_LABELS[artifact.contextRole]}</span>
                </span>
                {bindingById.has(artifact.artifactId) && <Badge tone="accent">Already active</Badge>}
              </button>
            ))}
          </div>
        )}

        {step === 2 && mode === "local" && (
          <div className="space-y-3">
            <InlineAlert tone="info" icon={<LockKeyhole size={14} aria-hidden />}>
              The file is parsed locally. Only a bounded text preview, metadata, and SHA-256 hash are stored in browser state.
            </InlineAlert>
            <Field label="Choose local file" htmlFor="context-file" hint="CSV, JSON, TXT, Markdown, or PDF · maximum 5 MB">
              <input
                id="context-file"
                type="file"
                accept={LOCAL_IMPORT_ACCEPT}
                disabled={fileBusy}
                onChange={onFile}
                className="block w-full rounded-[3px] border border-line-strong bg-panel p-2 text-xs text-ink file:mr-3 file:rounded-[3px] file:border file:border-line file:bg-inset file:px-2 file:py-1 file:text-xs"
              />
            </Field>
            {fileBusy && <p role="status" className="text-xs text-ink-2">Parsing locally… PDF support loads only when needed.</p>}
            {fileError && <InlineAlert tone="bad">{fileError}</InlineAlert>}
          </div>
        )}

        {step === 3 && (candidate || localCandidate) && (
          <div className="space-y-4">
            <div className="rounded-[3px] border border-line bg-inset p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={originTone(candidate ? (candidate.originKind ?? "synthetic") : "user_provided_local")}>
                  {ORIGIN_LABELS[candidate ? (candidate.originKind ?? "synthetic") : "user_provided_local"]}
                </Badge>
                <Badge>{ROLE_LABELS[(candidate ?? localCandidate)!.contextRole]}</Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-ink">{(candidate ?? localCandidate)!.title}</p>
              <p className="mt-1 font-mono text-[10px] text-ink-3">{(candidate ?? localCandidate)!.contentHash}</p>
            </div>
            <Field label="Binding scope" htmlFor="context-scope" hint="Scope is recorded in the case context-set hash and future run inputs.">
              <select
                id="context-scope"
                value={scope}
                onChange={(event) => setScope(event.target.value as CaseContextBinding["scope"])}
                className="h-9 w-full rounded-[3px] border border-line-strong bg-panel px-2 text-xs text-ink"
              >
                <option value="pre_event">Pre-event thesis context</option>
                <option value="event">Event evidence</option>
                <option value="post_event">Post-event follow-up</option>
              </select>
            </Field>
            {pointInTimeViolation ? (
              <InlineAlert tone="bad">This artifact was observed after the FY2025 Q4 cutoff and cannot be assigned to pre-event thesis context. Choose event or post-event scope.</InlineAlert>
            ) : (
              <InlineAlert tone="warn">
                Attaching this item does not rewrite the frozen replay. It will be marked active but excluded unless a future run explicitly records it as used.
              </InlineAlert>
            )}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setStep(2)}>Back</Button>
              <Button variant="primary" onClick={confirmAdd} disabled={pointInTimeViolation || (candidate ? bindingById.has(candidate.artifactId) : false)}>
                <Link2 size={13} aria-hidden /> {candidate && bindingById.has(candidate.artifactId) ? "Already attached" : "Attach context"}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-8 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-ok-dim text-ok"><Check size={20} aria-hidden /></span>
            <h3 className="mt-3 text-sm font-semibold text-ink">Context attached with provenance</h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink-2">The item is visible in the active context set. Its actual analysis usage remains separately labeled.</p>
            <Button className="mt-4" variant="primary" onClick={closeAddFlow}>Done</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
