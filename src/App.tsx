import { useMemo, useState } from "react";
import { CorrectionModal, type CorrectionDraft } from "./components/CorrectionModal";
import { DecisionModal, type DecisionDraft } from "./components/DecisionModal";
import { initialWorkspace } from "./data/fixtures";
import { assembleDecisionTrace } from "./domain/aiBehaviors";
import { convictionBand } from "./domain/selectors";
import type { DemoState, Evidence, Thesis, ViewKey, WorkspaceData } from "./domain/types";
import { Dashboard } from "./screens/Dashboard";
import { EvidenceInbox, type InboxFilter } from "./screens/EvidenceInbox";
import { ThesisPage } from "./screens/ThesisPage";
import { WhatChanged } from "./screens/WhatChanged";

const viewLabels: Record<ViewKey, string> = {
  dashboard: "Thesis Dashboard",
  inbox: "Evidence Inbox",
  thesis: "Asset / Thesis",
  changed: "What Changed",
};

function cloneWorkspace(): WorkspaceData {
  return JSON.parse(JSON.stringify(initialWorkspace)) as WorkspaceData;
}

export function App() {
  const [data, setData] = useState<WorkspaceData>(() => cloneWorkspace());
  const [view, setView] = useState<ViewKey>("dashboard");
  const [selectedThesisId, setSelectedThesisId] = useState(data.theses[0].id);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("new");
  const [demoStates, setDemoStates] = useState<Record<ViewKey, DemoState>>({
    dashboard: "normal",
    inbox: "normal",
    thesis: "normal",
    changed: "normal",
  });
  const [correcting, setCorrecting] = useState<Evidence | null>(null);
  const [deciding, setDeciding] = useState<Thesis | null>(null);

  const newCount = useMemo(() => data.evidence.filter((item) => item.status === "new").length, [data.evidence]);

  function navigate(nextView: ViewKey) {
    setView(nextView);
  }

  function acceptEvidence(evidenceId: string) {
    setData((current) => ({
      ...current,
      evidence: current.evidence.map((item) => (item.id === evidenceId ? { ...item, status: "accepted" } : item)),
    }));
  }

  function dismissEvidence(evidenceId: string) {
    setData((current) => ({
      ...current,
      evidence: current.evidence.map((item) => (item.id === evidenceId ? { ...item, status: "dismissed" } : item)),
    }));
  }

  function saveCorrection(draft: CorrectionDraft) {
    setData((current) => ({
      ...current,
      evidence: current.evidence.map((item) => {
        if (item.id !== draft.evidenceId) return item;
        const thesis = current.theses.find((candidate) => candidate.id === draft.thesisId);
        return {
          ...item,
          classification: {
            ...item.classification,
            impact: draft.impact,
            thesisId: draft.thesisId,
            assumptionId: draft.assumptionId,
            confidence: draft.confidence,
            assetId: thesis ? thesis.assetId : null,
            source: "user",
            rationale: draft.note.trim() || `${item.classification.rationale} Reclassified by the user.`,
          },
        };
      }),
    }));
    setCorrecting(null);
  }

  function saveDecision(draft: DecisionDraft): string | null {
    if (!draft.rationale.trim()) {
      return "Delphi will not record a decision without a human rationale.";
    }

    setData((current) => {
      const thesis = current.theses.find((candidate) => candidate.id === draft.thesisId);
      if (!thesis) return current;

      const linkedEvidence = current.evidence.filter(
        (item) => item.status === "accepted" && item.classification.thesisId === draft.thesisId,
      );
      const trace = assembleDecisionTrace(
        {
          actor: current.user.name,
          decision: draft.decision,
          priorConviction: thesis.conviction,
          newConviction: draft.newConviction,
          evidenceIds: linkedEvidence.map((item) => item.id),
          changedAssumptions: thesis.assumptions.filter((assumption) => assumption.status !== "holding").map((assumption) => assumption.id),
          rationale: draft.rationale,
          sources: linkedEvidence.flatMap((item) => (item.citation ? [item.citation.label] : [])),
          followUp: draft.followUp,
          unresolved: [],
        },
        current.now,
      );

      return {
        ...current,
        theses: current.theses.map((item) =>
          item.id === draft.thesisId
            ? {
                ...item,
                conviction: draft.newConviction,
                convictionBand: convictionBand(draft.newConviction),
                lastReviewed: current.now,
                pendingChanges: 0,
              }
            : item,
        ),
        decisionTraces: {
          ...current.decisionTraces,
          [draft.thesisId]: [trace, ...(current.decisionTraces[draft.thesisId] ?? [])],
        },
      };
    });
    return null;
  }

  const pageDescription: Record<ViewKey, string> = {
    dashboard: `The state of your beliefs. ${data.theses.length} active theses and ${newCount} new evidence items.`,
    inbox: "New information, classified and waiting for your confirmation. The AI proposes; you decide.",
    thesis: "Work one belief in depth: assumptions, evidence map, risks, catalysts, and decision trace.",
    changed: "Material change since each last review, mapped to assumptions and cited evidence.",
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Delphi</strong>
          <span>living theses</span>
        </div>
        {Object.entries(viewLabels).map(([key, label]) => (
          <button
            className={view === key ? "nav-item active" : "nav-item"}
            key={key}
            onClick={() => navigate(key as ViewKey)}
            type="button"
          >
            <span>{label}</span>
            {key === "inbox" && newCount > 0 ? <span className="count">{newCount}</span> : null}
          </button>
        ))}
        <div className="sidebar-footer">
          <strong>{data.user.name}</strong>
          <span>{data.user.role}</span>
          <label htmlFor="demo-state">View state</label>
          <select
            id="demo-state"
            value={demoStates[view]}
            onChange={(event) => setDemoStates((current) => ({ ...current, [view]: event.target.value as DemoState }))}
          >
            <option value="normal">normal</option>
            <option value="loading">loading</option>
            <option value="empty">empty</option>
            <option value="error">error</option>
          </select>
        </div>
      </aside>

      <main className="main">
        <header className="page-head">
          <h1>{viewLabels[view]}</h1>
          <p>{pageDescription[view]}</p>
        </header>

        {view === "dashboard" ? (
          <Dashboard
            data={data}
            demoState={demoStates.dashboard}
            onOpenInboxCounter={() => {
              setInboxFilter("contradicts");
              setView("inbox");
            }}
            onOpenThesis={(thesisId) => {
              setSelectedThesisId(thesisId);
              setView("thesis");
            }}
          />
        ) : null}

        {view === "inbox" ? (
          <EvidenceInbox
            data={data}
            demoState={demoStates.inbox}
            filter={inboxFilter}
            onAccept={acceptEvidence}
            onCorrect={setCorrecting}
            onDismiss={dismissEvidence}
            onFilterChange={setInboxFilter}
          />
        ) : null}

        {view === "thesis" ? (
          <ThesisPage
            data={data}
            demoState={demoStates.thesis}
            thesisId={selectedThesisId}
            onDecision={setDeciding}
            onWhatChanged={() => setView("changed")}
          />
        ) : null}

        {view === "changed" ? (
          <WhatChanged
            data={data}
            demoState={demoStates.changed}
            onDecision={setDeciding}
            onOpenThesis={(thesisId) => {
              setSelectedThesisId(thesisId);
              setView("thesis");
            }}
          />
        ) : null}
      </main>

      {correcting ? (
        <CorrectionModal evidence={correcting} onClose={() => setCorrecting(null)} onSave={saveCorrection} theses={data.theses} />
      ) : null}

      {deciding ? (
        <DecisionModal
          thesis={deciding}
          ticker={data.assets.find((asset) => asset.id === deciding.assetId)?.ticker ?? ""}
          onClose={() => setDeciding(null)}
          onSave={saveDecision}
        />
      ) : null}
    </div>
  );
}
