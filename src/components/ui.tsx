import type { AssumptionStatus, Confidence, ConvictionBand, Evidence, Impact } from "../domain/types";
import { impactLabel, statusLabel } from "../domain/selectors";

type ChipTone = Impact | AssumptionStatus | ConvictionBand | Confidence | "ai" | "user" | "neutral" | "stale";

export function Chip({ tone = "neutral", children }: { tone?: ChipTone; children: React.ReactNode }) {
  return <span className={`chip ${tone}`}>{children}</span>;
}

export function ImpactChip({ impact }: { impact: Impact }) {
  return (
    <Chip tone={impact}>
      <span className={`dot ${impact}`} />
      {impactLabel(impact)}
    </Chip>
  );
}

export function StatusChip({ status }: { status: AssumptionStatus }) {
  return <Chip tone={status}>{statusLabel(status)}</Chip>;
}

export function CitationOrUncertainty({ evidence }: { evidence: Evidence }) {
  if (evidence.uncertain || !evidence.citation) {
    return <span className="uncertainty">uncertain - no firm source</span>;
  }

  return (
    <a className="citation" href={evidence.citation.url} onClick={(event) => event.preventDefault()}>
      {evidence.citation.label}
    </a>
  );
}

export function ConvictionMeter({ score, band }: { score: number; band: ConvictionBand }) {
  return (
    <div className={`meter ${band}`} aria-label={`Conviction ${score}`}>
      <span style={{ width: `${score}%` }} />
    </div>
  );
}

export function StateBlock({
  kind = "empty",
  title,
  body,
  action,
}: {
  kind?: "empty" | "loading" | "error";
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`state-block ${kind}`} role={kind === "error" ? "alert" : "status"}>
      <div className="state-mark">{kind === "error" ? "!" : kind === "loading" ? "..." : "."}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="thesis-grid" aria-label="Loading">
      {[0, 1, 2].map((item) => (
        <div className="card" key={item}>
          <div className="skeleton short" />
          <div className="skeleton title" />
          <div className="skeleton" />
          <div className="skeleton medium" />
        </div>
      ))}
    </div>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: "counter" | "stale" | "partial" | "error";
  children: React.ReactNode;
}) {
  return <div className={`banner ${tone}`}>{children}</div>;
}

export function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
