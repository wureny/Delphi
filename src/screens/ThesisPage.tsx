import type { DemoState, Thesis, WorkspaceData } from "../domain/types";
import { acceptedEvidenceForThesis, evidenceForThesis, freshness, statusLabel, timeAgo } from "../domain/selectors";
import { Banner, Chip, CitationOrUncertainty, ConvictionMeter, StateBlock, StatusChip } from "../components/ui";

export function ThesisPage({
  data,
  demoState,
  thesisId,
  onDecision,
  onWhatChanged,
}: {
  data: WorkspaceData;
  demoState: DemoState;
  thesisId: string;
  onDecision: (thesis: Thesis) => void;
  onWhatChanged: () => void;
}) {
  if (demoState === "loading") {
    return <StateBlock kind="loading" title="Loading thesis" body="Fetching the thesis workspace." />;
  }
  if (demoState === "error") {
    return <StateBlock kind="error" title="Couldn't load this thesis" body="Section data could not be refreshed. Nothing was changed." />;
  }

  const thesis = data.theses.find((candidate) => candidate.id === thesisId) ?? data.theses[0];
  const asset = data.assets.find((candidate) => candidate.id === thesis.assetId);
  const fresh = freshness(data.now, thesis);
  const accepted = demoState === "empty" ? [] : acceptedEvidenceForThesis(data, thesis.id);
  const pending = evidenceForThesis(data, thesis.id, "new").length;
  const support = accepted.filter((item) => item.classification.impact === "supports");
  const counter = accepted.filter((item) => item.classification.impact === "contradicts");
  const traces = demoState === "empty" ? [] : data.decisionTraces[thesis.id] ?? [];

  return (
    <>
      <section className="thesis-hero">
        <div>
          <span className="asset-tag">
            {asset?.name} - {asset?.ticker}
          </span>
          <h2>{thesis.title}</h2>
          <div className="chip-row">
            <Chip tone={thesis.convictionBand}>conviction {thesis.conviction}</Chip>
            <span className={fresh.stale ? "freshness stale" : "freshness"}>{fresh.label}</span>
            <span className="muted">horizon {thesis.timeHorizon}</span>
          </div>
        </div>
        <div className="hero-actions">
          <button className="button" onClick={onWhatChanged} type="button">
            What changed?
          </button>
          <button className="button primary" onClick={() => onDecision(thesis)} type="button">
            Record decision
          </button>
        </div>
      </section>

      {fresh.stale ? <Banner tone="stale">This thesis is stale. Re-confirm before relying on it.</Banner> : null}
      <p className="summary">{thesis.summary}</p>
      <ConvictionMeter band={thesis.convictionBand} score={thesis.conviction} />

      <div className="two-column">
        <section className="card bull-bear bull">
          <h3>Bull case</h3>
          <p>{thesis.bull}</p>
        </section>
        <section className="card bull-bear bear">
          <h3>Bear case</h3>
          <p>{thesis.bear}</p>
        </section>
      </div>

      <h3 className="section-title">Key assumptions</h3>
      <section className="card">
        {thesis.assumptions.map((assumption) => (
          <div className="assumption-row" key={assumption.id}>
            <StatusChip status={assumption.status} />
            <div>
              <strong>{assumption.text}</strong>
              {assumption.critical ? <span className="critical"> critical</span> : null}
              {assumption.note ? <p>{assumption.note}</p> : null}
            </div>
            <button className="button subtle small">Revise</button>
          </div>
        ))}
      </section>

      <h3 className="section-title">Evidence map</h3>
      <section className="card">
        {pending > 0 ? <Banner tone="partial">{pending} classified item{pending === 1 ? "" : "s"} waiting in the inbox.</Banner> : null}
        {accepted.length === 0 ? <StateBlock title="No evidence attached yet" body="Items you accept in the inbox land here." /> : null}
        <div className="two-column evidence-map">
          <EvidenceColumn title={`Supporting (${support.length})`} items={support} tone="supports" />
          <EvidenceColumn title={`Counter-evidence (${counter.length})`} items={counter} tone="contradicts" />
        </div>
      </section>

      <div className="two-column">
        <section>
          <h3 className="section-title">Risks</h3>
          <div className="card compact-list">
            {thesis.risks.map((risk) => (
              <p key={risk.id}>
                <Chip tone={risk.severity}>{risk.severity}</Chip> {risk.text}
              </p>
            ))}
          </div>
        </section>
        <section>
          <h3 className="section-title">Catalysts</h3>
          <div className="card compact-list">
            {thesis.catalysts.map((catalyst) => (
              <p key={catalyst.id}>
                <Chip>{timeAgo(data.now, catalyst.date)}</Chip> {catalyst.text}
              </p>
            ))}
          </div>
        </section>
      </div>

      <h3 className="section-title">Decision trace</h3>
      <section className="card timeline">
        {traces.length === 0 ? <StateBlock title="No decisions recorded" body="Capture why when you act on this thesis." /> : null}
        {traces.map((trace) => (
          <article className="trace-entry" key={trace.id}>
            <div className="spread">
              <h3>{trace.decision}</h3>
              <span className="muted">
                {timeAgo(data.now, trace.at)} - {trace.actor}
              </span>
            </div>
            <p className="muted">
              conviction {trace.priorConviction ?? "none"} {"->"} {trace.newConviction}
            </p>
            <p className="trace-rationale">{trace.rationale}</p>
            {trace.sources.length > 0 ? (
              <div className="chip-row">
                {trace.sources.map((source) => (
                  <span className="citation" key={source}>
                    {source}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">No external source - judgment call.</p>
            )}
            {trace.followUp ? <p className="muted">Follow-up: {trace.followUp}</p> : null}
          </article>
        ))}
      </section>
    </>
  );
}

function EvidenceColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: ReturnType<typeof acceptedEvidenceForThesis>;
  tone: "supports" | "contradicts";
}) {
  return (
    <div>
      <h4 className={`evidence-heading ${tone}`}>{title}</h4>
      {items.length === 0 ? <p className="muted">none</p> : null}
      {items.map((item) => (
        <div className="evidence-row" key={item.id}>
          <span className={`dot ${item.classification.impact}`} />
          <div>
            <strong>{item.headline}</strong>
            <p>
              {statusLabel(item.classification.impact === "contradicts" ? "weakening" : "holding")} -{" "}
              <CitationOrUncertainty evidence={item} />
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
