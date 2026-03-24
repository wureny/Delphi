import type {
  AgentCardState,
  ReportViewState,
  ResearchMapViewState,
  RunViewState,
  TerminalLineState,
  TimelineItemViewState,
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
  researchMap: ResearchMapViewState;
  agentCards: AgentCardState[];
  timeline: TimelineItemViewState[];
}): string {
  const { state, config, run, report, researchMap, agentCards, timeline } = options;
  const hasRunActivity = Boolean(state.run || state.receivedEvents.length > 0);

  return `
    <div class="app-shell ${state.canvasCollapsed ? "canvas-collapsed" : ""}">
      <header class="command-header">
        <div class="header-brand">
          <span class="brand-mark">DELPHI_TERMINAL</span>
          <nav class="header-nav" aria-label="Primary">
            <span class="header-nav-item active">Terminal</span>
            <span class="header-nav-item">Analytics</span>
            <span class="header-nav-item">Strategy</span>
            <span class="header-nav-item">History</span>
          </nav>
        </div>
        <div class="header-actions">
          <div class="rail-meta" data-role="rail-meta">
            ${renderRailMeta(run, config)}
          </div>
          <button class="toggle-button" data-action="toggle-canvas" type="button">
            ${state.canvasCollapsed ? "Expand Canvas" : "Collapse Canvas"}
          </button>
        </div>
      </header>

      <div class="app-frame">
        <aside class="command-sidebar">
          <div class="sidebar-node">
            <span class="sidebar-node-mark">■</span>
            <span class="sidebar-node-label">NODE_05</span>
          </div>
          ${
            hasRunActivity
              ? `
                <section class="sidebar-log panel-section">
                  <div class="section-kicker">Runtime Log</div>
                  <div class="sidebar-log-list" data-role="timeline-list">
                    ${renderTimelineList(timeline)}
                  </div>
                </section>
              `
              : `<div class="sidebar-note">Awaiting the first run.</div>`
          }
          <div class="sidebar-footer">
            <span class="sidebar-link subtle">Help</span>
            <span class="sidebar-link subtle">Exit</span>
          </div>
        </aside>

        <div class="workspace-shell">
          <section class="left-panel">
            <div class="chat-shell panel-section">
              <div class="pane-heading compact">
                <span class="eyebrow">Conversation</span>
                <h1 class="brand-title compact">Ask Delphi</h1>
                <p class="brand-copy compact">
                  Ask one stock question. Delphi will hydrate data, graph, and report.
                </p>
              </div>

              ${
                hasRunActivity
                  ? `
                    <section class="status-strip compact" data-role="status-strip">
                      ${renderStatusStrip(run)}
                    </section>
                  `
                  : `
                    <section class="idle-strip compact">
                      <span class="tag">Live runtime</span>
                      <span class="tag">4 agents</span>
                      <span class="tag">Graph-backed</span>
                    </section>
                  `
              }

              <div class="chat-thread" data-role="dialogue-feed">
                ${renderDialogueFeed(state, run, report)}
              </div>
            </div>

            ${
              hasRunActivity
                ? `
                  <div data-role="degraded-banner-slot">
                    ${renderDegradedBanner(report)}
                  </div>
                `
                : ""
            }

            <section class="panel-section query-shell chat-composer-shell">
              <form class="query-form" data-role="query-form">
                <label class="sr-only" for="query-input">Research question</label>
                <textarea
                  id="query-input"
                  class="query-input"
                  name="question"
                  placeholder="Ask one stock question. Example: MSFT 未来六个月值不值得买？"
                  ${state.connectionStatus === "creating" ? "disabled" : ""}
                >${escapeHtml(state.composerText)}</textarea>
                <div class="composer-actions">
                  <p class="composer-note" data-role="composer-note">${escapeHtml(
                    state.errorMessage ?? state.infoMessage ?? "",
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
            </section>

            ${
              hasRunActivity
                ? `
                  <section class="memo-shell">
                    <div class="memo-shell-header">
                      <div>
                        <div class="section-kicker">Structured Output</div>
                        <p class="memo-shell-copy">
                          Read the report, or open the Research Map to see how Delphi connected the main view.
                        </p>
                      </div>
                      <div class="memo-shell-tabs">
                        <button
                          class="memo-tab ${state.activeOutputPanel === "report" ? "active" : ""}"
                          type="button"
                          data-action="toggle-output-panel"
                          data-panel="report"
                          aria-pressed="${state.activeOutputPanel === "report" ? "true" : "false"}"
                        >
                          Report
                        </button>
                        <button
                          class="memo-tab ${state.activeOutputPanel === "research_map" ? "active" : ""}"
                          type="button"
                          data-action="toggle-output-panel"
                          data-panel="research_map"
                          aria-pressed="${state.activeOutputPanel === "research_map" ? "true" : "false"}"
                        >
                          Research Map
                        </button>
                      </div>
                    </div>
                    <section
                      class="report-grid"
                      data-role="report-panel"
                      ${state.activeOutputPanel === "report" ? "" : "hidden"}
                    >
                      <div data-role="report-grid">${renderReportGrid(report)}</div>
                    </section>
                    <section
                      class="research-map-shell"
                      data-role="research-map-panel"
                      ${state.activeOutputPanel === "research_map" ? "" : "hidden"}
                    >
                      <div data-role="research-map">${renderResearchMap(researchMap)}</div>
                    </section>
                  </section>
                `
                : ""
            }
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
                      <span class="tag">4 live agents · controlled stream</span>
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

export function renderRailMeta(
  run: RunViewState,
  config: {
    feedMode: AppState["feedMode"];
    runtimeRunKey?: string;
  },
): string {
  return `
    ${renderStatusBadge(run.statusTone, `${run.stageLabel}`)}
    <span class="tag">${escapeHtml(run.ticker)} · ${escapeHtml(run.horizon)}</span>
    <span class="tag">${escapeHtml(run.feedLabel)}</span>
    ${
      config.feedMode === "sse" && config.runtimeRunKey
        ? `<span class="tag">run ${escapeHtml(config.runtimeRunKey)}</span>`
        : ""
    }
  `;
}

export function renderStatusStrip(run: RunViewState): string {
  return `
    <div class="chat-status-row">
      ${renderStatusBadge(run.statusTone, run.stageLabel)}
      <span class="tag">${run.completedAgentCount}/${run.totalAgentCount} agents</span>
      <span class="tag">${escapeHtml(run.ticker)} · ${escapeHtml(run.horizon)}</span>
      ${run.streamWarning ? `<span class="tag warning">Reconnecting</span>` : ""}
    </div>
    <p class="chat-status-copy">${escapeHtml(run.stageDetail)}</p>
  `;
}

export function renderDialogueFeed(
  state: AppState,
  run: RunViewState,
  report: ReportViewState,
): string {
  if (!state.run && state.receivedEvents.length === 0) {
    return `
      <div class="chat-message assistant">
        <div class="chat-avatar">D</div>
        <div class="chat-bubble idle">
          <p>${escapeHtml(state.infoMessage ?? "Ask one stock question to start a live run.")}</p>
        </div>
      </div>
    `;
  }

  const finalJudgment = report.sections.find(
    (section) => section.key === "final_judgment",
  );
  const queryLabel = state.run ? run.queryLabel : state.composerText.trim();
  const swarmCopy =
    finalJudgment?.content ||
    run.stageDetail ||
    "Runtime accepted the query and is preparing the multi-agent workbench.";
  const failureCopy =
    report.degradedMessage && !finalJudgment?.content
      ? `
        <div class="chat-message assistant warning">
          <div class="chat-avatar">!</div>
          <div class="chat-bubble">
            <p>${escapeHtml(report.degradedMessage)}</p>
          </div>
        </div>
      `
      : "";
  const streamWarningCopy = run.streamWarning
    ? `
      <div class="chat-message assistant warning">
        <div class="chat-avatar">!</div>
        <div class="chat-bubble">
          <p>${escapeHtml(run.streamWarning)}</p>
        </div>
      </div>
    `
    : "";

  return `
    <div class="chat-message assistant">
      <div class="chat-avatar">D</div>
      <div class="chat-bubble">
        <p>${escapeHtml(state.infoMessage ?? "Ask a stock question to start a live multi-agent research run.")}</p>
      </div>
    </div>

    ${
      queryLabel
        ? `
          <div class="chat-message user">
            <div class="chat-bubble">
              <p>${escapeHtml(queryLabel)}</p>
            </div>
          </div>
        `
        : ""
    }

    <div class="chat-message assistant">
      <div class="chat-avatar">D</div>
      <div class="chat-bubble">
        <p>${escapeHtml(swarmCopy)}</p>
        <div class="dialogue-metrics">
          <span class="dialogue-chip ${run.statusTone}">${escapeHtml(run.stageLabel)}</span>
          <span class="dialogue-chip">${run.completedAgentCount}/${run.totalAgentCount} settled</span>
          <span class="dialogue-chip">${escapeHtml(run.feedLabel)}</span>
        </div>
      </div>
    </div>

    ${failureCopy}
    ${streamWarningCopy}
  `;
}

export function renderDegradedBanner(report: ReportViewState): string {
  if (!report.degradedMessage) {
    return "";
  }

  return `<div class="degraded-banner">${escapeHtml(report.degradedMessage)}</div>`;
}

export function renderReportGrid(report: ReportViewState): string {
  return report.sections.map(renderReportSection).join("");
}

export function renderResearchMap(map: ResearchMapViewState): string {
  return `
    <div class="research-map">
      <header class="research-map-hero">
        <div>
          <span class="research-map-kicker">Why Delphi Thinks This</span>
          <h3>${escapeHtml(map.headline)}</h3>
        </div>
        ${map.updatedAtLabel ? `<span class="tag">Updated ${escapeHtml(map.updatedAtLabel)}</span>` : ""}
      </header>
      <p class="research-map-summary">${escapeHtml(map.summary)}</p>
      <div class="research-map-grid">
        ${map.cards.map(renderResearchMapCard).join("")}
      </div>
      <footer class="research-map-footer">
        <span class="research-map-footer-label">Evidence Trail</span>
        <div class="citations">
          ${
            map.evidenceTrail.length > 0
              ? map.evidenceTrail
                  .map(
                    (citation) =>
                      `<span class="citation-pill">${escapeHtml(truncateMiddle(citation, 28))}</span>`,
                  )
                  .join("")
              : `<span class="citation-pill">Evidence refs will appear here as the run settles.</span>`
          }
        </div>
      </footer>
    </div>
  `;
}

export function renderTimelineList(timeline: TimelineItemViewState[]): string {
  return timeline.map(renderTimelineItem).join("");
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

function renderReportSection(section: ReportViewState["sections"][number]): string {
  return `
    <article
      class="panel-section report-card ${section.highlight ? "highlight" : ""} emphasis-${section.emphasis}"
      data-action="toggle-insight-focus"
      data-focus-kind="report_section"
      data-section-key="${escapeHtml(section.key)}"
      tabindex="0"
      role="button"
      aria-pressed="${section.emphasis === "selected" ? "true" : "false"}"
    >
      <header class="report-card-header">
        <h3>${escapeHtml(section.title)}</h3>
        <span class="status-chip ${section.status}">
          ${escapeHtml(section.status)}
        </span>
      </header>
      <p class="report-copy ${section.isSkeleton ? "skeleton" : section.content ? "" : "placeholder"}">
        ${
          section.content
            ? escapeHtml(section.content)
            : section.isSkeleton
              ? "Loading..."
              : "No content available yet."
        }
      </p>
      <div class="citations">
        ${
          section.citations.length > 0
            ? section.citations
                .map(
                  (citation) =>
                    `<span class="citation-pill">${escapeHtml(truncateMiddle(citation, 28))}</span>`,
                )
                .join("")
            : `<span class="citation-pill">No citations yet</span>`
        }
      </div>
    </article>
  `;
}

function renderResearchMapCard(
  card: ResearchMapViewState["cards"][number],
): string {
  return `
    <article
      class="panel-section research-card ${card.isPrimary ? "primary" : ""} tone-${card.tone} emphasis-${card.emphasis}"
      data-action="toggle-insight-focus"
      data-focus-kind="research_card"
      data-card-id="${escapeHtml(card.cardId)}"
      tabindex="0"
      role="button"
      aria-pressed="${card.emphasis === "selected" ? "true" : "false"}"
    >
      <header class="research-card-header">
        <div>
          <span class="research-card-label">${escapeHtml(card.label)}</span>
          <span class="status-chip ${card.status}">${escapeHtml(card.status)}</span>
        </div>
        <span class="research-card-meta">${escapeHtml(card.meta)}</span>
      </header>
      <p class="research-card-copy">${escapeHtml(card.summary)}</p>
    </article>
  `;
}

function renderAgentCard(card: AgentCardState): string {
  return `
    <article
      class="panel-section terminal-card ${card.status === "running" ? "running" : ""} ${card.expanded ? "expanded" : ""}"
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
        <button
          class="terminal-card-button"
          type="button"
          data-action="toggle-terminal"
          data-agent="${card.agent}"
          aria-pressed="${card.expanded ? "true" : "false"}"
        >
          ${card.expanded ? "Collapse" : "Expand"}
        </button>
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
          <div class="terminal-lines" data-role="terminal-scroll" data-agent="${card.agent}">
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

function renderTimelineItem(item: TimelineItemViewState): string {
  return `
    <article class="timeline-item compact">
      <span class="timeline-time">${escapeHtml(item.timestampLabel)}</span>
      <div class="timeline-copy">
        <strong>${escapeHtml(item.agentLabel)}</strong>
        <span>${escapeHtml(item.title)}</span>
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

function truncateMiddle(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  const head = Math.floor((limit - 3) / 2);
  const tail = Math.ceil((limit - 3) / 2);
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
