import type { DemoState, Evidence, EvidenceFilter, WorkspaceData } from "../domain/types";
import { filterEvidence } from "../domain/selectors";
import type { ProviderEvidenceRefreshResult } from "../services/providerEvidenceService";
import { Banner, Chip, CitationOrUncertainty, ImpactChip, SkeletonGrid, StateBlock } from "../components/ui";

export type InboxFilter = EvidenceFilter;

const filters: Array<[EvidenceFilter, string]> = [
  ["new", "New"],
  ["contradicts", "Counter-evidence"],
  ["uncertain", "Needs a human"],
  ["accepted", "Accepted"],
  ["all", "All"],
];

export function EvidenceInbox({
  data,
  demoState,
  filter,
  onFilterChange,
  onAccept,
  onDismiss,
  onCorrect,
  onRefreshProviderEvidence,
  providerRefresh,
}: {
  data: WorkspaceData;
  demoState: DemoState;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  onAccept: (evidenceId: string) => void;
  onDismiss: (evidenceId: string) => void;
  onCorrect: (evidence: Evidence) => void;
  onRefreshProviderEvidence: () => void;
  providerRefresh: { loading: boolean; result: ProviderEvidenceRefreshResult | null };
}) {
  if (demoState === "loading") return <SkeletonGrid />;
  if (demoState === "error") {
    return (
      <StateBlock
        kind="error"
        title="Couldn't fetch new evidence"
        body="The ingestion source is unreachable. Already-triaged evidence is unaffected."
        action={<button className="button">Retry</button>}
      />
    );
  }

  const items = demoState === "empty" ? [] : filterEvidence(data.evidence, filter);

  return (
    <>
      <div className="toolbar-row">
        <div>
          <strong>Evidence proposals</strong>
          <p className="muted">Refresh financial data to surface threshold-crossing facts for human review.</p>
        </div>
        <button className="button small" disabled={providerRefresh.loading} onClick={onRefreshProviderEvidence} type="button">
          {providerRefresh.loading ? "Refreshing..." : "Refresh financial data"}
        </button>
      </div>

      {providerRefresh.result ? <ProviderRefreshBanner result={providerRefresh.result} /> : null}

      <div className="filter-bar">
        {filters.map(([id, label]) => (
          <button className={filter === id ? "filter active" : "filter"} key={id} onClick={() => onFilterChange(id)} type="button">
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <StateBlock
          title={filter === "new" ? "Inbox zero" : "Nothing matches this filter"}
          body="New evidence will appear here as a proposal. Counter-evidence is never hidden."
        />
      ) : null}

      {items.map((item) => {
        const thesis = data.theses.find((candidate) => candidate.id === item.classification.thesisId);
        const asset = data.assets.find((candidate) => candidate.id === item.classification.assetId);
        const assumption = thesis?.assumptions.find((candidate) => candidate.id === item.classification.assumptionId);
        return (
          <article className={`card evidence-card ${item.classification.impact}`} key={item.id}>
            {item.stale ? <Banner tone="partial">Stale source - surfaced for review, not treated as fresh evidence.</Banner> : null}
            <div className="spread top-align">
              <h3>{item.headline}</h3>
              <span className="source-quality">source {item.source.quality}</span>
            </div>
            <p className="excerpt">{item.excerpt}</p>
            <div className="chip-row">
              <ImpactChip impact={item.classification.impact} />
              <Chip tone={item.classification.source}>{item.classification.source === "ai" ? "AI classified" : "You confirmed"}</Chip>
              {asset ? <Chip>{asset.name}</Chip> : <Chip tone="uncertain">no asset matched</Chip>}
              {thesis ? <Chip>{thesis.title}</Chip> : null}
              {assumption ? <Chip>assumption: {assumption.text}</Chip> : null}
              <Chip tone={item.classification.confidence}>confidence {item.classification.confidence}</Chip>
              <CitationOrUncertainty evidence={item} />
            </div>
            <p className="callout">
              <strong>Why this classification:</strong> {item.classification.rationale}
            </p>
            <div className="actions">
              {item.status === "new" ? (
                <button className="button primary small" onClick={() => onAccept(item.id)} type="button">
                  Accept & attach
                </button>
              ) : (
                <Chip tone="user">attached</Chip>
              )}
              <button className="button small" onClick={() => onCorrect(item)} type="button">
                Correct classification
              </button>
              {item.status === "new" ? (
                <button className="button subtle small" onClick={() => onDismiss(item.id)} type="button">
                  Dismiss as noise
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </>
  );
}

function ProviderRefreshBanner({ result }: { result: ProviderEvidenceRefreshResult }) {
  const unavailableCount = result.rejected.filter((item) => item.reason === "unavailable").length;
  if (result.added.length === 0 && result.rejected.length === 0) {
    return <Banner tone="partial">Financial data refreshed. No tracked assumption thresholds were crossed.</Banner>;
  }

  if (result.added.length === 0) {
    return (
      <Banner tone="partial">
        <strong>No new evidence candidates.</strong>
        {unavailableCount > 0 ? <span>{unavailableCount} asset data request{unavailableCount === 1 ? "" : "s"} unavailable.</span> : null}
      </Banner>
    );
  }

  return (
    <Banner tone={result.added.some((item) => item.classification.impact === "contradicts") ? "counter" : "partial"}>
      <strong>{result.added.length} financial data candidate{result.added.length === 1 ? "" : "s"} added.</strong>
      <span>Review before attaching to a thesis.</span>
    </Banner>
  );
}
