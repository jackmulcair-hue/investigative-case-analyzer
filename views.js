/* Clarity view rendering — all investigation views. */
/* Loaded before app.js; references state/esc which are defined there. */

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Investigations list ───
function investigationsView() {
  const list = ClarityStorage.listInvestigations();
  return `
    <div class="investigations-page">
      <div class="investigations-header">
        <div>
          <h1>${state.mode === 'kids' ? '🔍 Mystery Solver' : '◆ Clarity'}</h1>
          <p class="subtitle">${state.mode === 'kids' ? 'Fair play. Truth-first.' : 'Critical-thinking partner for mysteries, problems, and unanswered questions'}</p>
        </div>
        <div class="investigations-actions">
          <button class="btn primary" onclick="createNewInvestigation()">+ New</button>
          <button class="btn" onclick="importInvestigationData()">📥 Import</button>
        </div>
      </div>
      ${list.length === 0 ? `
        <div class="empty-state">
          <p>No investigations yet. Create your first one to begin analysing.</p>
          <button class="btn primary" onclick="createNewInvestigation()">+ New Investigation</button>
        </div>
      ` : `
        <div class="investigations-grid">
          ${list.map((inv) => `
            <div class="investigation-card ${inv.status}">
              <div class="investigation-card-top">
                <h3>${esc(inv.title)}</h3>
                <span class="status-badge ${inv.status}">${inv.status}</span>
              </div>
              <p class="investigation-type">${esc(inv.type)}</p>
              <p class="investigation-summary">${esc((inv.summary || 'No summary yet').slice(0, 120))}${(inv.summary || '').length > 120 ? '…' : ''}</p>
              <div class="investigation-meta">
                <span>👥 ${inv.counts.people}</span>
                <span>📄 ${inv.counts.evidence}</span>
                <span>⏱ ${inv.counts.events}</span>
                <span>💡 ${inv.counts.hypotheses}</span>
              </div>
              <div class="investigation-card-actions">
                <button class="btn primary small" onclick="openInvestigation('${inv.id}')">Open</button>
                <button class="btn small" onclick="exportInvestigationById('${inv.id}')">📤</button>
                <button class="btn danger small" onclick="deleteInvestigationById('${inv.id}')">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ─── Overview ───
function overviewView() {
  const inv = state.current;
  const a = state.analysis;
  const kid = state.mode === 'kids';
  return `
    ${heading(kid ? '🔍 Overview' : '◆ Overview', esc(inv.title), kid ? "Let's work it out" : 'Evidence-led summary')}
    <div class="summary-grid">
      <div class="card">
        <h3>Situation</h3>
        <p>${esc(inv.whatHappened || 'Describe what happened in the Case view.')}</p>
        ${inv.whatWasExpected ? `<p style="font-size:13px;color:var(--muted);margin-top:8px;"><strong>Expected:</strong> ${esc(inv.whatWasExpected)}</p>` : ''}
      </div>
      <div class="card">
        <h3>${kid ? '✓ Status' : '✓ Assessment'}</h3>
        <p>${a && a.mostLikely ? `Leading explanation: <strong>${esc(a.mostLikely.text.slice(0, 60))}</strong> (${a.mostLikely.confidence}%)` : 'Add hypotheses to get an assessment.'}</p>
        <span class="status-badge ${inv.status}">${inv.status}</span>
      </div>
    </div>
    ${a ? `
      <div class="grid three metric-row">
        <div class="metric-box"><div class="label">Evidence Quality</div><div class="value">${a.metrics.evidenceQuality}%</div></div>
        <div class="metric-box"><div class="label">Gaps</div><div class="value">${a.metrics.gaps}</div></div>
        <div class="metric-box"><div class="label">Hypotheses</div><div class="value">${a.metrics.hypotheses}</div></div>
      </div>
      ${a.biases.length > 0 ? `
        <div class="card bias-card">
          <h3>⚠ Bias & Risk Detection</h3>
          ${a.biases.map((b) => `<div class="bias-item ${b.severity}"><strong>${esc(b.type)}</strong> — ${esc(b.detail)}</div>`).join('')}
        </div>
      ` : ''}
      ${a.mostLikely ? `
        <div class="card">
          <h3>Most Likely Explanation</h3>
          <div class="confidence-bar"><div class="confidence-fill" style="width:${a.mostLikely.confidence}%"></div><span class="confidence-label">${a.mostLikely.confidence}%</span></div>
          <p>${esc(a.mostLikely.text)}</p>
          <p style="font-size:13px;color:var(--muted);">${a.mostLikely.confidence < 60 ? 'Tentative — evidence is not yet decisive.' : a.mostLikely.confidence < 80 ? 'Moderately supported but not conclusive.' : 'Well-supported, but confidence is not proof.'}</p>
        </div>
      ` : ''}
      ${a.contradictions.length > 0 ? `
        <div class="card">
          <h3>Contradictions Found</h3>
          <ul class="bullet-list">${a.contradictions.slice(0, 3).map((c) => `<li>${esc(c.text)}</li>`).join('')}</ul>
        </div>
      ` : ''}
      <div class="card">
        <h3>Next Best Actions</h3>
        <ul class="bullet-list">${a.actions.slice(0, 4).map((act) => `<li>${esc(act)}</li>`).join('')}</ul>
      </div>
    ` : ''}
  `;
}

// ─── Case (rich input) ───
function caseView() {
  const inv = state.current;
  const a = state.analysis;
  const hypConfidence = {};
  if (a && a.evaluated) a.evaluated.forEach((h) => { hypConfidence[h.id] = h.confidence; });

  return `
    ${heading('📋 Case File', esc(inv.title), 'Enter all relevant information. Keep facts, assumptions, and decisions separate.')}
    <div class="card">
      <form onsubmit="saveCaseDetails(event)">
        <div class="form-row">
          <label>Title<input name="title" value="${esc(inv.title)}" /></label>
          <label>Type
            <select name="type">
              ${['Missing item','Unexplained event','Conflicting accounts','Troubleshooting','Reconstructing events','Missing property','Unexplained situation','Other'].map((t) => `<option ${inv.type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label>Status
            <select name="status">
              <option value="active" ${inv.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="resolved" ${inv.status === 'resolved' ? 'selected' : ''}>Resolved</option>
              <option value="cold" ${inv.status === 'cold' ? 'selected' : ''}>Cold</option>
            </select>
          </label>
        </div>
        <label>What happened<textarea name="whatHappened" placeholder="Describe the situation in detail…">${esc(inv.whatHappened || '')}</textarea></label>
        <label>What was expected<textarea name="whatWasExpected" placeholder="What should have happened?">${esc(inv.whatWasExpected || '')}</textarea></label>
        <button type="submit" class="btn primary" style="margin-top:12px;">Save Details</button>
      </form>
    </div>
    ${entitySection('people', 'People', inv.people || [], (p) => `<strong>${esc(p.name)}</strong> <span class="entity-meta">${esc(p.role)}</span><p>${esc(p.note)}</p>`)}
    ${entitySection('locations', 'Locations', inv.locations || [], (l) => `<strong>${esc(l.name)}</strong><p>${esc(l.note)}</p>`)}
    ${entitySection('objects', 'Objects / Items', inv.objects || [], (o) => `<strong>${esc(o.name)}</strong><p>${esc(o.note)}</p>`)}
    ${entitySection('events', 'Events', inv.events || [], (e) => `<strong>${esc(e.time)}</strong> — ${esc(e.description)} ${e.verified ? '<span class="chip success">verified</span>' : '<span class="chip">unverified</span>'}<p>Source: ${esc(e.source || 'none')}</p>`)}
    ${entitySection('evidence', 'Evidence', inv.evidence || [], (e) => `<strong>${esc(e.title)}</strong> <span class="chip">${esc(e.kind)} · ${esc(e.strength)}</span><p>${esc(e.detail)}</p>`)}
    ${entitySection('statements', 'Statements', inv.statements || [], (s) => `<strong>${esc(s.person)}</strong><p>${esc(s.text)}</p>`)}
    ${entitySection('hypotheses', 'Hypotheses', inv.hypotheses || [], (h) => {
      const conf = hypConfidence[h.id] != null ? hypConfidence[h.id] : h.confidence;
      return `<strong>${esc(h.text)}</strong><div class="confidence-bar small"><div class="confidence-fill" style="width:${conf || 0}%"></div><span class="confidence-label">${conf || 0}%</span></div>${h.notes ? `<p>${esc(h.notes)}</p>` : ''}`;
    })}
    ${entitySection('knownFacts', 'Known Facts', inv.knownFacts || [], (f) => `<strong>${esc(f.text)}</strong><p>Source: ${esc(f.source || 'none')}</p>`)}
    ${entitySection('unknowns', 'Unknowns', inv.unknowns || [], (u) => `<strong>${esc(u.text)}</strong> <span class="chip ${u.priority || 'medium'}">${u.priority || 'medium'}</span>`)}
    ${entitySection('ruledOut', 'Ruled Out', inv.ruledOut || [], (r) => `<strong>${esc(r.text)}</strong><p>Reason: ${esc(r.reason || 'not specified')}</p>`)}
    ${entitySection('checkedActions', 'Already Checked', inv.checkedActions || [], (c) => `<strong>${esc(c.text)}</strong><p>Result: ${esc(c.result || 'no result')}</p>`)}
  `;
}

// ─── Timeline ───
function timelineView() {
  const events = [...(state.current.events || [])].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  return `
    ${heading('⏱ Evidence Timeline', 'Chronology', 'Recorded times, estimates, and sources. Verify each event.')}
    <div class="card">
      ${events.length === 0 ? '<p class="empty-hint">No events yet. Add events in the Case view.</p>' : `
        <div class="timeline">
          ${events.map((e) => `
            <div class="timeline-item">
              <div class="timeline-dot ${e.verified ? 'verified' : 'unverified'}"></div>
              <div class="timeline-content">
                <strong>${esc(e.time)}</strong>
                <p>${esc(e.description)}</p>
                <span class="chip">${esc(e.source || 'no source')} ${e.verified ? '· ✓' : '· ?'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ─── Evidence ───
function evidenceView() {
  const evidence = state.current.evidence || [];
  const hypotheses = state.current.hypotheses || [];
  return `
    ${heading('📸 Evidence', 'The Record', 'What was seen, found, or recorded — and how it connects to explanations.')}
    <div class="card">
      ${evidence.length === 0 ? '<p class="empty-hint">No evidence yet. Add evidence in the Case view.</p>' : `
        <div class="list">
          ${evidence.map((e) => {
            const supporting = hypotheses.filter((h) => (h.supports || []).includes(e.id));
            const contradicting = hypotheses.filter((h) => (h.contradicts || []).includes(e.id));
            return `
            <div class="list-item evidence-item">
              <div>
                <strong>${esc(e.title)}</strong>
                <p>${esc(e.kind)} · Strength: ${esc(e.strength)}</p>
                <p>${esc(e.detail)}</p>
                ${supporting.length ? `<p class="link-info">Supports: ${supporting.map((h) => esc(h.text.slice(0, 40))).join(', ')}</p>` : ''}
                ${contradicting.length ? `<p class="link-info warn">Contradicts: ${contradicting.map((h) => esc(h.text.slice(0, 40))).join(', ')}</p>` : ''}
              </div>
              <div class="entity-item-actions">
                <button class="btn small" onclick="editEntity('evidence','${e.id}')">✎</button>
                <button class="btn danger small" onclick="removeEntity('evidence','${e.id}')">✕</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      `}
      <button class="btn primary" style="width:100%;margin-top:12px;" onclick="addEntity('evidence')">+ Add Evidence</button>
    </div>
  `;
}

// ─── Workspace (visual graph) ───
function workspaceView() {
  return `
    ${heading('🔗 Workspace', 'Relationship Graph', 'How people, places, events, evidence, and explanations connect.')}
    <div class="card workspace-card">
      <div id="workspace-container"></div>
    </div>
  `;
}

// ─── Analysis (12 categories) ───
function analysisView() {
  const a = state.analysis;
  if (!a) return heading('🧩 Analysis', 'No data', 'Add information to generate analysis.') + '<div class="card"><p>Add evidence and hypotheses in the Case view to generate an analysis.</p></div>';
  return `
    ${heading('🧩 Critical Analysis', 'Full Breakdown', 'Sceptical, analytical, evidence-driven. Confidence is not proof.')}
    <div class="analysis-disclaimer">ⓘ ${esc(a.disclaimer)}</div>
    ${a.biases.length > 0 ? `
      <div class="card bias-card">
        <h3>⚠ Bias & Risk Detection</h3>
        ${a.biases.map((b) => `<div class="bias-item ${b.severity}"><strong>${esc(b.type)}</strong> — ${esc(b.detail)}</div>`).join('')}
      </div>
    ` : ''}
    <div class="analysis-grid">
      ${a.sections.map((s) => `
        <div class="card analysis-card">
          <h3>${esc(s.heading)}</h3>
          <ul class="bullet-list">
            ${s.items.map((item) => `<li>${esc(item)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
    ${a.connections.length > 0 ? `
      <div class="card">
        <h3>🔗 Connections Between Facts</h3>
        <ul class="bullet-list">${a.connections.map((c) => `<li>${esc(c.text)}</li>`).join('')}</ul>
      </div>
    ` : ''}
  `;
}

// ─── Questions (intelligent) ───
function questionsView() {
  const a = state.analysis;
  const questions = a ? a.questions : [];
  const topQuestion = questions[0];
  return `
    ${heading('❓ Intelligent Questions', 'Most Useful Unknowns', 'The system identifies questions that could materially change the result.')}
    ${topQuestion ? `
      <div class="card priority-question">
        <h3>🎯 Most Useful Question</h3>
        <p class="big-question">${esc(topQuestion.text)}</p>
        <p class="question-reason">${esc(topQuestion.reason)}</p>
      </div>
    ` : '<div class="card"><p>Add more information to generate intelligent questions.</p></div>'}
    ${questions.length > 1 ? `
      <div class="card">
        <h3>All Questions</h3>
        <div class="list">
          ${questions.slice(1).map((q, i) => `
            <div class="list-item">
              <div>
                <p>${esc(q.text)}</p>
                <span class="chip ${q.priority}">${q.priority}</span>
                <span style="font-size:12px;color:var(--muted);margin-left:8px;">${esc(q.reason)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div class="card">
      <h3>Add Your Own Question</h3>
      <button class="btn primary" onclick="addCustomQuestion()">+ Add Question</button>
    </div>
  `;
}

// ─── History ───
function historyView() {
  const history = (state.current.history || []).slice().reverse();
  return `
    ${heading('📜 History', 'Investigation Log', 'How the reasoning developed over time.')}
    <div class="card">
      ${history.length === 0 ? '<p class="empty-hint">No history yet.</p>' : `
        <div class="timeline">
          ${history.map((h) => `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <strong>${esc(h.action)}</strong>
                <p>${esc(h.detail)}</p>
                <span class="chip">${formatTime(h.timestamp)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ─── Report ───
function reportView() {
  const inv = state.current;
  const a = state.analysis;
  return `
    ${heading('📄 Report', 'Exportable Summary', 'Neutral, printable summary of the investigation.')}
    <div class="card">
      <h3>${esc(inv.title)}</h3>
      <p><strong>Type:</strong> ${esc(inv.type)} · <strong>Status:</strong> ${esc(inv.status)}</p>
      ${inv.whatHappened ? `<p><strong>Situation:</strong> ${esc(inv.whatHappened)}</p>` : ''}
      ${inv.whatWasExpected ? `<p><strong>Expected:</strong> ${esc(inv.whatWasExpected)}</p>` : ''}
    </div>
    ${a ? `
      ${a.mostLikely ? `
        <div class="card">
          <h3>Most Likely Explanation</h3>
          <p><strong>${esc(a.mostLikely.text)}</strong> — ${a.mostLikely.confidence}% confidence</p>
        </div>
      ` : ''}
      <div class="card">
        <h3>Confirmed Facts</h3>
        <ul class="bullet-list">${a.classified.confirmedFacts.slice(0, 8).map((f) => `<li>${esc(f.text)}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <h3>Contradictions</h3>
        <ul class="bullet-list">${a.contradictions.length ? a.contradictions.map((c) => `<li>${esc(c.text)}</li>`).join('') : '<li>None detected</li>'}</ul>
      </div>
      <div class="card">
        <h3>Next Best Actions</h3>
        <ul class="bullet-list">${a.actions.map((act) => `<li>${esc(act)}</li>`).join('')}</ul>
      </div>
    ` : ''}
    <div class="quick-actions">
      <button class="btn primary" onclick="window.print()">🖨️ Print / PDF</button>
      <button class="btn" onclick="shareCase()">📤 Share</button>
      <button class="btn" onclick="exportCurrentInvestigation()">💾 Export JSON</button>
    </div>
  `;
}

// ─── Helper: heading ───
function heading(kicker, title, sub) {
  return `
    <div class="heading">
      <span class="kicker">${esc(kicker)}</span>
      <h1>${esc(title)}</h1>
      <p class="subtitle">${esc(sub)}</p>
    </div>
  `;
}

// ─── Helper: entity section ───
function entitySection(key, label, items, renderItem) {
  return `
    <div class="entity-section">
      <div class="entity-header" onclick="toggleSection('${key}')">
        <h3>${label} <span class="count">(${items.length})</span></h3>
        <span class="toggle-icon" id="icon-${key}">▼</span>
      </div>
      <div class="entity-body" id="body-${key}">
        ${items.length === 0 ? '<p class="empty-hint">No items yet.</p>' : items.map((item) => `
          <div class="entity-item">
            <div class="entity-item-content">${renderItem(item)}</div>
            <div class="entity-item-actions">
              <button class="btn small" onclick="editEntity('${key}','${item.id}')">✎</button>
              <button class="btn danger small" onclick="removeEntity('${key}','${item.id}')">✕</button>
            </div>
          </div>
        `).join('')}
        <button class="btn primary small" onclick="addEntity('${key}')">+ Add</button>
      </div>
    </div>
  `;
}
