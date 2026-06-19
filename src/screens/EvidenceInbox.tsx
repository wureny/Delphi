import type { DemoState, Evidence, WorkspaceData } from "../domain/types";
import { filterEvidence } from "../domain/selectors";
import { Banner, Chip, CitationOrUncertainty, ImpactChip, SkeletonGrid, StateBlock } from "../components/ui";

export type InboxFilter = "new" | "contradicts" | "uncertain" | "accepted" | "all";

const filters: Array<[InboxFilter, string]> = [
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
}: {
  data: WorkspaceData;
  demoState: DemoState;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  onAccept: (evidenceId: string) => void;
  onDismiss: (evidenceId: string) => void;
  onCorrect: (evidence: Evidence) => void;
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
