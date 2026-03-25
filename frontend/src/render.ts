import type {
  AgentCardState,
  ReportViewState,
  RunViewState,
  TerminalLineState,
} from "./state.js";
import { renderComposerButtonLabel, type AppState } from "./state.js";

export function renderApp(options: {
  state: AppState;
  config: {
    feedMode: AppState["feedMode"];
    runtimeRunKey?: string;
  };
  run: RunViewState;
  report: ReportViewState;
  agentCards: AgentCardState[];
}): string {
  const { state, config, run, report, agentCards } = options;
  const panelMode = state.run ? "active" : "idle";

  return `
    <div class="app-shell ${state.canvasCollapsed ? "canvas-collapsed" : ""}">
      <div class="app-frame">
        <div class="workspace-shell">
          <section class="left-panel ${panelMode}">
            <div class="chat-thread" data-role="dialogue-feed">
              ${renderDialogueFeed(state, run, report)}
            </div>

            <div class="chat-composer-wrap">
              ${panelMode === "idle" ? `<p class="composer-lead">Ask about any US stock</p>` : ""}
              <form class="chat-composer" data-role="query-form">
                <label class="sr-only" for="query-input">Research question</label>
                <textarea
                  id="query-input"
                  class="chat-input"
                  name="question"
                  placeholder="e.g. MSFT 未来六个月值不值得买？"
                  ${state.connectionStatus === "creating" ? "disabled" : ""}
                >${escapeHtml(state.composerText)}</textarea>
                <div class="composer-actions">
                  <p class="composer-note" data-role="composer-note">${escapeHtml(
                    state.errorMessage ?? "",
                  )}</p>
                  <button
                    class="primary-button"
                    data-role="submit-button"
                    type="submit"
                    ${state.connectionStatus === "creating" ? "disabled" : ""}
                  >
                    ${renderComposerButtonLabel(state)}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <div class="shell-layout">
            ${
              state.canvasCollapsed
                ? renderCollapsedRail(agentCards, run.statusTone)
                : `
                  <aside class="right-panel">
                    <div class="canvas-header">
                      <div>
                        <span class="eyebrow">Agent Canvas</span>
                        <h2>Controlled Runtime Terminals</h2>
                      </div>
                      <div class="canvas-header-actions">
                        <span class="tag">${run.completedAgentCount}/${run.totalAgentCount} agents</span>
                        ${renderStatusBadge(run.statusTone, run.stageLabel)}
                        <button class="toggle-button" data-action="toggle-canvas" type="button">
                          Collapse
                        </button>
                      </div>
                    </div>
                    <section class="agent-grid">
                      ${agentCards.map(renderAgentCard).join("")}
                    </section>
                  </aside>
                  <aside class="canvas-rail" aria-hidden="true"></aside>
                `
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderDialogueFeed(
  state: AppState,
  run: RunViewState,
  report: ReportViewState,
): string {
  const queryLabel = state.run ? run.queryLabel : state.composerText.trim();

  if (!queryLabel) {
    return "";
  }

  const parts: string[] = [];

  parts.push(`
    <div class="chat-message user">
      <div class="chat-bubble">
        <p>${escapeHtml(queryLabel)}</p>
      </div>
    </div>
  `);

  if (state.receivedEvents.length > 0 || state.connectionStatus === "creating") {
    parts.push(`
      <div class="chat-message assistant">
        <div class="chat-avatar">D</div>
        <div class="chat-bubble response-stream" data-role="response-stream">
          ${renderStreamingResponse(state, run, report)}
        </div>
      </div>
    `);
  }

  return parts.join("");
}

function renderStreamingResponse(
  state: AppState,
  run: RunViewState,
  report: ReportViewState,
): string {
  const parts: string[] = [];

  if (run.statusTone === "running" || run.statusTone === "idle") {
    parts.push(`
      <div class="inline-status" data-role="inline-status">
        <span class="dot ${run.statusTone}"></span>
        <span>${escapeHtml(run.stageLabel)}</span>
        <span class="tag">${run.completedAgentCount}/${run.totalAgentCount} agents</span>
      </div>
    `);
  }

  if (report.degradedMessage) {
    parts.push(`<div class="inline-warning">${escapeHtml(report.degradedMessage)}</div>`);
  }

  if (run.streamWarning) {
    parts.push(`<div class="inline-warning">${escapeHtml(run.streamWarning)}</div>`);
  }

  const judgment = report.sections.find((s) => s.key === "final_judgment");
  if (judgment?.content) {
    parts.push(`
      <div class="res-section primary" data-section="final_judgment">
        <div class="res-content">${renderMarkdown(judgment.content)}</div>
      </div>
    `);
  } else if (run.statusTone === "running") {
    parts.push(`<div class="typing-indicator"><span></span><span></span><span></span></div>`);
  }

  for (const s of report.sections) {
    if (s.key === "final_judgment" || !s.content) continue;
    parts.push(`
      <div class="res-section" data-section="${escapeHtml(s.key)}">
        <h3 class="res-heading">${escapeHtml(s.title)}</h3>
        <div class="res-content">${renderMarkdown(s.content)}</div>
        ${
          s.citations.length
            ? `<div class="res-citations">${s.citations.map((c) => `<span class="cite">${escapeHtml(c)}</span>`).join("")}</div>`
            : ""
        }
      </div>
    `);
  }

  return parts.join("");
}

export function renderTerminalLines(lines: TerminalLineState[]): string {
  if (lines.length === 0) {
    return `
      <div class="terminal-line neutral terminal-placeholder" data-role="terminal-placeholder">
        <span class="terminal-prefix">idle&gt;</span>
        <span class="terminal-line-text">awaiting controlled runtime output</span>
      </div>
    `;
  }

  return lines.map(renderTerminalLine).join("");
}

export function renderTerminalLine(line: TerminalLineState): string {
  return `
    <div
      class="terminal-line ${line.tone} kind-${line.kind}"
      data-line-id="${escapeHtml(line.id)}"
      title="${escapeHtml(line.ts)}"
    >
      <span class="terminal-prefix">${escapeHtml(line.prefix)}</span>
      <span class="terminal-line-text">${escapeHtml(line.text)}</span>
    </div>
  `;
}

function renderAgentCard(card: AgentCardState): string {
  return `
    <article
      class="panel-section terminal-card ${card.status === "running" ? "running" : ""}"
      data-agent-card="${card.agent}"
    >
      <div class="terminal-topbar">
        <div class="window-dots" aria-hidden="true">
          <span class="window-dot red"></span>
          <span class="window-dot yellow"></span>
          <span class="window-dot green"></span>
        </div>
        <div class="terminal-header-copy">
          <div class="terminal-name-row">
            <span class="terminal-name">${escapeHtml(card.label)}</span>
            <span class="terminal-agent-glyph">${escapeHtml(agentGlyph(card.agent))}</span>
          </div>
          <div class="terminal-phase-row">
            <span
              class="terminal-live-indicator ${card.isLive ? "is-live" : ""}"
              data-field="live-indicator"
            >
              <span class="terminal-live-dot"></span>
              ${card.isLive ? "Live" : "Idle"}
            </span>
            <span class="terminal-phase" data-field="phase-label">${escapeHtml(card.phaseLabel)}</span>
          </div>
        </div>
      </div>
      <div class="terminal-body">
        <div class="terminal-status-row">
          <span class="status-inline" data-field="status-inline">
            <span class="dot" style="color:${statusColor(card.status)}"></span>
            <strong data-field="status-label">${escapeHtml(card.status)}</strong>
          </span>
          <span class="tag" data-field="event-count">${card.eventCount} events</span>
        </div>

        <div class="terminal-taskline terminal-commandline">
          <span class="terminal-shell-prompt">root@swarm:~$</span>
          <p class="terminal-value mono" data-field="current-task">${escapeHtml(card.currentTask)}</p>
        </div>

        <div class="terminal-screen ${card.isLive ? "live" : ""}" data-field="terminal-screen">
          <div class="terminal-screen-header">
            <span class="terminal-screen-title">runtime transcript</span>
            <span class="terminal-screen-meta" data-field="screen-meta">${escapeHtml(card.phaseLabel)}</span>
          </div>
          <div class="terminal-lines" data-role="terminal-lines" data-agent="${card.agent}">
            ${renderTerminalLines(card.transcriptLines)}
          </div>
          <div class="terminal-screen-footer">
            <div class="terminal-mini-summary">
              <span class="terminal-mini-chip">${escapeHtml(card.latestTool)}</span>
              <span class="terminal-mini-chip ${patchClass(card.patchTone)}">${escapeHtml(card.latestPatch)}</span>
            </div>
            <div
              class="terminal-cursor-row ${card.isLive ? "" : "is-hidden"}"
              data-role="terminal-cursor"
              data-agent="${card.agent}"
            >
              <span class="terminal-cursor"></span>
            </div>
          </div>
        </div>

        <div class="terminal-summary-grid compact">
          <div class="terminal-summary-cell">
            <span class="terminal-label">Recent Action</span>
            <p class="terminal-value mono" data-field="recent-action">${escapeHtml(card.recentAction)}</p>
          </div>
          <div class="terminal-summary-cell">
            <span class="terminal-label">Latest Finding</span>
            <p class="terminal-value" data-field="latest-finding">${escapeHtml(card.latestFinding)}</p>
          </div>
          <p class="sr-only" data-field="latest-tool">${escapeHtml(card.latestTool)}</p>
          <p class="sr-only ${patchClass(card.patchTone)}" data-field="latest-patch">${escapeHtml(card.latestPatch)}</p>
        </div>
      </div>
    </article>
  `;
}

function renderCollapsedRail(
  agentCards: AgentCardState[],
  statusTone: "idle" | "running" | "completed" | "degraded" | "failed",
): string {
  return `
    <aside class="canvas-rail">
      <div class="rail-top">
        <button class="toggle-button" data-action="toggle-canvas" type="button">Open</button>
        <span class="rail-badge">${escapeHtml(statusTone)}</span>
      </div>
      <div class="rail-bottom">
        <div class="rail-status-stack">
          ${agentCards
            .map(
              (card) =>
                `<span class="rail-agent-dot" title="${escapeHtml(card.label)}" style="background:${statusColor(card.status)}"></span>`,
            )
            .join("")}
        </div>
      </div>
    </aside>
  `;
}

function renderStatusBadge(
  tone: "idle" | "running" | "completed" | "degraded" | "failed",
  label: string,
): string {
  return `
    <span class="badge ${tone}">
      <span class="dot"></span>
      ${escapeHtml(label)}
    </span>
  `;
}

function renderMarkdown(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");
  html = html.replace(/\n\n+/g, "</p><p>");
  html = `<p>${html}</p>`;
  return html;
}

function statusColor(status: AgentCardState["status"]): string {
  switch (status) {
    case "running":
      return "var(--running)";
    case "done":
      return "var(--done)";
    case "degraded":
      return "var(--degraded)";
    case "failed":
      return "var(--failed)";
    case "blocked":
      return "var(--degraded)";
    default:
      return "var(--idle)";
  }
}

function patchClass(tone: AgentCardState["patchTone"]): string {
  switch (tone) {
    case "error":
      return "tag-error";
    case "warning":
      return "tag-warning";
    default:
      return "tag-clean";
  }
}

function agentGlyph(agent: AgentCardState["agent"]): string {
  switch (agent) {
    case "thesis":
      return "</>";
    case "liquidity":
      return "fx";
    case "market_signal":
      return "∿";
    case "judge":
      return "◎";
    default:
      return "•";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
