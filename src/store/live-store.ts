"use client";

/**
 * Live Desk workspaces.
 *
 * Each live run gets its own governed DomainState seeded from the run's
 * baseline thesis. Reviews and applies go through the same transition gateway
 * as the fixture demo; this store never edits thesis state directly.
 * Persistence is browser-local (the prototype has no server database yet).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DemoRole, DomainState, StateTransition, ThesisDeltaProposal, ValidationResult, Review } from "@/domain/types";
import { applyApprovedChanges, initialDomainState, recordReview } from "@/domain/transitions";
import { DEMO_USERS } from "@/domain/policies";
import type { LiveRunResult } from "@/engine/analysis/run";

const MAX_SAVED_RUNS = 12;

export interface LiveWorkspace {
  result: LiveRunResult;
  domain: DomainState;
  savedAt: string;
}

export interface LiveReviewCommand {
  proposalId: string;
  action: "accept" | "reject" | "escalate" | "defer";
  reasonCode?: string;
  note?: string;
}

interface LiveStoreState {
  workspaces: Record<string, LiveWorkspace>;
  /** Run IDs, newest first. */
  order: string[];
  accessToken: string;
  setAccessToken: (token: string) => void;
  saveRun: (result: LiveRunResult) => void;
  removeRun: (runId: string) => void;
  review: (runId: string, role: DemoRole, command: LiveReviewCommand) => ValidationResult<{ review?: Review }>;
  apply: (runId: string, role: DemoRole) => ValidationResult<{ transition: StateTransition }>;
}

export function proposalsIndex(result: LiveRunResult): Map<string, ThesisDeltaProposal> {
  return new Map(result.proposals.map((p) => [p.proposalId, p]));
}

const rejected = (code: string, message: string) => ({
  status: "rejected" as const,
  messages: [{ validator: "policy" as const, severity: "error" as const, code, message }],
});

export const useLiveStore = create<LiveStoreState>()(
  persist(
    (set, get) => ({
      workspaces: {},
      order: [],
      accessToken: "",

      setAccessToken: (accessToken) => set({ accessToken }),

      saveRun: (result) =>
        set((s) => {
          const runId = result.run.workflowRun.runId;
          const order = [runId, ...s.order.filter((id) => id !== runId)];
          const kept = order.slice(0, MAX_SAVED_RUNS);
          const workspaces: Record<string, LiveWorkspace> = {};
          for (const id of kept) {
            workspaces[id] =
              id === runId
                ? { result, domain: initialDomainState(result.baselineThesis), savedAt: new Date().toISOString() }
                : s.workspaces[id]!;
          }
          return { workspaces, order: kept };
        }),

      removeRun: (runId) =>
        set((s) => {
          const workspaces = { ...s.workspaces };
          delete workspaces[runId];
          return { workspaces, order: s.order.filter((id) => id !== runId) };
        }),

      review: (runId, role, command) => {
        const ws = get().workspaces[runId];
        const proposal = ws && proposalsIndex(ws.result).get(command.proposalId);
        if (!ws || !proposal) return rejected("proposal_unknown", "Unknown proposal.");
        const result = recordReview(ws.domain, {
          proposal,
          action: command.action,
          actor: DEMO_USERS[role],
          context: { runDegraded: ws.result.run.workflowRun.status === "degraded", blockedByPolicy: false },
          now: new Date().toISOString(),
          reasonCode: command.reasonCode,
          note: command.note,
          escalatedToUserId: command.action === "escalate" ? DEMO_USERS.pm.userId : undefined,
          deferredUntil: command.action === "defer" ? new Date(Date.now() + 7 * 86_400_000).toISOString() : undefined,
        });
        if (result.status !== "rejected" && result.value) {
          const domain = result.value.state;
          set((s) => ({ workspaces: { ...s.workspaces, [runId]: { ...ws, domain } } }));
        }
        return { status: result.status, value: { review: result.value?.review }, messages: result.messages };
      },

      apply: (runId, role) => {
        const ws = get().workspaces[runId];
        if (!ws) return rejected("run_unknown", "Unknown run.");
        const result = applyApprovedChanges(ws.domain, {
          actor: DEMO_USERS[role],
          now: new Date().toISOString(),
          runBundle: ws.result.run,
          proposalsById: proposalsIndex(ws.result),
          tenantId: ws.result.run.workflowRun.tenantId,
        });
        if (result.status !== "rejected" && result.value) {
          const domain = result.value.state;
          set((s) => ({ workspaces: { ...s.workspaces, [runId]: { ...ws, domain } } }));
          return { status: result.status, value: { transition: result.value.transition }, messages: result.messages };
        }
        return { status: "rejected", messages: result.messages };
      },
    }),
    {
      name: "delphi-live-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ workspaces: s.workspaces, order: s.order, accessToken: s.accessToken }),
    },
  ),
);
