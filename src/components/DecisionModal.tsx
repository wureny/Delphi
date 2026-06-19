import { useState } from "react";
import type { Thesis } from "../domain/types";
import { ModalShell } from "./ui";

export interface DecisionDraft {
  thesisId: string;
  decision: string;
  newConviction: number;
  rationale: string;
  followUp: string;
}

const decisions = [
  "Hold position",
  "Increase position",
  "Reduce position",
  "Close position",
  "Downgrade conviction",
  "Upgrade conviction",
  "Move to watchlist",
  "Initiate deeper research",
];

export function DecisionModal({
  thesis,
  ticker,
  onClose,
  onSave,
}: {
  thesis: Thesis;
  ticker: string;
  onClose: () => void;
  onSave: (draft: DecisionDraft) => string | null;
}) {
  const [decision, setDecision] = useState(decisions[0]);
  const [newConviction, setNewConviction] = useState(thesis.conviction);
  const [rationale, setRationale] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const result = onSave({ thesisId: thesis.id, decision, newConviction, rationale, followUp });
    if (result) {
      setError(result);
      return;
    }
    onClose();
  }

  return (
    <ModalShell title={`Record decision - ${ticker}`} onClose={onClose}>
      <p className="muted">Delphi does not recommend an action. It records the decision you make, with your rationale and sources.</p>

      <label htmlFor="decision-type">Decision</label>
      <select id="decision-type" value={decision} onChange={(event) => setDecision(event.target.value)}>
        {decisions.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>

      <label htmlFor="new-conviction">New conviction: {newConviction}</label>
      <input
        id="new-conviction"
        max={100}
        min={0}
        onChange={(event) => setNewConviction(Number(event.target.value))}
        type="range"
        value={newConviction}
      />

      <label htmlFor="decision-rationale">Rationale - required, in your words</label>
      <textarea
        aria-invalid={Boolean(error)}
        id="decision-rationale"
        placeholder="Why are you making this call now? What evidence drove it?"
        value={rationale}
        onChange={(event) => {
          setRationale(event.target.value);
          setError(null);
        }}
      />
      <p className="field-help">The model never writes this rationale.</p>
      {error ? <p className="form-error">{error}</p> : null}

      <label htmlFor="decision-follow-up">Follow-up / open question</label>
      <textarea id="decision-follow-up" value={followUp} onChange={(event) => setFollowUp(event.target.value)} />

      <div className="modal-actions">
        <button className="button subtle" onClick={onClose} type="button">
          Cancel
        </button>
        <button className="button primary" onClick={save} type="button">
          Record decision
        </button>
      </div>
    </ModalShell>
  );
}
