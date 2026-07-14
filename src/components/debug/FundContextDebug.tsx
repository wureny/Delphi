"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Ban,
  Braces,
  Clock3,
  Database,
  FileKey2,
  FileSearch,
  Filter,
  Link2,
  LockKeyhole,
  Network,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge, InlineAlert, Panel } from "@/components/ui/primitives";
import { fundContextManifest } from "@/fixtures/loader";
import { summarizeFundContext } from "@/context/fund-context";
import type { FundContextArtifact, FundContextRole } from "@/domain/types";
import { cn } from "@/lib/cn";

const ROLE_LABELS: Record<FundContextRole, string> = {
  external_evidence: "External evidence",
  internal_working_context: "Internal working context",
  internal_approved_state: "Internal approved state",
};

const ROLE_TONES: Record<FundContextRole, "info" | "warn" | "ok"> = {
  external_evidence: "info",
  internal_working_context: "warn",
  internal_approved_state: "ok",
};

const PIPELINE = [
  { label: "Discover", detail: "fixture connector", icon: Search },
  { label: "Normalize", detail: "typed artifact", icon: FileSearch },
  { label: "Classify", detail: "owner + sensitivity", icon: FileKey2 },
  { label: "Authorize", detail: "ACL + model policy", icon: LockKeyhole },
  { label: "Link", detail: "stable Delphi IDs", icon: Link2 },
  { label: "Project", detail: "read-only graph", icon: Network },
];

function MetadataRow({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="grid grid-cols-[minmax(7.5rem,0.42fr)_minmax(0,1fr)] gap-3 border-b border-line py-1.5 last:border-b-0">
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words text-right font-mono text-[11px] text-ink">{String(value)}</dd>
    </div>
  );
}

function ArtifactInspector({ artifact }: { artifact: FundContextArtifact }) {
  const connector = fundContextManifest.connectors.find((item) => item.connectorId === artifact.connectorId);

  return (
    <div className="space-y-3">
      <Panel
        title="Selected context artifact"
        actions={<Badge tone={ROLE_TONES[artifact.contextRole]}>{ROLE_LABELS[artifact.contextRole]}</Badge>}
      >
        <h2 className="text-sm font-semibold text-ink">{artifact.title}</h2>
        <p className="mt-1 break-all font-mono text-[10px] text-ink-3">{artifact.artifactId}</p>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-widest text-ink-3 uppercase">Identity & ownership</p>
            <dl className="rounded-sm border border-line bg-inset px-3">
              <MetadataRow label="Object ref" value={artifact.objectRef} />
              <MetadataRow label="Object kind" value={artifact.objectKind} />
              <MetadataRow label="Classification" value={artifact.classification} />
              <MetadataRow label="Data owner" value={artifact.dataOwner} />
              <MetadataRow label="Access policy" value={artifact.accessPolicyId} />
              <MetadataRow label="Allowed roles" value={artifact.allowedRoles.join(" · ")} />
              <MetadataRow label="Policy inheritance" value={artifact.policyInheritance} />
            </dl>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-widest text-ink-3 uppercase">Point-in-time record</p>
            <dl className="rounded-sm border border-line bg-inset px-3">
              <MetadataRow label="As of" value={artifact.asOf} />
              <MetadataRow label="Observed at" value={artifact.observedAt} />
              <MetadataRow label="Version" value={artifact.version} />
              <MetadataRow label="Content hash" value={artifact.contentHash} />
            </dl>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Connector boundary">
          {connector ? (
            <dl className="rounded-sm border border-line bg-inset px-3">
              <MetadataRow label="Connector" value={connector.label} />
              <MetadataRow label="Connector ID" value={connector.connectorId} />
              <MetadataRow label="Mode" value={connector.mode} />
              <MetadataRow label="Access" value={connector.accessMode} />
              <MetadataRow label="Execution" value={connector.executionLocation} />
              <MetadataRow label="Persistence" value={connector.persistence} />
            </dl>
          ) : null}
        </Panel>
        <Panel title="Execution policy">
          <dl className="rounded-sm border border-line bg-inset px-3">
            <MetadataRow label="External model access" value={artifact.externalModelAccess} />
            <MetadataRow label="Allowed execution" value={artifact.allowedExecution} />
            <MetadataRow label="External transfer" value={artifact.externalTransfer} />
            <MetadataRow label="Lifecycle" value={artifact.lifecycleStage} />
            <MetadataRow label="Deletion propagation" value={artifact.deletionPropagation} />
            <MetadataRow label="Graph authority" value={artifact.graphProjection} />
          </dl>
        </Panel>
      </div>

      <Panel title={`Derived links (${artifact.derivedObjectRefs.length})`} actions={<Braces size={14} className="text-ink-3" aria-hidden />}>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {artifact.derivedObjectRefs.map((reference) => (
            <li key={reference} className="rounded-sm border border-line bg-inset px-2.5 py-2 font-mono text-[11px] text-ink">
              {reference}
            </li>
          ))}
        </ul>
        <Link href="/debug/graph" className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
          Open graph projection <ArrowRight size={12} aria-hidden />
        </Link>
      </Panel>
    </div>
  );
}

