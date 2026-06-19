/* Delphi — Living Thesis MVP prototype.
   Vanilla JS, no build step. This is a DESIGN ARTEFACT, not production code.
   The point is to communicate flow, hierarchy, copy and states — see
   codex-handoff.md for what to keep vs. discard. */

(function () {
  const F = window.DELPHI_FIXTURES;
  // Working copies so corrections/triage persist within a session.
  const DB = {
    assets: F.assets,
    theses: JSON.parse(JSON.stringify(F.theses)),
    evidence: JSON.parse(JSON.stringify(F.evidence)),
    whatChanged: F.whatChanged,
    traces: JSON.parse(JSON.stringify(F.decisionTraces)),
  };

  const state = {
    view: 'dashboard',     // dashboard | inbox | thesis | changed
    thesisId: 'th_nvda',
    inboxFilter: 'new',
    // Per-view simulated data condition, so reviewers can see every state.
    // Values: normal | loading | empty | error
    sim: { dashboard: 'normal', inbox: 'normal', changed: 'normal' },
  };

  // ---- helpers ----------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const asset = (id) => DB.assets.find((a) => a.id === id);
  const thesis = (id) => DB.theses.find((t) => t.id === id);
  const evidence = (id) => DB.evidence.find((e) => e.id === id);

  function timeAgo(ts) {
    const d = (F.meta.now - ts) / 86400000;
    if (d < 0) { const f = Math.round(-d); return `in ${f}d`; }
    if (d < 1) return `${Math.round(d * 24)}h ago`;
    if (d < 30) return `${Math.round(d)}d ago`;
    return `${Math.round(d / 30)}mo ago`;
  }
  function freshness(ts) {
    const days = (F.meta.now - ts) / 86400000;
    const stale = days > 21;
    return { days: Math.round(days), stale,
      html: `<span class="freshness ${stale ? 'stale' : ''}">${stale ? '⚠ ' : ''}reviewed ${timeAgo(ts)}</span>` };
  }
  const impactLabel = { supports: 'Supports', contradicts: 'Counter-evidence', neutral: 'Neutral', unclear: 'Unclear' };
  const statusLabel = { holding: 'Holding', weakening: 'Weakening', broken: 'Broken', uncertain: 'Uncertain' };

  function citationOrFlag(ev) {
    if (ev.uncertain || !ev.citation) return `<span class="uncertain-flag">uncertain — no firm source</span>`;
    return `<a class="cite" href="${ev.citation.url}" onclick="return false">${esc(ev.citation.label)}</a>`;
  }

  // ---- app root ---------------------------------------------------------
  const root = document.getElementById('app');

  function navItems() {
    const newCount = DB.evidence.filter((e) => e.status === 'new').length;
    const items = [
      ['dashboard', 'Thesis Dashboard', ''],
      ['inbox', 'Evidence Inbox', newCount],
      ['thesis', 'Asset / Thesis', ''],
      ['changed', 'What Changed', ''],
    ];
    return items.map(([id, label, count]) => `
      <button class="nav-item ${state.view === id ? 'active' : ''}" data-nav="${id}">
        <span>${label}</span>
        ${count ? `<span class="count">${count}</span>` : ''}
      </button>`).join('');
  }

  function render() {
    root.innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="brand"><b>Delphi</b><small>living theses</small></div>
          ${navItems()}
          <div class="sidebar-foot">
            ${esc(F.meta.user.name)}<br>${esc(F.meta.user.role)}
            <div style="margin-top:10px">
              <label style="font-size:10px;text-transform:uppercase;letter-spacing:.06em">Demo state</label>
              <select id="simSel" style="width:100%;margin-top:4px;font-size:11px;padding:3px">
                <option value="normal">normal</option>
                <option value="loading">loading</option>
                <option value="empty">empty</option>
                <option value="error">error</option>
              </select>
            </div>
          </div>
        </aside>
        <main class="main" id="view"></main>
      </div>`;

    root.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => { state.view = b.dataset.nav; render(); });
    const simSel = $('#simSel');
    if (simSel && state.sim[state.view] !== undefined) {
      simSel.value = state.sim[state.view];
      simSel.onchange = () => { state.sim[state.view] = simSel.value; render(); };
    } else if (simSel) { simSel.disabled = true; }

    const view = $('#view');
    if (state.view === 'dashboard') renderDashboard(view);
    else if (state.view === 'inbox') renderInbox(view);
    else if (state.view === 'thesis') renderThesis(view);
    else if (state.view === 'changed') renderChanged(view);
  }

  // ===== 1. THESIS DASHBOARD ============================================
  function renderDashboard(view) {
    const sim = state.sim.dashboard;
    view.appendChild(el(`<div class="page-head">
      <h1>Thesis Dashboard</h1>
      <p>The state of your beliefs. ${DB.theses.length} active theses · ${DB.evidence.filter(e=>e.status==='new').length} new evidence items to triage.</p>
    </div>`));

    if (sim === 'loading') return view.appendChild(skeletonCards());
    if (sim === 'error') return view.appendChild(stateBlock('error', '⚠', "Couldn't load your theses",
      "We reached the workspace but the request failed. Your data is safe — nothing was changed.",
      '<button class="btn" onclick="location.reload()">Retry</button>'));
    if (sim === 'empty') return view.appendChild(stateBlock('', '◷', 'No theses yet',
      'A thesis is a belief you want to keep alive — its assumptions, evidence and decisions in one place. Start with an asset on your watchlist.',
      '<button class="btn primary">+ New thesis</button>'));

    // Counter-evidence attention strip — counter-evidence is first-class.
    const contra = DB.evidence.filter((e) => e.status === 'new' && e.classification.impact === 'contradicts');
    if (contra.length) {
      const strip = el(`<div class="banner partial"><span>⚑</span>
        <span><b>${contra.length} new counter-evidence item${contra.length>1?'s':''}</b> challenge an active assumption. They are never folded into summaries silently.</span>
        <button class="btn sm" style="margin-left:auto" data-go-inbox-contra>Review</button></div>`);
      strip.querySelector('[data-go-inbox-contra]').onclick = () => { state.view = 'inbox'; state.inboxFilter = 'contradicts'; render(); };
      view.appendChild(strip);
    }

    const grid = el('<div class="thesis-grid"></div>');
    DB.theses.forEach((t) => grid.appendChild(thesisCard(t)));

    // Watchlist asset with no thesis (partial-data affordance)
    const noThesis = DB.assets.filter((a) => !DB.theses.some((t) => t.assetId === a.id));
    noThesis.forEach((a) => grid.appendChild(el(`<div class="card thesis-card" style="border-style:dashed;opacity:.85">
      <div class="asset-tag">${esc(a.name)} · ${esc(a.ticker)}</div>
      <h3 style="color:var(--ink-3)">No thesis yet</h3>
      <p class="muted" style="font-size:12.5px">On your watchlist. Capture why you're watching it before evidence piles up.</p>
      <button class="btn sm" style="margin-top:8px">+ Start thesis</button>
    </div>`)));

    view.appendChild(grid);
  }

  function thesisCard(t) {
    const a = asset(t.assetId);
    const fr = freshness(t.lastReviewed);
    const broken = t.assumptions.filter((x) => x.status === 'broken').length;
    const weak = t.assumptions.filter((x) => x.status === 'weakening').length;
    const card = el(`<div class="card thesis-card" data-thesis="${t.id}">
      <div class="spread">
        <span class="asset-tag">${esc(a.name)} · ${esc(a.ticker)}</span>
        <span class="chip ${t.convictionBand}">conviction ${t.conviction}</span>
      </div>
      <h3>${esc(t.title)}</h3>
      <div class="meter ${t.convictionBand}" style="margin:4px 0 12px"><span style="width:${t.conviction}%"></span></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px">
        ${broken ? `<span class="chip broken">${broken} broken assumption${broken>1?'s':''}</span>` : ''}
        ${weak ? `<span class="chip weakening">${weak} weakening</span>` : ''}
        ${t.unresolved ? `<span class="chip neutral">${t.unresolved} open question${t.unresolved>1?'s':''}</span>` : ''}
      </div>
      <div class="spread">
        ${fr.html}
        ${t.pendingChanges ? `<span class="chip" style="background:var(--accent-bg);color:var(--accent)">${t.pendingChanges} changes since</span>` : '<span class="muted" style="font-size:12px">up to date</span>'}
      </div>
      ${fr.stale ? `<div class="banner stale" style="margin:12px 0 0;padding:7px 10px"><span>⚠</span><span>Stale — review overdue. Treat conclusions with caution.</span></div>` : ''}
    </div>`);
    card.onclick = () => { state.view = 'thesis'; state.thesisId = t.id; render(); };
    return card;
  }

  // ===== 2. EVIDENCE INBOX =============================================
  function renderInbox(view) {
    const sim = state.sim.inbox;
    view.appendChild(el(`<div class="page-head">
      <h1>Evidence Inbox</h1>
      <p>New information, classified and waiting for your confirmation. <b>You</b> decide what attaches to a thesis — the AI only proposes.</p>
    </div>`));

    if (sim === 'loading') return view.appendChild(skeletonCards());
    if (sim === 'error') return view.appendChild(stateBlock('error', '⚠', "Couldn't fetch new evidence",
      'The ingestion source is unreachable. Already-triaged evidence is unaffected.',
      '<button class="btn" onclick="location.reload()">Retry</button>'));

    const filters = [['new', 'New'], ['contradicts', 'Counter-evidence'], ['uncertain', 'Needs a human'], ['accepted', 'Accepted'], ['all', 'All']];
    const bar = el('<div class="inbox-controls"></div>');
    filters.forEach(([id, label]) => {
      const b = el(`<button class="filter-btn ${state.inboxFilter === id ? 'active' : ''}">${label}</button>`);
      b.onclick = () => { state.inboxFilter = id; render(); };
      bar.appendChild(b);
    });
    view.appendChild(bar);

    let items = DB.evidence.slice();
    if (state.inboxFilter === 'new') items = items.filter((e) => e.status === 'new');
    else if (state.inboxFilter === 'contradicts') items = items.filter((e) => e.classification.impact === 'contradicts');
    else if (state.inboxFilter === 'uncertain') items = items.filter((e) => e.uncertain || e.classification.confidence === 'low');
    else if (state.inboxFilter === 'accepted') items = items.filter((e) => e.status === 'accepted');

    if (sim === 'empty' || items.length === 0) {
      return view.appendChild(stateBlock('', '✓', 'Inbox zero',
        state.inboxFilter === 'new' ? "No new evidence to triage. We'll surface items here as they arrive — counter-evidence is never hidden."
          : 'Nothing matches this filter.', ''));
    }

    items.forEach((e) => view.appendChild(evidenceCard(e)));
  }

  function evidenceCard(e) {
    const c = e.classification;
    const a = c.assetId ? asset(c.assetId) : null;
    const th = c.thesisId ? thesis(c.thesisId) : null;
    const assum = th && c.assumptionId ? th.assumptions.find((x) => x.id === c.assumptionId) : null;
    const card = el(`<div class="card evidence-item ${c.impact}">
      <div class="spread">
        <h4>${esc(e.headline)}</h4>
        <span class="qual">source <b class="${e.source.quality}">${e.source.quality}</b> · ${timeAgo(e.receivedAt)}</span>
      </div>
      <div class="excerpt">${esc(e.excerpt)}</div>

      <div class="classline">
        <span class="chip ${c.impact}"><span class="dot ${c.impact}"></span>${impactLabel[c.impact]}</span>
        <span class="chip ${c.source}">${c.source === 'ai' ? 'AI classified' : 'You confirmed'}</span>
        ${a ? `<span class="chip neutral">${esc(a.name)}</span>` : `<span class="chip uncertain">no asset matched</span>`}
        ${th ? `<span class="chip neutral">${esc(truncate(th.title, 38))}</span>` : ''}
        ${assum ? `<span class="chip neutral">assumption: ${esc(truncate(assum.text, 34))}</span>` : ''}
        <span class="chip ${c.confidence}">confidence ${c.confidence}</span>
        ${citationOrFlag(e)}
      </div>

      <div class="callout"><b>Why this classification:</b> ${esc(c.rationale)}</div>

      <div class="evidence-actions">
        ${e.status === 'new' ? `<button class="btn primary sm" data-accept>Accept &amp; attach</button>` : `<span class="chip user">attached</span>`}
        <button class="btn sm" data-correct>Correct classification</button>
        ${e.status === 'new' ? `<button class="btn subtle sm" data-dismiss>Dismiss as noise</button>` : ''}
      </div>
    </div>`);
    card.querySelector('[data-correct]').onclick = () => openCorrection(e.id);
    const acc = card.querySelector('[data-accept]'); if (acc) acc.onclick = () => { e.status = 'accepted'; toast('Evidence attached to your thesis'); render(); };
    const dis = card.querySelector('[data-dismiss]'); if (dis) dis.onclick = () => { e.status = 'dismissed'; toast('Dismissed — kept in history, not attached'); render(); };
    return card;
  }

  // ===== 3. ASSET / THESIS PAGE =======================================
  function renderThesis(view) {
    const t = thesis(state.thesisId);
    if (!t) return view.appendChild(stateBlock('', '◷', 'Pick a thesis', 'Choose one from the dashboard.', ''));
    const a = asset(t.assetId);
    const fr = freshness(t.lastReviewed);

    view.appendChild(el(`<div class="page-head">
      <div class="row" style="gap:8px"><span class="asset-tag">${esc(a.name)} · ${esc(a.ticker)}</span>
        <span class="chip ${t.convictionBand}">conviction ${t.conviction} · ${t.convictionBand}</span></div>
      <h1 style="margin-top:6px">${esc(t.title)}</h1>
      <div class="row" style="gap:14px;flex-wrap:wrap">
        ${fr.html}<span class="muted">·</span><span class="muted">horizon ${esc(t.timeHorizon)}</span>
        <button class="btn sm" data-go-changed style="margin-left:auto">What changed?</button>
        <button class="btn primary sm" data-decide>Record decision</button>
      </div>
    </div>`));
    view.querySelector('[data-decide]').onclick = () => openDecision(t.id);
    view.querySelector('[data-go-changed]').onclick = () => { state.view = 'changed'; render(); };

    if (fr.stale) view.appendChild(el(`<div class="banner stale"><span>⚠</span><span><b>This thesis is stale</b> — last reviewed ${fr.days} days ago. Evidence may have moved; re-confirm before relying on it.</span></div>`));

    view.appendChild(el(`<p style="font-size:14.5px;max-width:70ch">${esc(t.summary)}</p>`));

    // Bull / bear
    view.appendChild(el(`<div class="bullbear" style="margin-top:8px">
      <div class="card bull"><h4 style="color:var(--supports)">Bull case</h4>${esc(t.bull)}</div>
      <div class="card bear"><h4 style="color:var(--contradicts)">Bear case</h4>${esc(t.bear)}</div>
    </div>`));

    view.appendChild(el('<div class="section-label">Key assumptions — what must stay true</div>'));
    const ac = el('<div class="card"></div>');
    t.assumptions.forEach((x) => {
      const row = el(`<div class="assumption">
        <span class="chip ${x.status}" style="align-self:flex-start;margin-top:2px">${statusLabel[x.status]}</span>
        <div class="body">
          <div>${esc(x.text)} ${x.critical ? '<span class="crit">· CRITICAL</span>' : ''}</div>
          ${x.note ? `<div class="note">${esc(x.note)}</div>` : ''}
        </div>
        <button class="btn subtle sm" data-rev>Revise</button>
      </div>`);
      row.querySelector('[data-rev]').onclick = () => toast('Prototype: opens assumption editor + records to decision trace');
      ac.appendChild(row);
    });
    view.appendChild(ac);

    // Evidence map — supporting and contradicting, side by side, contra never hidden
    view.appendChild(el('<div class="section-label">Evidence map</div>'));
    // Only accepted evidence appears here — see interaction-contract.md (accept → map).
    const linked = DB.evidence.filter((e) => e.classification.thesisId === t.id && e.status === 'accepted');
    const pending = DB.evidence.filter((e) => e.classification.thesisId === t.id && e.status === 'new').length;
    const emCard = el('<div class="card"></div>');
    if (pending) emCard.appendChild(el(`<div class="banner partial" style="margin:0 0 12px"><span>⚑</span><span>${pending} classified item${pending>1?'s':''} waiting in the inbox — accept to attach ${pending>1?'them':'it'} here.</span></div>`));
    if (linked.length === 0) {
      emCard.appendChild(el(`<div class="state" style="padding:24px"><div class="glyph">◌</div><div>No evidence attached yet. Items you accept in the inbox land here.</div></div>`));
    } else {
      const supports = linked.filter((e) => e.classification.impact === 'supports');
      const contra = linked.filter((e) => e.classification.impact === 'contradicts');
      const other = linked.filter((e) => !['supports', 'contradicts'].includes(e.classification.impact));
      emCard.appendChild(el(`<div class="grid-2" style="gap:22px">
        <div><div class="row" style="gap:6px;margin-bottom:6px"><span class="dot supports"></span><b style="font-size:12.5px">Supporting (${supports.length})</b></div>${supports.map(evMapRow).join('') || '<span class="muted" style="font-size:12.5px">none</span>'}</div>
        <div><div class="row" style="gap:6px;margin-bottom:6px"><span class="dot contradicts"></span><b style="font-size:12.5px;color:var(--contradicts)">Counter-evidence (${contra.length})</b></div>${contra.map(evMapRow).join('') || '<span class="muted" style="font-size:12.5px">none</span>'}</div>
      </div>`));
      if (other.length) emCard.appendChild(el(`<div class="hr"></div><div class="muted" style="font-size:12px">${other.length} neutral/unclear item(s) also linked.</div>`));
    }
    view.appendChild(emCard);

    // Risks & catalysts
    view.appendChild(el(`<div class="grid-2" style="margin-top:18px">
      <div><div class="section-label" style="margin-top:0">Risks</div><div class="card">${t.risks.map(r=>`<div class="evmap-item"><span class="chip ${r.severity==='high'?'low':'medium'}">${r.severity}</span><div>${esc(r.text)}</div></div>`).join('')}</div></div>
      <div><div class="section-label" style="margin-top:0">Catalysts</div><div class="card">${t.catalysts.map(c=>`<div class="evmap-item"><span class="chip neutral">${timeAgo(c.date)}</span><div>${esc(c.text)}</div></div>`).join('')}</div></div>
    </div>`));

    // Decision trace
    view.appendChild(el('<div class="section-label">Decision trace — auditable ledger</div>'));
    const traces = DB.traces[t.id] || [];
    const tc = el('<div class="card timeline"></div>');
    if (traces.length === 0) {
      tc.appendChild(el(`<div class="state" style="padding:20px"><div class="glyph">◷</div><div>No decisions recorded. When you act on this thesis, capture why — your future self and your LPs will need it.</div></div>`));
    } else {
      traces.forEach((d) => tc.appendChild(traceEntry(d)));
    }
    view.appendChild(tc);
  }

  function evMapRow(e) {
    return `<div class="evmap-item">
      <span class="dot ${e.classification.impact}" style="margin-top:6px"></span>
      <div><div style="font-size:13px">${esc(e.headline)}</div>
      <div class="meta">${timeAgo(e.receivedAt)} · ${esc(e.source.name)} · ${e.uncertain || !e.citation ? '<span style="color:var(--uncertain)">uncertain</span>' : esc(e.citation.label)}</div></div>
    </div>`;
  }

  function traceEntry(d) {
    const conv = d.priorConviction == null ? `set to ${d.newConviction}` : `${d.priorConviction} → ${d.newConviction}`;
    return el(`<div class="trace">
      <div class="spread"><h4>${esc(d.decision)}</h4><span class="tag-actor">${timeAgo(d.at)} · ${esc(d.actor)}</span></div>
      <div class="conv-delta">conviction ${conv}${d.changedAssumptions.length ? ` · ${d.changedAssumptions.length} assumption(s) changed` : ''}</div>
      <div class="rationale">${esc(d.rationale)}</div>
      ${d.sources.length ? `<div class="row" style="gap:6px;margin-bottom:6px">${d.sources.map(s=>`<span class="cite">${esc(s)}</span>`).join('')}</div>` : '<div class="muted" style="font-size:12px;margin-bottom:6px">No external source — judgment call.</div>'}
      ${d.followUp ? `<div class="followup">↳ Follow-up: ${esc(d.followUp)}</div>` : ''}
      ${d.unresolved && d.unresolved.length ? `<div class="followup" style="color:var(--uncertain)">? Open: ${d.unresolved.map(esc).join('; ')}</div>` : ''}
    </div>`);
  }

  // ===== 4. WHAT CHANGED ==============================================
  function renderChanged(view) {
    const sim = state.sim.changed;
    view.appendChild(el(`<div class="page-head">
      <h1>What Changed?</h1>
      <p>Material change since you last reviewed each thesis — mapped to assumptions, never just a news digest.</p>
    </div>`));

    if (sim === 'loading') return view.appendChild(skeletonCards());
    if (sim === 'error') return view.appendChild(stateBlock('error', '⚠', "Couldn't compute changes",
      'The change engine timed out. Try again — nothing in your theses was modified.',
      '<button class="btn" onclick="location.reload()">Retry</button>'));
    if (sim === 'empty') return view.appendChild(stateBlock('', '✓', 'Nothing material changed',
      "No tracked assumption moved since your last reviews. We'll flag it here the moment something does.", ''));

    DB.theses.forEach((t) => {
      const wc = DB.whatChanged[t.id];
      const a = asset(t.assetId);
      const card = el(`<div class="card changed-card" style="margin-bottom:16px">
        <div class="spread"><div><span class="asset-tag">${esc(a.name)} · ${esc(a.ticker)}</span>
          <h3 style="margin:2px 0 0">${esc(truncate(t.title,60))}</h3></div>
          <span class="freshness ${freshness(t.lastReviewed).stale?'stale':''}">since ${timeAgo(wc.since)}</span></div>
        <div class="hr"></div>
      </div>`);

      // Summary — each line grounded to its evidence
      const ul = el('<ul class="changed-summary" style="margin:0 0 6px;padding-left:18px"></ul>');
      wc.summary.forEach((s) => {
        const e = s.evidenceId ? evidence(s.evidenceId) : null;
        const tail = e
          ? ` <a class="cite" href="#" data-ev="${e.id}" onclick="return false">${esc(e.citation ? e.citation.label : e.source.name)}</a>`
          : ' <span class="uncertain-flag">no new evidence</span>';
        ul.appendChild(el(`<li>${esc(s.text)}${tail}</li>`));
      });
      card.appendChild(ul);

      // Assumption diff lines
      if (wc.events.filter(e=>e.kind==='assumption_status').length) {
        card.appendChild(el('<div class="section-label" style="margin:10px 0 4px">Assumption changes</div>'));
        wc.events.filter((e) => e.kind === 'assumption_status').forEach((ev) => {
          const assum = t.assumptions.find((x) => x.id === ev.assumptionId);
          card.appendChild(el(`<div class="diff-line">
            <span class="dot ${ev.to==='broken'||ev.to==='weakening'?'contradicts':'supports'}"></span>
            <div style="flex:1">${esc(assum ? assum.text : ev.assumptionId)}</div>
            <span class="chip ${ev.from}">${statusLabel[ev.from]}</span><span class="arrow">→</span><span class="chip ${ev.to}">${statusLabel[ev.to]}</span>
          </div>`));
        });
      }

      // Conviction suggestion — a prompt, never automatic
      const sug = wc.convictionSuggestion;
      const sugBox = el(`<div class="suggestion ${sug.direction==='down'?'down':''}">
        <span>${sug.direction==='down'?'▼':'◇'}</span>
        <div><b>Conviction prompt${sug.uncertain?' (uncertain)':''}:</b> ${esc(sug.text)}
        <div class="row" style="gap:8px;margin-top:8px">
          <button class="btn primary sm" data-decide="${t.id}">Record a decision</button>
          <button class="btn sm" data-open="${t.id}">Open thesis</button>
        </div></div>
      </div>`);
      sugBox.querySelector('[data-decide]').onclick = () => openDecision(t.id);
      sugBox.querySelector('[data-open]').onclick = () => { state.view='thesis'; state.thesisId=t.id; render(); };
      card.appendChild(sugBox);

      view.appendChild(card);
    });
  }

  // ---- correction modal -------------------------------------------------
  function openCorrection(evId) {
    const e = evidence(evId);
    const c = e.classification;
    const draft = { impact: c.impact, assetId: c.assetId, thesisId: c.thesisId, assumptionId: c.assumptionId, confidence: c.confidence };
    const impacts = ['supports', 'contradicts', 'neutral', 'unclear'];

    const m = el(`<div class="backdrop"><div class="modal">
      <h3>Correct classification</h3>
      <p class="muted" style="font-size:12.5px;margin:2px 0 0">You're overriding the AI. Your correction is recorded in the decision trace and used to improve future classifications.</p>

      <div class="field"><label>Impact on the thesis</label>
        <div class="seg" id="segImpact">${impacts.map(i=>`<button data-i="${i}" class="${draft.impact===i?'sel':''}">${impactLabel[i]}</button>`).join('')}</div></div>

      <div class="field"><label>Attach to thesis</label>
        <select id="selThesis">
          <option value="">— none / not relevant —</option>
          ${DB.theses.map(t=>`<option value="${t.id}" ${draft.thesisId===t.id?'selected':''}>${esc(truncate(t.title,52))}</option>`).join('')}
        </select></div>

      <div class="field"><label>Affected assumption</label>
        <select id="selAssum"></select></div>

      <div class="field"><label>Note (optional — your words, not the model's)</label>
        <textarea id="noteBox" placeholder="e.g. The AI over-weighted a low-quality source."></textarea></div>

      <div class="modal-foot">
        <button class="btn subtle" id="cancelBtn">Cancel</button>
        <button class="btn primary" id="saveBtn">Save correction</button>
      </div>
    </div></div>`);

    const segImpact = m.querySelector('#segImpact');
    segImpact.querySelectorAll('button').forEach((b) => b.onclick = () => {
      draft.impact = b.dataset.i; segImpact.querySelectorAll('button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
    });
    const selThesis = m.querySelector('#selThesis');
    const selAssum = m.querySelector('#selAssum');
    function fillAssum() {
      const t = thesis(selThesis.value);
      selAssum.innerHTML = `<option value="">— none —</option>` + (t ? t.assumptions.map(x=>`<option value="${x.id}" ${draft.assumptionId===x.id?'selected':''}>${esc(truncate(x.text,46))}</option>`).join('') : '');
      selAssum.disabled = !t;
    }
    selThesis.onchange = () => { draft.thesisId = selThesis.value; draft.assumptionId=''; fillAssum(); };
    fillAssum();

    m.querySelector('#cancelBtn').onclick = () => m.remove();
    m.querySelector('#saveBtn').onclick = () => {
      c.impact = draft.impact;
      c.thesisId = selThesis.value || null;
      c.assumptionId = selAssum.value || null;
      c.assetId = c.thesisId ? thesis(c.thesisId).assetId : c.assetId;
      c.source = 'user';
      c.rationale = (m.querySelector('#noteBox').value.trim()) || c.rationale + ' (Reclassified by you.)';
      m.remove();
      toast('Correction saved — recorded in the decision trace');
      render();
    };
    document.body.appendChild(m);
  }

  // ---- record decision modal -------------------------------------------
  function openDecision(thesisId) {
    const t = thesis(thesisId);
    const options = ['Hold position', 'Increase position', 'Reduce position', 'Close position', 'Downgrade conviction', 'Upgrade conviction', 'Move to watchlist', 'Initiate deeper research'];
    const m = el(`<div class="backdrop"><div class="modal">
      <h3>Record decision · ${esc(asset(t.assetId).ticker)}</h3>
      <p class="muted" style="font-size:12.5px;margin:2px 0 0">Delphi does not recommend an action. It records the one <b>you</b> make, with your rationale and sources.</p>

      <div class="field"><label>Decision</label>
        <select id="decType">${options.map(o=>`<option>${o}</option>`).join('')}</select></div>

      <div class="field"><label>New conviction (currently ${t.conviction})</label>
        <input id="convInput" type="range" min="0" max="100" value="${t.conviction}" style="width:100%">
        <div class="muted" id="convVal" style="font-size:12px">${t.conviction}</div></div>

      <div class="field"><label>Rationale — required, in your words</label>
        <textarea id="ratBox" placeholder="Why are you making this call now? What evidence drove it?"></textarea>
        <div class="callout">This is the heart of the decision trace. It is never auto-written by the model.</div></div>

      <div class="field"><label>Follow-up / open question (optional)</label>
        <textarea id="fuBox" style="min-height:44px"></textarea></div>

      <div class="modal-foot"><button class="btn subtle" id="cancelD">Cancel</button>
        <button class="btn primary" id="saveD">Record decision</button></div>
    </div></div>`);
    const conv = m.querySelector('#convInput');
    conv.oninput = () => m.querySelector('#convVal').textContent = conv.value;
    m.querySelector('#cancelD').onclick = () => m.remove();
    m.querySelector('#saveD').onclick = () => {
      const rat = m.querySelector('#ratBox').value.trim();
      if (!rat) { m.querySelector('#ratBox').style.borderColor = 'var(--contradicts)'; toast('Rationale is required — Delphi will not record a decision without one'); return; }
      const newConv = parseInt(conv.value, 10);
      DB.traces[t.id] = DB.traces[t.id] || [];
      DB.traces[t.id].unshift({
        id: 'd_' + Date.now(), at: F.meta.now, actor: F.meta.user.name,
        decision: m.querySelector('#decType').value,
        priorConviction: t.conviction, newConviction: newConv,
        evidenceIds: [], changedAssumptions: [],
        rationale: rat, sources: [],
        followUp: m.querySelector('#fuBox').value.trim(),
        unresolved: [],
      });
      t.conviction = newConv;
      t.convictionBand = newConv >= 67 ? 'high' : newConv >= 34 ? 'medium' : 'low';
      t.lastReviewed = F.meta.now; t.pendingChanges = 0;
      m.remove(); state.view = 'thesis'; state.thesisId = t.id; render();
      toast('Decision recorded in the trace');
    };
    document.body.appendChild(m);
  }

  // ---- shared state blocks ---------------------------------------------
  function stateBlock(cls, glyph, title, body, action) {
    return el(`<div class="state ${cls}"><div class="glyph">${glyph}</div><h3>${esc(title)}</h3><p style="max-width:46ch;margin:0 auto 14px">${esc(body)}</p>${action}</div>`);
  }
  function skeletonCards() {
    const wrap = el('<div class="thesis-grid"></div>');
    for (let i = 0; i < 3; i++) wrap.appendChild(el(`<div class="card"><div class="skeleton sk-line" style="width:40%"></div><div class="skeleton sk-line" style="width:85%;height:18px"></div><div class="skeleton sk-line" style="width:100%"></div><div class="skeleton sk-line" style="width:60%"></div></div>`));
    return wrap;
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function toast(msg) { const t = el(`<div class="toast">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 2400); }

  render();
})();
