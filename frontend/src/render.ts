import type {
  AgentCardState,
  ReportViewState,
  RunViewState,
  TerminalLineState,
  TimelineItemViewState,
} from "./state.js";
import type { AppState } from "./state.js";

export function renderApp(options: {
  state: AppState;
  config: {
    feedMode: AppState["feedMode"];
    runtimeRunKey?: string;
  };
  run: RunViewState;
  report: ReportViewState;
  agentCards: AgentCardState[];
  timeline: TimelineItemViewState[];
}): string {
  const { state, config, run, report, agentCards, timeline } = options;

  return `
    <div class="app-shell ${state.canvasCollapsed ? "canvas-collapsed" : ""}">
      <header class="top-rail">
        <div class="brand-lockup">
          <span class="eyebrow">Delphi v0</span>
          <h1 class="brand-title">Structured stock research with visible execution</h1>
          <p class="brand-copy">
            Left side: a fixed six-section investment memo. Right side: the real multi-agent workbench driven by runtime events.
          </p>
        </div>
        <div class="rail-meta" data-role="rail-meta">
          ${renderRailMeta(run, config)}
        </div>
        <button class="toggle-button" data-action="toggle-canvas" type="button">
          ${state.canvasCollapsed ? "Expand Canvas" : "Collapse Canvas"}
        </button>
      </header>

      <div class="shell-layout">
        <section class="left-panel">
          <section class="panel-section query-shell">
            <form class="query-form" data-role="query-form">
              <label class="sr-only" for="query-input">Research question</label>
              <textarea
                id="query-input"
                class="query-input"
                name="question"
                placeholder="Ask a single-ticker US equity question, for example: AAPL 未来三个月值不值得买？"
              >${escapeHtml(state.composerText)}</textarea>
              <div class="composer-actions">
                <p class="composer-note" data-role="composer-note">${escapeHtml(
                  state.errorMessage ?? state.infoMessage ?? "",
                )}</p>
                <button class="primary-button" type="submit">
                  ${state.feedMode === "recorded" ? "Replay Recorded Run" : "Submit Live Query"}
                </button>
              </div>
            </form>
          </section>

          <section class="panel-section status-strip" data-role="status-strip">
            ${renderStatusStrip(run)}
          </section>

          <div data-role="degraded-banner-slot">
            ${renderDegradedBanner(report)}
          </div>

          <section class="report-grid" data-role="report-grid">
            ${renderReportGrid(report)}
          </section>
        </section>

        ${
          state.canvasCollapsed
            ? renderCollapsedRail(agentCards, run.statusTone)
            : `
              <aside class="right-panel">
                <div class="canvas-header">
                  <h2>Agent Canvas</h2>
                  <span class="tag">Controlled runtime terminals</span>
                </div>
                <section class="agent-grid">
                  ${agentCards.map(renderAgentCard).join("")}
                </section>
                <section class="timeline-panel panel-section">
                  <h2>Recent Timeline</h2>
                  <div class="timeline-list" data-role="timeline-list">
                    ${renderTimelineList(timeline)}
                  </div>
                </section>
              </aside>
              <aside class="canvas-rail" aria-hidden="true"></aside>
            `
        }
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
    <div class="status-main">
      <div class="status-title-row">
        <h2 class="status-title">${escapeHtml(run.stageLabel)}</h2>
        ${renderStatusBadge(run.statusTone, run.connectionStatus)}
      </div>
      <p class="status-subtitle">${escapeHtml(run.stageDetail)}</p>
    </div>
    <div class="status-metrics">
      <span class="tag">${escapeHtml(run.queryLabel)}</span>
      <span class="tag">${run.completedAgentCount}/${run.totalAgentCount} agents settled</span>
    </div>
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
    <article class="panel-section report-card ${section.highlight ? "highlight" : ""}">
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
          <span class="terminal-name">${escapeHtml(card.label)}</span>
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

        <div class="terminal-taskline">
          <span class="terminal-label">Active lane</span>
          <p class="terminal-value" data-field="current-task">${escapeHtml(card.currentTask)}</p>
        </div>

        <div class="terminal-screen ${card.isLive ? "live" : ""}" data-field="terminal-screen">
          <div class="terminal-screen-header">
            <span class="terminal-screen-title">runtime transcript</span>
            <span class="terminal-screen-meta" data-field="screen-meta">${escapeHtml(card.phaseLabel)}</span>
          </div>
          <div class="terminal-scroll" data-role="terminal-scroll" data-agent="${card.agent}">
            <div class="terminal-lines" data-role="terminal-lines" data-agent="${card.agent}">
              ${renderTerminalLines(card.transcriptLines)}
            </div>
          </div>
          <div class="terminal-screen-footer">
            <button
              class="ghost-button jump-live-button is-hidden"
              data-action="jump-terminal"
              data-agent="${card.agent}"
              type="button"
            >
              Jump to live
            </button>
            <div
              class="terminal-cursor-row ${card.isLive ? "" : "is-hidden"}"
              data-role="terminal-cursor"
              data-agent="${card.agent}"
            >
              <span class="terminal-cursor"></span>
            </div>
          </div>
        </div>

        <div class="terminal-summary-grid">
          <div class="label-group">
            <span class="terminal-label">Recent Action</span>
            <p class="terminal-value mono" data-field="recent-action">${escapeHtml(card.recentAction)}</p>
          </div>

          <div class="label-group">
            <span class="terminal-label">Latest Finding</span>
            <p class="terminal-value" data-field="latest-finding">${escapeHtml(card.latestFinding)}</p>
          </div>
        </div>

        <div class="terminal-tags">
          <span class="tag" data-field="latest-tool">${escapeHtml(card.latestTool)}</span>
          <span class="tag ${patchClass(card.patchTone)}" data-field="latest-patch">${escapeHtml(card.latestPatch)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderTimelineItem(item: TimelineItemViewState): string {
  return `
    <article class="timeline-item">
      <span class="timeline-time">${escapeHtml(item.timestampLabel)}</span>
      <span class="timeline-agent">${escapeHtml(item.agentLabel)}</span>
      <div class="timeline-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.summary)}</span>
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
