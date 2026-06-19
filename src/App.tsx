import { useCallback, useEffect, useMemo, useState } from "react";
import { CorrectionModal, type CorrectionDraft } from "./components/CorrectionModal";
import { DecisionModal, type DecisionDraft } from "./components/DecisionModal";
import { FixtureWorkspaceRepository } from "./repositories/fixtureWorkspaceRepository";
import type { EvidenceCorrectionInput } from "./repositories/workspaceRepository";
import { WorkspaceService } from "./services/workspaceService";
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

export function App() {
  const service = useMemo(() => new WorkspaceService(new FixtureWorkspaceRepository()), []);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [selectedThesisId, setSelectedThesisId] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("new");
  const [demoStates, setDemoStates] = useState<Record<ViewKey, DemoState>>({
    dashboard: "normal",
    inbox: "normal",
    thesis: "normal",
    changed: "normal",
  });
  const [correcting, setCorrecting] = useState<Evidence | null>(null);
  const [deciding, setDeciding] = useState<Thesis | null>(null);

  const newCount = useMemo(() => data?.evidence.filter((item) => item.status === "new").length ?? 0, [data?.evidence]);

  const refreshWorkspace = useCallback(async () => {
    const workspace = await service.getWorkspace();
    setData(workspace);
    setSelectedThesisId((current) => current ?? workspace.theses[0]?.id ?? null);
  }, [service]);

  useEffect(() => {
    void refreshWorkspace();
  }, [refreshWorkspace]);

  function navigate(nextView: ViewKey) {
    setView(nextView);
  }

  async function acceptEvidence(evidenceId: string) {
    await service.acceptEvidence(evidenceId);
    await refreshWorkspace();
  }

  async function dismissEvidence(evidenceId: string) {
    await service.dismissEvidence(evidenceId);
    await refreshWorkspace();
  }

  async function saveCorrection(draft: CorrectionDraft) {
    const input: EvidenceCorrectionInput = {
      evidenceId: draft.evidenceId,
      impact: draft.impact,
      thesisId: draft.thesisId,
      assumptionId: draft.assumptionId,
      confidence: draft.confidence,
      rationaleSummary: draft.note,
    };
    await service.correctEvidence(input);
    setCorrecting(null);
    await refreshWorkspace();
  }

  function saveDecision(draft: DecisionDraft): string | null {
    if (!draft.rationale.trim()) {
      return "Delphi will not record a decision without a human rationale.";
    }

    void service
      .recordDecision(draft)
      .then(refreshWorkspace)
      .catch(() => undefined);
    return null;
  }

  const pageDescription: Record<ViewKey, string> = {
    dashboard: `The state of your beliefs. ${data?.theses.length ?? 0} active theses and ${newCount} new evidence items.`,
    inbox: "New information, classified and waiting for your confirmation. The AI proposes; you decide.",
    thesis: "Work one belief in depth: assumptions, evidence map, risks, catalysts, and decision trace.",
    changed: "Material change since each last review, mapped to assumptions and cited evidence.",
  };

  if (!data || !selectedThesisId) {
    return (
      <div className="app-shell">
        <main className="main">
          <header className="page-head">
            <h1>Thesis Dashboard</h1>
            <p>Loading workspace.</p>
          </header>
        </main>
      </div>
    );
  }

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
            onAccept={(evidenceId) => void acceptEvidence(evidenceId)}
            onCorrect={setCorrecting}
            onDismiss={(evidenceId) => void dismissEvidence(evidenceId)}
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
