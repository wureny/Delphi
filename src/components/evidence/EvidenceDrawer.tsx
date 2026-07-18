"use client";

/**
 * Evidence drawer — opens an exact excerpt with locator, provenance, and
 * numeric extractions. Unavailable evidence is marked, never reconstructed.
 */
import Link from "next/link";
import { ExternalLink, FileText, Quote, TriangleAlert } from "lucide-react";
import { Badge, Drawer, InlineAlert, Kv } from "@/components/ui/primitives";
import { resolveExcerpt } from "@/fixtures/loader";
import { useDemoStore, unavailableSourceIds } from "@/store/demo-store";
import { formatDateTime } from "@/lib/labels";
import type { SourceLocator } from "@/domain/types";

function locatorLabel(locator: SourceLocator): string {
  const parts: string[] = [];
  if (locator.section) parts.push(`§ ${locator.section}`);
  if (locator.paragraph !== undefined) parts.push(`¶ ${locator.paragraph}`);
  if (locator.timestampSeconds !== undefined) {
    const m = Math.floor(locator.timestampSeconds / 60);
    const s = String(locator.timestampSeconds % 60).padStart(2, "0");
    parts.push(`t=${m}:${s}`);
  }
  if (locator.cellRange) parts.push(locator.cellRange);
  if (locator.page !== undefined) parts.push(`p. ${locator.page}`);
  return parts.join(" · ") || "Not available";
}

