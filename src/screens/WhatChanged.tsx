import type { DemoState, Thesis, WorkspaceData } from "../domain/types";
import { freshness, statusLabel, timeAgo } from "../domain/selectors";
import { Banner, Chip, CitationOrUncertainty, SkeletonGrid, StateBlock, StatusChip } from "../components/ui";

export function WhatChanged({
  data,
  demoState,
  onDecision,
  onOpenThesis,
}: {
  data: WorkspaceData;
  demoState: DemoState;
  onDecision: (thesis: Thesis) => void;
  onOpenThesis: (thesisId: string) => void;
}) {
  if (demoState === "loading") return <SkeletonGrid />;
  if (demoState === "error") {
    return (
      <StateBlock
        kind="error"
        title="Couldn't compute changes"
        body="The change engine timed out. Nothing in your theses was modified."
        action={<button className="button">Retry</button>}
      />
    );
  }
  if (demoState === "empty") {
    return <StateBlock title="Nothing material changed" body="No tracked assumption moved since your last reviews." />;
  }

  return (
    <div className="changed-stack">
      {data.theses.map((thesis) => {
        const asset = data.assets.find((candidate) => candidate.id === thesis.assetId);
        const summary = data.whatChanged[thesis.id];
        const fresh = freshness(data.now, thesis);
        const diffs = summary.events.filter((event) => event.kind === "assumption_status");
        return (
          <article className="card changed-card" key={thesis.id}>
            <div className="spread top-align">
              <div>
                <span className="asset-tag">
                  {asset?.name} - {asset?.ticker}
                </span>
                <h3>{thesis.title}</h3>
              </div>
              <span className={fresh.stale ? "freshness stale" : "freshness"}>since {timeAgo(data.now, summary.since)}</span>
            </div>

            {fresh.stale ? <Banner tone="stale">Review overdue. Treat conclusions with caution.</Banner> : null}

            <ul className="summary-list">
              {summary.summary.map((line) => {
                const evidence = data.evidence.find((item) => item.id === line.evidenceId);
                return (
                  <li key={`${thesis.id}-${line.text}`}>
                    {line.text} {evidence ? <CitationOrUncertainty evidence={evidence} /> : <span className="uncertainty">no new evidence</span>}
                  </li>
                );
              })}
            </ul>

            {diffs.length > 0 ? <h4>Assumption changes</h4> : null}
            {diffs.map((event) => {
              const assumption = thesis.assumptions.find((candidate) => candidate.id === event.assumptionId);
              return (
                <div className="diff-line" key={`${thesis.id}-${event.assumptionId}`}>
                  <span>{assumption?.text}</span>
                  {event.from ? <StatusChip status={event.from} /> : null}
                  <span className="muted">to</span>
                  {event.to ? <StatusChip status={event.to} /> : null}
                </div>
              );
            })}

            <div className={`conviction-prompt ${summary.convictionPrompt.direction}`}>
              <strong>Conviction prompt{summary.convictionPrompt.uncertain ? " (uncertain)" : ""}:</strong>{" "}
              {summary.convictionPrompt.text}
              <div className="actions">
                <button className="button primary small" onClick={() => onDecision(thesis)} type="button">
                  Record decision
                </button>
                <button className="button small" onClick={() => onOpenThesis(thesis.id)} type="button">
                  Open thesis
                </button>
              </div>
            </div>

            <div className="chip-row">
              <Chip tone={summary.convictionPrompt.direction === "down" ? "broken" : "ai"}>
                prompt only - no automatic conviction change
              </Chip>
              <span className="muted">{statusLabel("holding")} items and counter-evidence are reported symmetrically.</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
