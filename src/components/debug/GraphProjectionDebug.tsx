"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Database,
  GitBranch,
  Network,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge, InlineAlert, Kv, Panel } from "@/components/ui/primitives";
import { useDemoStore } from "@/store/demo-store";
import { allProposals, arctCase, fundContextManifest, runBundles, sourceBundles } from "@/fixtures/loader";
import {
  DeterministicGraphProjectionPort,
  type ProductGraphNodeKind,
  validateGraphProjection,
} from "@/runtime/graph";
import { useClientRuntime } from "@/runtime/client-context";
import { cn } from "@/lib/cn";

const projector = new DeterministicGraphProjectionPort();

const KIND_LABELS: Record<ProductGraphNodeKind, string> = {
  case: "Case",
  thesis: "Thesis",
  pillar: "Pillar",
  forecast: "Forecast",
  risk: "Risk",
  catalyst: "Catalyst",
  open_question: "Open question",
  source: "Source",
  evidence: "Evidence",
  run: "Run",
  proposal: "Proposal",
  review: "Review",
  transition: "Transition",
  connector: "Connector",
};

const LANES: Array<{ label: string; description: string; kinds: ProductGraphNodeKind[] }> = [
  {
    label: "Inputs",
    description: "Recorded sources, exact excerpts, and workflow runs",
    kinds: ["connector", "source", "evidence", "run"],
  },
  {
    label: "Proposed work",
    description: "Agent proposals and human review decisions",
    kinds: ["proposal", "review"],
  },
  {
    label: "Governed state",
    description: "The canonical case, thesis, and owned thesis objects",
    kinds: ["case", "thesis", "pillar", "forecast", "risk", "catalyst", "open_question"],
  },
  {
    label: "Audit",
    description: "Applied, reversible version transitions",
    kinds: ["transition"],
  },
];