export function EvidenceDrawer({ excerptId, onClose }: { excerptId: string | null; onClose: () => void }) {
  const transcriptUnavailable = useDemoStore((s) => s.transcriptUnavailable);
  const resolved = excerptId ? resolveExcerpt(excerptId) : undefined;
  const unavailable = unavailableSourceIds(transcriptUnavailable);

  return (
    <Drawer open={excerptId !== null} onClose={onClose} title="Evidence">
      {!excerptId ? null : !resolved ? (
        <div className="space-y-3">
          <InlineAlert tone="bad" icon={<TriangleAlert size={14} aria-hidden />}>
            Evidence reference <span className="font-mono text-xs">{excerptId}</span> is not part of this demo fixture
            set. It is marked <strong>unavailable</strong>; Delphi does not reconstruct missing evidence.
          </InlineAlert>
          <dl className="rounded-sm border border-line bg-inset px-3 py-1">
            <Kv label="Reference ID" mono>
              {excerptId}
            </Kv>
            <Kv label="Availability">Unavailable</Kv>
          </dl>
        </div>
      ) : (
        (() => {
          const { excerpt, document } = resolved;
          const sourceUnavailable = unavailable.has(document.sourceId);
          return (
            <div className="space-y-4">
              <div>
                <div className="flex items-start gap-2">
                  <FileText size={16} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{document.title}</h3>
                    <p className="mt-0.5 text-xs text-ink-3 capitalize">{document.sourceType.replace(/_/g, " ")}</p>
                  </div>
                  <span className="ml-auto">
                    {sourceUnavailable ? (
                      <Badge tone="bad" icon={<TriangleAlert size={11} aria-hidden />}>
                        Source unavailable
                      </Badge>
                    ) : (
                      <Badge tone="ok">Available</Badge>
                    )}
                  </span>
                </div>
              </div>

              {sourceUnavailable ? (
                <InlineAlert tone="bad" icon={<TriangleAlert size={14} aria-hidden />}>
                  This source is currently unavailable (degraded simulation). The exact excerpt cannot be displayed and
                  any conclusion that depends on it fails closed.
                </InlineAlert>
              ) : (
                <figure className="rounded-sm border border-line bg-inset p-3">
                  <Quote size={13} className="mb-1.5 text-ink-3" aria-hidden />
                  <blockquote className="text-[13px] leading-relaxed text-ink">“{excerpt.text}”</blockquote>
                  <figcaption className="mt-2 font-mono text-[11px] text-ink-3">{locatorLabel(excerpt.locator)}</figcaption>
                </figure>
              )}

              {!sourceUnavailable && excerpt.numericValues && excerpt.numericValues.length > 0 && (
                <div>
                  <h4 className="mb-1 text-[11px] font-semibold tracking-widest text-ink-3 uppercase">
                    Extracted values
                  </h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-line text-left text-ink-3">
                        <th className="py-1 pr-2 font-medium">Label</th>
                        <th className="py-1 pr-2 text-right font-medium">Value</th>
                        <th className="py-1 pr-2 font-medium">Unit</th>
                        <th className="py-1 font-medium">Basis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excerpt.numericValues.map((nv) => (
                        <tr key={nv.label + nv.value} className="border-b border-line/60">
                          <td className="py-1 pr-2 text-ink">{nv.label}</td>
                          <td className="py-1 pr-2 text-right font-mono text-ink tnum">
                            {nv.currency === "USD" ? "$" : ""}
                            {nv.value}
                          </td>
                          <td className="py-1 pr-2 text-ink-2">{nv.unit}</td>
                          <td className="py-1 text-ink-2 capitalize">{nv.basis.replace(/_/g, " ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <dl className="rounded-sm border border-line bg-inset px-3 py-1">
                <Kv label="Reference ID" mono>
                  {excerpt.excerptId}
                </Kv>
                <Kv label="Locator" mono>
                  {locatorLabel(excerpt.locator)}
                </Kv>
                {document.publishedAt && <Kv label="Published (UTC)">{formatDateTime(document.publishedAt)}</Kv>}
                <Kv label="Observed by Delphi (UTC)">{formatDateTime(document.observedAt)}</Kv>
                <Kv label="Classification">
                  <Badge tone={document.originKind === "real_public" ? "ok" : document.originKind === "demo_derived" ? "info" : "warn"}>
                    {(document.originKind ?? "synthetic").replaceAll("_", " ")}
                  </Badge>
                </Kv>
                {document.publisherName && <Kv label="Publisher">{document.publisherName}</Kv>}
                {document.retrievedAt && <Kv label="Retrieved (UTC)">{formatDateTime(document.retrievedAt)}</Kv>}
                {document.rightsNote && <Kv label="Usage note">{document.rightsNote}</Kv>}
                <Kv label="Source version" mono>
                  v{document.version}
                </Kv>
                <Kv label="Content hash" mono>
                  <span className="block max-w-48 truncate">{excerpt.contentHash}</span>
                </Kv>
              </dl>
              {(document.canonicalUri ?? document.uri) && (
                <Link
                  href={document.canonicalUri ?? document.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  Open canonical source <ExternalLink size={12} aria-hidden />
                </Link>
              )}
            </div>
          );
        })()
      )}
    </Drawer>
  );
}

/** Row of evidence chips that open the drawer. */
export function EvidenceChips({
  refs,
  onOpen,
}: {
  refs: string[];
  onOpen: (excerptId: string) => void;
}) {
  const transcriptUnavailable = useDemoStore((s) => s.transcriptUnavailable);
  const unavailable = unavailableSourceIds(transcriptUnavailable);
  return (
    <ul className="flex flex-wrap gap-1.5">
      {refs.map((ref) => {
        const resolved = resolveExcerpt(ref);
        const isUnavailable = !resolved || unavailable.has(resolved.document.sourceId);
        const label = resolved
          ? `${resolved.document.sourceType === "transcript" ? "Call" : resolved.document.sourceType === "earnings_release" ? "Release" : "Model"} · ${locatorLabel(resolved.excerpt.locator)}`
          : ref;
        return (
          <li key={ref}>
            <button
              onClick={() => onOpen(ref)}
              className={
                "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] transition-colors " +
                (isUnavailable
                  ? "border-bad/40 bg-bad-dim/40 text-bad hover:border-bad/70"
                  : "border-line-strong bg-inset text-ink-2 hover:border-accent/50 hover:text-ink")
              }
            >
              {isUnavailable ? <TriangleAlert size={10} aria-hidden /> : <FileText size={10} aria-hidden />}
              {label}
              {isUnavailable && <span className="ml-0.5">unavailable</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Evidence health summary for a set of refs. */
export function evidenceHealth(refs: string[], transcriptUnavailable: boolean): { available: number; total: number } {
  const unavailable = unavailableSourceIds(transcriptUnavailable);
  let available = 0;
  for (const ref of refs) {
    const resolved = resolveExcerpt(ref);
    if (resolved && !unavailable.has(resolved.document.sourceId)) available++;
  }
  return { available, total: refs.length };
}
