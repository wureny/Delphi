import type { DemoState, WorkspaceData } from "../domain/types";
import {
  assumptionStatusCounts,
  freshness,
  newCounterEvidence,
  watchlistWithoutThesis,
} from "../domain/selectors";
import { Banner, Chip, ConvictionMeter, SkeletonGrid, StateBlock } from "../components/ui";

export function Dashboard({
  data,
  demoState,
  onOpenInboxCounter,
  onOpenThesis,
}: {
  data: WorkspaceData;
  demoState: DemoState;
  onOpenInboxCounter: () => void;
  onOpenThesis: (thesisId: string) => void;
}) {
  if (demoState === "loading") return <SkeletonGrid />;
  if (demoState === "error") {
    return (
      <StateBlock
        kind="error"
        title="Couldn't load your theses"
        body="The workspace request failed. Your data is safe and nothing was changed."
        action={<button className="button">Retry</button>}
      />
    );
  }
  if (demoState === "empty") {
    return (
      <StateBlock
        title="No theses yet"
        body="A thesis is a belief you want to keep alive: assumptions, evidence and decisions in one place."
        action={<button className="button primary">New thesis</button>}
      />
    );
  }

  const counterEvidence = newCounterEvidence(data.evidence);
  const watchlist = watchlistWithoutThesis(data);

  return (
    <>
      {counterEvidence.length > 0 ? (
        <Banner tone="counter">
          <strong>{counterEvidence.length} new counter-evidence item{counterEvidence.length === 1 ? "" : "s"}</strong>
          <span>challenge active assumptions.</span>
          <button className="button small" onClick={onOpenInboxCounter}>
            Review
          </button>
        </Banner>
      ) : null}

      <div className="thesis-grid">
        {data.theses.map((thesis) => {
          const asset = data.assets.find((candidate) => candidate.id === thesis.assetId);
          const fresh = freshness(data.now, thesis);
          const counts = assumptionStatusCounts(thesis);
          return (
            <button className="card thesis-card" key={thesis.id} onClick={() => onOpenThesis(thesis.id)} type="button">
              <div className="spread">
                <span className="asset-tag">
                  {asset?.name} - {asset?.ticker}
                </span>
                <Chip tone={thesis.convictionBand}>conviction {thesis.conviction}</Chip>
              </div>
              <h3>{thesis.title}</h3>
              <ConvictionMeter band={thesis.convictionBand} score={thesis.conviction} />
              <div className="chip-row">
                {counts.broken ? <Chip tone="broken">{counts.broken} broken</Chip> : null}
                {counts.weakening ? <Chip tone="weakening">{counts.weakening} weakening</Chip> : null}
                {counts.uncertain ? <Chip tone="uncertain">{counts.uncertain} uncertain</Chip> : null}
                {thesis.unresolved ? <Chip>{thesis.unresolved} open</Chip> : null}
              </div>
              <div className="spread">
                <span className={fresh.stale ? "freshness stale" : "freshness"}>{fresh.label}</span>
                {thesis.pendingChanges ? <Chip tone="ai">{thesis.pendingChanges} changes</Chip> : <span className="muted">up to date</span>}
              </div>
              {fresh.stale ? <div className="inline-warning">Stale - review overdue. Treat conclusions with caution.</div> : null}
            </button>
          );
        })}

        {watchlist.map((asset) => (
          <div className="card thesis-card no-thesis" key={asset.id}>
            <span className="asset-tag">
              {asset.name} - {asset.ticker}
            </span>
            <h3>No thesis yet</h3>
            <p>On your watchlist. Capture why you are watching it before evidence piles up.</p>
            <button className="button small">Start thesis</button>
          </div>
        ))}
      </div>
    </>
  );
}
