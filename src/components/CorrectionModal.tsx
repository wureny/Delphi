import { useMemo, useState } from "react";
import type { Confidence, Evidence, Impact, Thesis } from "../domain/types";
import { ImpactChip, ModalShell } from "./ui";

export interface CorrectionDraft {
  evidenceId: string;
  impact: Impact;
  thesisId: string | null;
  assumptionId: string | null;
  confidence: Confidence;
  note: string;
}

export function CorrectionModal({
  evidence,
  theses,
  onClose,
  onSave,
}: {
  evidence: Evidence;
  theses: Thesis[];
  onClose: () => void;
  onSave: (draft: CorrectionDraft) => void;
}) {
  const [impact, setImpact] = useState<Impact>(evidence.classification.impact);
  const [thesisId, setThesisId] = useState<string | null>(evidence.classification.thesisId);
  const [assumptionId, setAssumptionId] = useState<string | null>(evidence.classification.assumptionId);
  const [confidence, setConfidence] = useState<Confidence>(evidence.classification.confidence);
  const [note, setNote] = useState("");

  const selectedThesis = useMemo(() => theses.find((thesis) => thesis.id === thesisId), [theses, thesisId]);

  return (
    <ModalShell title="Correct classification" onClose={onClose}>
      <p className="muted">You are overriding the AI proposal. Your correction remains visible as a user classification.</p>

      <label>Impact on thesis</label>
      <div className="segmented">
        {(["supports", "contradicts", "neutral", "unclear"] as Impact[]).map((candidate) => (
          <button
            className={impact === candidate ? "selected" : ""}
            key={candidate}
            onClick={() => setImpact(candidate)}
            type="button"
          >
            <ImpactChip impact={candidate} />
          </button>
        ))}
      </div>

      <label htmlFor="correct-thesis">Attach to thesis</label>
      <select
        id="correct-thesis"
        value={thesisId ?? ""}
        onChange={(event) => {
          setThesisId(event.target.value || null);
          setAssumptionId(null);
        }}
      >
        <option value="">none / not relevant</option>
        {theses.map((thesis) => (
          <option key={thesis.id} value={thesis.id}>
            {thesis.title}
          </option>
        ))}
      </select>

      <label htmlFor="correct-assumption">Affected assumption</label>
      <select
        id="correct-assumption"
        disabled={!selectedThesis}
        value={assumptionId ?? ""}
        onChange={(event) => setAssumptionId(event.target.value || null)}
      >
        <option value="">none</option>
        {selectedThesis?.assumptions.map((assumption) => (
          <option key={assumption.id} value={assumption.id}>
            {assumption.text}
          </option>
        ))}
      </select>

      <label htmlFor="correct-confidence">Confidence</label>
      <select id="correct-confidence" value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence)}>
        <option value="low">low</option>
        <option value="medium">medium</option>
        <option value="high">high</option>
      </select>

      <label htmlFor="correct-note">Note</label>
      <textarea
        id="correct-note"
        placeholder="Why is the classification changing?"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <div className="modal-actions">
        <button className="button subtle" onClick={onClose} type="button">
          Cancel
        </button>
        <button
          className="button primary"
          onClick={() => onSave({ evidenceId: evidence.id, impact, thesisId, assumptionId, confidence, note })}
          type="button"
        >
          Save correction
        </button>
      </div>
    </ModalShell>
  );
}