export function GraphProjectionDebug() {
  const domain = useDemoStore((state) => state.domain);
  const { capabilities } = useClientRuntime();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | ProductGraphNodeKind>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projection = useMemo(
    () =>
      projector.project({
        investmentCase: arctCase,
        domain,
        proposals: allProposals,
        runs: runBundles,
        sources: sourceBundles,
        context: fundContextManifest,
      }),
    [domain],
  );
  const validation = validateGraphProjection(projection, arctCase, domain.currentThesis);
  const kindCounts = useMemo(() => {
    const counts = new Map<ProductGraphNodeKind, number>();
    for (const node of projection.nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    return counts;
  }, [projection.nodes]);
  const filteredNodes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return projection.nodes.filter(
      (node) =>
        (kind === "all" || node.kind === kind) &&
        (!normalized || `${node.id} ${node.label} ${node.kind}`.toLowerCase().includes(normalized)),
    );
  }, [kind, projection.nodes, query]);
  const selectedNode =
    projection.nodes.find((node) => node.id === selectedId) ??
    projection.nodes.find((node) => node.id === projection.thesisId) ??
    projection.nodes[0];
  const relatedEdges = selectedNode
    ? projection.edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id)
    : [];
  const nodesById = useMemo(
    () => new Map(projection.nodes.map((node) => [node.id, node])),
    [projection.nodes],
  );

  if (capabilities.graph.state === "unavailable") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-5">
        <Badge tone="accent" icon={<Network size={11} aria-hidden />}>Internal debug</Badge>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">Graph Projection Debug</h1>
        <InlineAlert tone="warn" className="mt-4">
          <strong>{capabilities.graph.label}.</strong> The canonical thesis workflow remains available; no graph-backed
          state or database is required.
        </InlineAlert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent" icon={<Network size={11} aria-hidden />}>Internal debug</Badge>
            <Badge tone="neutral">Projection only</Badge>
            <Badge tone={validation.status === "current" ? "ok" : "warn"}>{validation.status}</Badge>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">Graph Projection Debug</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-2">
            A read-only, deterministic projection of Delphi product objects. This surface uses stable product IDs and
            typed relationships; it is not backed by a graph database and has no canonical write authority.
          </p>
          <Link href="/debug/context" className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
            Inspect fund context boundary <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
        <div className="rounded-sm border border-line bg-inset px-3 py-2 text-right">
          <p className="text-[10px] font-semibold tracking-widest text-ink-3 uppercase">Projection head</p>
          <p className="mt-0.5 font-mono text-sm text-ink">thesis v{projection.thesisVersion}</p>
          <p className="mt-0.5 max-w-56 truncate font-mono text-[10px] text-ink-3" title={projection.sourceSemanticHash}>
            {projection.sourceSemanticHash}
          </p>
        </div>
      </header>

      <InlineAlert tone="info" className="mt-4">
        <strong>Boundary status:</strong> analysis is {capabilities.analysis.activeMode}; graph is {capabilities.graph.state};
        external network access is disabled; approved writes remain exclusive to the human transition gateway.
      </InlineAlert>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Panel title="Runtime capability">
          <dl className="rounded-sm border border-line bg-inset px-3 py-1">
            <Kv label="Analysis">{capabilities.analysis.label}</Kv>
            <Kv label="Requested mode" mono>{capabilities.analysis.requestedMode}</Kv>
            <Kv label="Configuration" mono>{capabilities.analysis.configurationState}</Kv>
            <Kv label="Active mode" mono>{capabilities.analysis.activeMode}</Kv>
            <Kv label="Graph">{capabilities.graph.label}</Kv>
            <Kv label="Network">disabled</Kv>
            <Kv label="Write authority">human gateway only</Kv>
          </dl>
        </Panel>
        <Panel title="Projection inventory">
          <dl className="rounded-sm border border-line bg-inset px-3 py-1">
            <Kv label="Projection ID" mono><span className="block max-w-52 truncate">{projection.projectionId}</span></Kv>
            <Kv label="Nodes" mono>{projection.nodes.length}</Kv>
            <Kv label="Relationships" mono>{projection.edges.length}</Kv>
            <Kv label="Case" mono>{projection.caseId}</Kv>
            <Kv label="Validation">{validation.status}</Kv>
          </dl>
        </Panel>
        <Panel title="Isolation guarantees">
          <ul className="space-y-2 text-[13px] text-ink-2">
            <li className="flex gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-ok" aria-hidden />No provider secrets or raw vendor payloads.</li>
            <li className="flex gap-2"><Database size={14} className="mt-0.5 shrink-0 text-info" aria-hidden />No Neo4j, Cypher, or database-owned state.</li>
            <li className="flex gap-2"><GitBranch size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />Every edge resolves through Delphi IDs.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Projection lanes" className="mt-3">
        <div className="grid gap-2 md:grid-cols-4">
          {LANES.map((lane, index) => {
            const count = lane.kinds.reduce((sum, nodeKind) => sum + (kindCounts.get(nodeKind) ?? 0), 0);
            return (
              <div key={lane.label} className="relative rounded-sm border border-line bg-inset p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">{lane.label}</span>
                  <Badge tone="neutral">{count} nodes</Badge>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{lane.description}</p>
                <p className="mt-2 font-mono text-[10px] text-ink-3">
                  {lane.kinds.filter((nodeKind) => kindCounts.has(nodeKind)).map((nodeKind) => KIND_LABELS[nodeKind]).join(" · ") || "Empty"}
                </p>
                {index < LANES.length - 1 ? (
                  <ArrowRight className="absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 text-ink-3 md:block" size={13} aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel title="Node inventory" bodyClassName="p-0">
          <div className="grid gap-2 border-b border-line p-3 sm:grid-cols-[1fr_11rem]">
            <label className="relative block">
              <Search size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3" aria-hidden />
              <span className="sr-only">Search graph nodes</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ID, label, or kind"
                className="w-full rounded-sm border border-line bg-inset py-1.5 pr-2 pl-7 text-xs text-ink placeholder:text-ink-3 focus:border-accent/50"
              />
            </label>
            <label>
              <span className="sr-only">Filter node kind</span>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as "all" | ProductGraphNodeKind)}
                className="w-full rounded-sm border border-line bg-inset px-2 py-1.5 text-xs text-ink focus:border-accent/50"
              >
                <option value="all">All node kinds</option>
                {Object.entries(KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="max-h-[540px] overflow-y-auto p-2" aria-label="Graph nodes">
            {filteredNodes.length > 0 ? (
              <ul className="space-y-1">
                {filteredNodes.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      aria-pressed={selectedNode?.id === node.id}
                      className={cn(
                        "flex w-full items-start justify-between gap-3 rounded-sm border px-2.5 py-2 text-left",
                        selectedNode?.id === node.id
                          ? "border-accent/50 bg-accent-dim/30"
                          : "border-transparent hover:border-line hover:bg-panel-2",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-ink">{node.label}</span>
                        <span className="block truncate font-mono text-[10px] text-ink-3">{node.id}</span>
                      </span>
                      <Badge tone="neutral">{KIND_LABELS[node.kind]}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 py-8 text-center text-[13px] text-ink-3">No nodes match this filter.</p>
            )}
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel title="Selected node" actions={selectedNode ? <Badge tone="accent">{KIND_LABELS[selectedNode.kind]}</Badge> : undefined}>
            {selectedNode ? (
              <>
                <h2 className="text-sm font-semibold text-ink">{selectedNode.label}</h2>
                <p className="mt-1 font-mono text-[11px] text-ink-3">{selectedNode.id}</p>
                <dl className="mt-3 rounded-sm border border-line bg-inset px-3 py-1">
                  {selectedNode.status ? <Kv label="Status" mono>{selectedNode.status}</Kv> : null}
                  {Object.entries(selectedNode.attributes).map(([label, value]) => (
                    <Kv key={label} label={label} mono>{value === null ? "Not available" : String(value)}</Kv>
                  ))}
                </dl>
              </>
            ) : (
              <p className="text-[13px] text-ink-3">Select a node to inspect it.</p>
            )}
          </Panel>

          <Panel title={`Relationships (${relatedEdges.length})`} actions={<Braces size={14} className="text-ink-3" aria-hidden />}>
            {selectedNode && relatedEdges.length > 0 ? (
              <ul className="space-y-1.5">
                {relatedEdges.map((edge) => {
                  const outgoing = edge.from === selectedNode.id;
                  const otherId = outgoing ? edge.to : edge.from;
                  const other = nodesById.get(otherId);
                  return (
                    <li key={edge.id} className="rounded-sm border border-line bg-inset px-2.5 py-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-ink-3">{outgoing ? "out" : "in"}</span>
                        <Badge tone="neutral">{edge.type}</Badge>
                        <span className="text-ink-3">{outgoing ? "→" : "←"}</span>
                        <button type="button" onClick={() => setSelectedId(otherId)} className="min-w-0 truncate text-left text-accent hover:underline">
                          {other?.label ?? otherId}
                        </button>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-ink-3">{edge.id}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">This node has no projected relationships.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
