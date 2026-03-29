import type {
  AgentCardState,
  GraphSnapshotViewState,
  ReportViewState,
  ResearchMapViewState,
  RunViewState,
  TerminalLineState,
  TimelineItemViewState,
} from "./state.js";
import { renderMarkdown } from "./markdown.js";
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
  graphSnapshot: GraphSnapshotViewState;
  agentCards: AgentCardState[];
  timeline: TimelineItemViewState[];
}): string {
  const { state, config, run, report, researchMap, graphSnapshot, agentCards, timeline } = options;
  const hasRunActivity = Boolean(
    state.run ||
      state.receivedEvents.length > 0 ||
      state.pendingSubmittedQuestion ||
      state.connectionStatus === "creating",
  );
  const leftPanelState = hasRunActivity ? "running" : "idle";

  return `
    <div class="app-shell ${state.canvasCollapsed ? "canvas-collapsed" : ""}">
      <div class="app-frame">
        <div class="workspace-shell">
          <section class="left-panel ${leftPanelState}">
            <div class="chat-shell conversation-main">
              ${
                hasRunActivity
                  ? `
                    <div class="chat-thread answer-thread" data-role="dialogue-feed">
                      ${renderDialogueFeed(state, run, report, researchMap)}
                    </div>
                  `
                  : renderIdleConversation(state)
              }
              <section class="answer-composer-shell">
                <form class="chat-composer" data-role="query-form">
                  <div class="chat-composer-inner">
                    <label class="sr-only" for="query-input">Research question</label>
                    <textarea
                      id="query-input"
                      class="chat-input"
                      name="question"
                      placeholder="Ask about any US stock..."
                      ${state.connectionStatus === "creating" ? "disabled" : ""}
                    >${escapeHtml(state.composerText)}</textarea>
                    <button
                      class="send-btn"
                      data-role="submit-button"
                      type="submit"
                      ${state.connectionStatus === "creating" ? "disabled" : ""}
                    >
                      ${renderComposerButtonLabel(state)}
                    </button>
                  </div>
                  <p class="composer-note" data-role="composer-note">${escapeHtml(
                    state.errorMessage ?? state.infoMessage ?? "",
                  )}</p>
                </form>
              </section>
            </div>
          </section>

          <div class="shell-layout">
            ${
              state.canvasCollapsed
                ? renderCollapsedRail(agentCards, run.statusTone)
                : `
                  <aside class="right-panel">
                    <div class="canvas-toolbar">
                      <div class="rail-meta" data-role="rail-meta">
                        ${renderRailMeta(run, config)}
                      </div>
                      <button class="toggle-button" data-action="toggle-canvas" type="button">
                        ${state.canvasCollapsed ? "Expand Canvas" : "Collapse Canvas"}
                      </button>
                    </div>
                    <div class="canvas-header">
                      <div class="canvas-header-copy">
                        <span class="eyebrow">Delphi Workspace</span>
                        <h2>Live Desk</h2>
                        <p class="canvas-subcopy">Watch the analysts build the case in real time, or inspect the structure behind the current call.</p>
                      </div>
                      <span class="tag">${escapeHtml(renderWorkspaceTag(run))}</span>
                    </div>
                    <div class="canvas-tabs" data-role="canvas-tabs">
                      ${renderCanvasTab("terminals", "Analysts", state.activeCanvasPanel === "terminals")}
                      ${renderCanvasTab("graph", "Case Structure", state.activeCanvasPanel === "graph")}
                    </div>
                    <section class="canvas-panel-body" data-role="canvas-panel-body" data-panel="${escapeHtml(state.activeCanvasPanel)}">
                      ${
                        !hasRunActivity
                          ? renderIdleWorkspacePreview()
                          : state.activeCanvasPanel === "graph"
                          ? renderGraphSnapshot(graphSnapshot)
                          : `<div class="agent-grid">${agentCards.map(renderAgentCard).join("")}</div>`
                      }
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
  void config;
  return `
    ${renderStatusBadge(run.statusTone, `${run.stageLabel}`)}
    <span class="tag">${escapeHtml(run.ticker)} · ${escapeHtml(run.horizon)}</span>
    <span class="tag">${run.completedAgentCount}/${run.totalAgentCount} specialists</span>
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
  researchMap: ResearchMapViewState,
): string {
  const queryLabel = run.queryLabel.trim();
  const showReasoningMap =
    researchMap.cards.some((card) => card.status !== "waiting") ||
    researchMap.evidenceTrail.length > 0;

  return `
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
      <div class="chat-bubble answer-bubble">
        <div class="answer-stream">
          ${renderAnswerLead(run)}
          ${renderInlineRunStatus(run)}
          ${
            report.degradedMessage
              ? `<div class="inline-alert">${escapeHtml(report.degradedMessage)}</div>`
              : ""
          }
          <section class="answer-sections">
            ${renderResponseSections(report, run, researchMap)}
          </section>
          ${
            showReasoningMap
              ? `
                <section class="answer-map-inline">
                  <h3 class="answer-map-heading">How Delphi got there</h3>
                  <p class="answer-map-summary">${escapeHtml(researchMap.summary)}</p>
                  ${renderResearchMap(researchMap)}
                </section>
              `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function renderIdleConversation(state: AppState): string {
  const examples = [
    "Is AAPL a buy over the next 3 months?",
    "What would change the view on NVDA?",
    "How fragile is TSLA if liquidity tightens again?",
  ];

  return `
    <div class="idle-conversation">
      <p class="idle-kicker">Ask about any US stock</p>
      <p class="idle-helper">${escapeHtml(state.infoMessage ?? "Ask one stock question and Delphi will turn it into a structured investment case.")}</p>
      <div class="idle-examples">
        ${examples
          .map(
            (example) => `
              <button
                class="idle-example"
                type="button"
                data-action="apply-example-query"
                data-example-query="${escapeHtml(example)}"
              >
                ${escapeHtml(example)}
              </button>
            `,
          )
          .join("")}
      </div>
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

export function renderResearchMap(map: ResearchMapViewState): string {
  return `
    <div class="research-map">
      <header class="research-map-hero">
        <div>
          <span class="research-map-kicker">Case at a glance</span>
          <h3>${escapeHtml(map.headline)}</h3>
        </div>
        ${map.updatedAtLabel ? `<span class="tag">Updated ${escapeHtml(map.updatedAtLabel)}</span>` : ""}
      </header>
      <p class="research-map-summary">${escapeHtml(map.summary)}</p>
      <div class="research-map-grid">
        ${map.cards.map(renderResearchMapCard).join("")}
      </div>
      <footer class="research-map-footer">
        <span class="research-map-footer-label">Linked trail</span>
        <div class="citations">
          ${
            map.evidenceTrail.length > 0
              ? map.evidenceTrail
                  .map(
                    (citation) =>
                      `<span class="citation-pill">${escapeHtml(displayEvidenceTrailRef(citation))}</span>`,
                  )
                  .join("")
              : `<span class="citation-pill">Evidence refs will appear here as the run settles.</span>`
          }
        </div>
      </footer>
    </div>
  `;
}

export function renderGraphSnapshot(snapshot: GraphSnapshotViewState): string {
  return `
    <div class="graph-view">
      <header class="graph-view-header">
        <div>
          <span class="research-map-kicker">Case structure</span>
          <h3>${escapeHtml(snapshot.headline)}</h3>
          <p class="graph-header-copy">Each point is part of the current investment case. The links show how Delphi connected them into the final answer.</p>
        </div>
        <div class="graph-meta">
          <span class="tag">${snapshot.nodeCount} points</span>
          <span class="tag">${snapshot.edgeCount} links</span>
          ${snapshot.updatedAtLabel ? `<span class="tag">Updated ${escapeHtml(snapshot.updatedAtLabel)}</span>` : ""}
          <button class="ghost-button graph-reset-button" type="button" data-action="center-graph">Re-center</button>
        </div>
      </header>
      <p class="graph-view-summary">${escapeHtml(snapshot.summary)}</p>
      <p class="graph-view-helper">Drag to explore the structure.</p>
      <div class="graph-stage">
        <svg class="graph-svg" viewBox="0 0 1280 760" preserveAspectRatio="xMinYMin meet" aria-label="Structured graph snapshot">
          ${snapshot.edges.map(renderGraphEdge).join("")}
          ${snapshot.nodes.map(renderGraphNode).join("")}
        </svg>
      </div>
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
        <span class="terminal-line-text">waiting for live notes</span>
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

export function renderReportSection(section: ReportViewState["sections"][number]): string {
  const linkageLabel =
    section.citations.length > 0 ? `${section.citations.length} linked signals` : "";
  const title = displaySectionTitle(section.key, section.title);

  return `
    <article
      class="answer-section-block ${section.highlight ? "highlight" : ""} emphasis-${section.emphasis} ${section.key === "final_judgment" ? "primary" : ""}"
      data-action="toggle-insight-focus"
      data-focus-kind="report_section"
      data-section-key="${escapeHtml(section.key)}"
      data-section="${escapeHtml(section.key)}"
      tabindex="0"
      role="button"
      aria-pressed="${section.emphasis === "selected" ? "true" : "false"}"
    >
      <header class="answer-section-header">
        <div class="answer-section-title-wrap">
          ${
            section.key === "final_judgment"
              ? `<span class="answer-section-kicker">Delphi's call</span>`
              : `<h3 class="res-heading">${escapeHtml(title)}</h3>`
          }
        </div>
        ${
          section.status !== "ready"
            ? `
              <span class="status-chip ${section.status}">
                ${escapeHtml(section.status)}
              </span>
            `
            : ""
        }
      </header>
      <div class="answer-section-copy res-content ${section.isSkeleton ? "skeleton" : section.content ? "" : "placeholder"}">
        ${
          section.content
            ? renderMarkdown(section.content)
            : section.isSkeleton
              ? ""
              : section.key === "final_judgment"
                ? renderTypingIndicator()
                : ""
        }
      </div>
      ${
        linkageLabel
          ? `<div class="answer-section-meta">${escapeHtml(linkageLabel)}</div>`
          : ""
      }
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
          <span class="status-chip ${card.status}">${escapeHtml(displayResearchMapStatus(card.status))}</span>
        </div>
        <span class="research-card-meta">${escapeHtml(card.meta)}</span>
      </header>
      <p class="research-card-copy">${escapeHtml(card.summary)}</p>
    </article>
  `;
}

function renderCanvasTab(
  panel: "terminals" | "graph",
  label: string,
  active: boolean,
): string {
  return `
    <button
      class="canvas-tab ${active ? "active" : ""}"
      type="button"
      data-action="toggle-canvas-panel"
      data-panel="${escapeHtml(panel)}"
      aria-pressed="${active ? "true" : "false"}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderIdleWorkspacePreview(): string {
  const lanes = [
    {
      label: "Thesis",
      summary: "Builds the core case around business quality, catalysts, and execution signals.",
    },
    {
      label: "Liquidity",
      summary: "Reads the rates and macro backdrop to judge whether the environment helps or hurts the case.",
    },
    {
      label: "Market Signal",
      summary: "Checks what price action and positioning imply about what the market already expects.",
    },
    {
      label: "Judge",
      summary: "Turns the upstream work into a clear call, the key risks, and what would change the view.",
    },
  ];

  return `
    <div class="workspace-preview">
      <div class="workspace-preview-copy">
        <span class="workspace-preview-kicker">Workspace preview</span>
        <h3>One stock question becomes four specialist views and one final call.</h3>
        <p>After you submit a query, the terminals start streaming, the answer unfolds section by section, and the case map shows how the final view is connected.</p>
      </div>
      <div class="workspace-preview-grid">
        ${lanes
          .map(
            (lane) => `
              <article class="workspace-preview-card">
                <span class="workspace-preview-label">${escapeHtml(lane.label)}</span>
                <p>${escapeHtml(lane.summary)}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderGraphNode(node: GraphSnapshotViewState["nodes"][number]): string {
  return `
    <g
      class="graph-node tone-${node.emphasis} kind-${node.kind} focus-${node.focus}"
      transform="translate(${node.x}, ${node.y})"
      data-action="toggle-insight-focus"
      data-focus-kind="graph_node"
      data-node-id="${escapeHtml(node.nodeId)}"
      tabindex="0"
      role="button"
      aria-pressed="${node.focus === "selected" ? "true" : "false"}"
    >
      <rect rx="18" ry="18" width="${node.width}" height="${node.height}"></rect>
      <text class="graph-node-label" x="16" y="24">${escapeHtml(displayGraphNodeLabel(node.label, node.summary))}</text>
      <foreignObject x="16" y="32" width="${Math.max(node.width - 32, 40)}" height="${Math.max(node.height - 42, 28)}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="graph-node-copy">${escapeHtml(node.summary)}</div>
      </foreignObject>
    </g>
  `;
}

function renderGraphEdge(edge: GraphSnapshotViewState["edges"][number]): string {
  const controlX = (edge.fromX + edge.toX) / 2;

  return `
    <g class="graph-edge focus-${edge.focus}">
      <path d="M ${edge.fromX} ${edge.fromY} C ${controlX} ${edge.fromY}, ${controlX} ${edge.toY}, ${edge.toX} ${edge.toY}"></path>
      <text class="graph-edge-label" x="${controlX}" y="${(edge.fromY + edge.toY) / 2 - 6}">${escapeHtml(displayGraphEdgeLabel(edge.label))}</text>
    </g>
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
              ${card.isLive ? "Working" : "Ready"}
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
          <span class="tag" data-field="event-count">${card.eventCount} updates</span>
        </div>

        <div class="terminal-taskline terminal-commandline">
          <span class="terminal-shell-prompt">focus</span>
          <p class="terminal-value mono" data-field="current-task">${escapeHtml(card.currentTask)}</p>
        </div>

        <div class="terminal-screen ${card.isLive ? "live" : ""}" data-field="terminal-screen">
          <div class="terminal-screen-header">
            <span class="terminal-screen-title">working notes</span>
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
            <span class="terminal-label">Current read</span>
            <p class="terminal-value mono" data-field="recent-action">${escapeHtml(card.recentAction)}</p>
          </div>
          <div class="terminal-summary-cell">
            <span class="terminal-label">Latest takeaway</span>
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

function renderInlineRunStatus(run: RunViewState): string {
  if (run.statusTone !== "running" && !run.streamWarning) {
    return "";
  }

  return `
    <div class="inline-status-block">
      <div class="inline-status">
        <span class="inline-status-dot ${run.statusTone}"></span>
        <span>${escapeHtml(run.stageLabel)}</span>
        <span class="inline-status-sep">·</span>
        <span>${run.completedAgentCount}/${run.totalAgentCount} specialists</span>
        ${run.streamWarning ? `<span class="inline-status-warning">Reconnecting</span>` : ""}
      </div>
      <p class="inline-status-copy">${escapeHtml(run.stageDetail)}</p>
    </div>
  `;
}

function renderAnswerLead(run: RunViewState): string {
  if (run.statusTone === "running") {
    return "";
  }

  return `
    <div class="answer-lead">
      <span class="answer-lead-tag">Delphi · ${escapeHtml(run.ticker)} · ${escapeHtml(run.horizon)} view</span>
    </div>
  `;
}

function renderWorkspaceTag(run: RunViewState): string {
  if (run.statusTone === "completed") {
    return "Answer ready";
  }

  if (run.statusTone === "degraded") {
    return "Partial picture";
  }

  if (run.statusTone === "failed") {
    return "Needs another pass";
  }

  if (run.statusTone === "running") {
    return `${run.completedAgentCount}/${run.totalAgentCount} specialists moving`;
  }

  return "Ready for a question";
}

function renderResponseSections(
  report: ReportViewState,
  run: RunViewState,
  researchMap: ResearchMapViewState,
): string {
  const visibleSections = report.sections.filter(
    (section) => section.content.trim().length > 0 || section.isSkeleton,
  );
  const finalJudgment = visibleSections.find((section) => section.key === "final_judgment");
  const rationaleSections = visibleSections.filter((section) =>
    section.key === "core_thesis" ||
    section.key === "supporting_evidence" ||
    section.key === "liquidity_context"
  );
  const watchSections = visibleSections.filter((section) =>
    section.key === "key_risks" ||
    section.key === "what_changes_the_view"
  );
  const parts: string[] = [];

  if (!finalJudgment && rationaleSections.length === 0 && watchSections.length === 0) {
    const developingView = renderDevelopingView(researchMap, run);

    if (developingView) {
      return developingView;
    }

    return `
      <section class="answer-pending">
        <p>${escapeHtml(run.stageDetail)}</p>
        ${run.statusTone === "running" ? renderTypingIndicator() : ""}
      </section>
    `;
  }

  if (finalJudgment) {
    parts.push(renderReportSection(finalJudgment));
  } else {
    const developingView = renderDevelopingView(researchMap, run);

    if (developingView) {
      parts.push(developingView);
    }
  }

  if (rationaleSections.length > 0) {
    parts.push(`
      <section class="answer-group">
        <h3 class="answer-group-title">Why Delphi leans this way</h3>
        <div class="answer-group-stack">
          ${rationaleSections.map(renderReportSection).join("")}
        </div>
      </section>
    `);
  }

  if (watchSections.length > 0) {
    parts.push(`
      <section class="answer-group">
        <h3 class="answer-group-title">What to watch</h3>
        <div class="answer-group-stack">
          ${watchSections.map(renderReportSection).join("")}
        </div>
      </section>
    `);
  }

  return parts.join("");
}

function renderDevelopingView(
  researchMap: ResearchMapViewState,
  run: RunViewState,
): string {
  const liveCards = researchMap.cards.filter((card) =>
    (card.cardId === "core_thesis" ||
      card.cardId === "liquidity_context" ||
      card.cardId === "market_signal") &&
    card.status !== "waiting"
  );

  if (liveCards.length === 0) {
    return "";
  }

  return `
    <section class="developing-view">
      <div class="developing-view-header">
        <span class="answer-section-kicker">Delphi is building the answer</span>
        <p>${escapeHtml(run.stageDetail)}</p>
      </div>
      <div class="developing-view-grid">
        ${liveCards
          .map(
            (card) => `
              <article class="developing-note tone-${card.tone}">
                <span class="developing-note-label">${escapeHtml(card.label)}</span>
                <p>${escapeHtml(card.summary)}</p>
              </article>
            `,
          )
          .join("")}
      </div>
      ${run.statusTone === "running" ? renderTypingIndicator() : ""}
    </section>
  `;
}

function displaySectionTitle(
  sectionKey: ReportViewState["sections"][number]["key"],
  fallback: string,
): string {
  switch (sectionKey) {
    case "core_thesis":
      return "Core thesis";
    case "supporting_evidence":
      return "Why";
    case "liquidity_context":
      return "Macro backdrop";
    case "key_risks":
      return "Key risks";
    case "what_changes_the_view":
      return "What would change the view";
    default:
      return fallback;
  }
}

function displayResearchMapStatus(
  status: ResearchMapViewState["cards"][number]["status"],
): string {
  switch (status) {
    case "partial":
      return "live";
    case "waiting":
      return "pending";
    default:
      return status;
  }
}

function displayGraphNodeLabel(label: string, summary: string): string {
  if (label !== "Research Finding") {
    return label;
  }

  const trimmed = summary.trim();

  if (!trimmed) {
    return label;
  }

  const sentenceEnd = trimmed.search(/[.!?](?:\s|$)/);
  const lead = sentenceEnd > 0 ? trimmed.slice(0, sentenceEnd + 1).trim() : trimmed;
  return lead.length > 34 ? `${lead.slice(0, 31).trim()}…` : lead;
}

function displayGraphEdgeLabel(label: string): string {
  switch (label) {
    case "cites":
      return "supports";
    case "tracks":
      return "connects";
    case "section":
      return "part of";
    default:
      return label;
  }
}

function displayEvidenceTrailRef(ref: string): string {
  if (ref.startsWith("finding:")) {
    return "Research finding";
  }

  if (ref.startsWith("thesis:")) {
    return "Core thesis";
  }

  if (ref.startsWith("risk:")) {
    return "Key risk";
  }

  if (ref.startsWith("marketsignal:")) {
    return "Market signal";
  }

  if (ref.startsWith("liquidityregime:")) {
    return "Liquidity regime";
  }

  if (ref.startsWith("liquidityfactor:")) {
    return "Liquidity factor";
  }

  if (ref.startsWith("macroactoraction:")) {
    return "Macro driver";
  }

  return truncateMiddle(ref, 28);
}

function renderTypingIndicator(): string {
  return `
    <div class="typing-indicator" aria-label="Delphi is writing">
      <span></span><span></span><span></span>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