export function FundContextDebug() {
  const summary = summarizeFundContext(fundContextManifest);
  const defaultArtifact =
    fundContextManifest.artifacts.find((artifact) => artifact.artifactId === "context_internal_memo_v7") ??
    fundContextManifest.artifacts[0];
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | FundContextRole>("all");
  const [selectedId, setSelectedId] = useState(defaultArtifact?.artifactId ?? "");

  const connectorsById = useMemo(
    () => new Map(fundContextManifest.connectors.map((connector) => [connector.connectorId, connector])),
    [],
  );
  const filteredArtifacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return fundContextManifest.artifacts.filter((artifact) => {
      const connector = connectorsById.get(artifact.connectorId);
      const haystack = `${artifact.artifactId} ${artifact.objectRef} ${artifact.title} ${artifact.contextRole} ${connector?.label ?? ""}`.toLowerCase();
      return (role === "all" || artifact.contextRole === role) && (!normalized || haystack.includes(normalized));
    });
  }, [connectorsById, query, role]);
  const selectedArtifact =
    fundContextManifest.artifacts.find((artifact) => artifact.artifactId === selectedId) ?? defaultArtifact;

  if (!selectedArtifact) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent" icon={<Database size={11} aria-hidden />}>Internal debug</Badge>
            <Badge tone="warn">Synthetic connector simulation</Badge>
            <Badge tone="neutral">Read-only</Badge>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">Fund Context Boundary</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-2">
            A contract-level demonstration of how fund-owned evidence, models, memos, and approved state enter Delphi.
            No live customer system is connected; fixtures never leave this local demo and no connector persists data.
          </p>
        </div>
        <div className="rounded-sm border border-line bg-inset px-3 py-2 text-right">
          <p className="text-[10px] font-semibold tracking-widest text-ink-3 uppercase">Manifest</p>
          <p className="mt-0.5 font-mono text-xs text-ink">{fundContextManifest.manifestId}</p>
          <p className="mt-0.5 font-mono text-[10px] text-ink-3">generated {fundContextManifest.generatedAt}</p>
        </div>
      </header>

      <InlineAlert tone="info" className="mt-4">
        <strong>Truthful demo boundary:</strong> this exercises schemas, policy checks, lineage, and graph links. It does
        not claim live Drive, SharePoint, upload, RAG, database, or external LLM connectivity.
      </InlineAlert>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Context artifacts", value: summary.artifactCount, detail: "typed + validated", icon: FileSearch },
          { label: "Fixture connectors", value: summary.connectorCount, detail: "read-only simulation", icon: Database },
          { label: "External transfers", value: summary.externalTransferCount, detail: "none permitted", icon: Ban },
          { label: "Execution location", value: "local", detail: "demo process only", icon: ShieldCheck },
        ].map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="rounded-sm border border-line bg-panel px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-ink-3 uppercase">{label}</p>
                <p className="mt-0.5 font-mono text-lg font-semibold text-ink">{value}</p>
                <p className="text-[11px] text-ink-3">{detail}</p>
              </div>
              <Icon size={15} className="mt-0.5 text-accent" aria-hidden />
            </div>
          </div>
        ))}
      </div>

      <Panel title="Ingestion control path" className="mt-3">
        <ol className="grid gap-2 md:grid-cols-6">
          {PIPELINE.map(({ label, detail, icon: Icon }, index) => (
            <li key={label} className="relative rounded-sm border border-line bg-inset p-2.5">
              <div className="flex items-center gap-1.5">
                <Icon size={13} className="text-accent" aria-hidden />
                <span className="text-xs font-semibold text-ink">{label}</span>
              </div>
              <p className="mt-1 text-[10px] text-ink-3">{detail}</p>
              {index < PIPELINE.length - 1 ? (
                <ArrowRight className="absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 text-ink-3 md:block" size={13} aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.45fr)]">
        <Panel title="Context inventory" bodyClassName="p-0">
          <div className="grid gap-2 border-b border-line p-3">
            <label className="relative block">
              <Search size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3" aria-hidden />
              <span className="sr-only">Search context artifacts</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, object, or connector"
                className="w-full rounded-sm border border-line bg-inset py-1.5 pr-2 pl-7 text-xs text-ink placeholder:text-ink-3 focus:border-accent/50"
              />
            </label>
            <label className="relative block">
              <Filter size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3" aria-hidden />
              <span className="sr-only">Filter context role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as "all" | FundContextRole)}
                className="w-full appearance-none rounded-sm border border-line bg-inset py-1.5 pr-2 pl-7 text-xs text-ink focus:border-accent/50"
              >
                <option value="all">All context roles</option>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-2" aria-label="Context artifacts">
            {filteredArtifacts.length ? (
              <ul className="space-y-1">
                {filteredArtifacts.map((artifact) => {
                  const connector = connectorsById.get(artifact.connectorId);
                  return (
                    <li key={artifact.artifactId}>
                      <button
                        type="button"
                        aria-pressed={selectedArtifact.artifactId === artifact.artifactId}
                        onClick={() => setSelectedId(artifact.artifactId)}
                        className={cn(
                          "w-full rounded-sm border px-2.5 py-2 text-left",
                          selectedArtifact.artifactId === artifact.artifactId
                            ? "border-accent/50 bg-accent-dim/30"
                            : "border-transparent hover:border-line hover:bg-panel-2",
                        )}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block text-xs leading-snug text-ink">{artifact.title}</span>
                            <span className="mt-0.5 block truncate font-mono text-[10px] text-ink-3">{artifact.objectRef}</span>
                          </span>
                          <Badge tone={ROLE_TONES[artifact.contextRole]}>{artifact.classification}</Badge>
                        </span>
                        <span className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-3">
                          <Database size={10} aria-hidden /> {connector?.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-2 py-8 text-center text-[13px] text-ink-3">No context artifacts match this filter.</p>
            )}
          </div>
        </Panel>

        <ArtifactInspector artifact={selectedArtifact} />
      </div>

      <InlineAlert tone="neutral" className="mt-3" icon={<Clock3 size={14} aria-hidden />}>
        Context metadata records the source version and event-time view. A later approved thesis can advance independently;
        the graph remains a derived projection and never becomes write authority.
      </InlineAlert>
    </div>
  );
}
