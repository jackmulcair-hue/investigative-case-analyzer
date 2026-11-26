const DEFAULT_STATE = {
  mode: 'professional',
  view: 'overview',
  case: {
    title: 'The Missing Float',
    type: 'Missing property',
    location: 'Riverside Community Centre',
    date: 'Today, 14:20',
    summary: 'Cash from the reception float was discovered missing after the afternoon handover.'
  },
  people: [
    { name: 'Alex Morgan', role: 'Staff member', note: 'Had key access; says they left at 14:05.' },
    { name: 'Jordan Lee', role: 'Volunteer', note: 'Was in the reception area during the handover.' },
    { name: 'Samir Patel', role: 'Witness', note: 'Saw the drawer and desk area near 14:10; says it looked undisturbed.' }
  ],
  evidence: [
    { title: 'Handover sheet', kind: 'Document', strength: 'Strong', detail: 'Signed at 14:12; amount recorded as £500.' },
    { title: 'Front desk statement', kind: 'Statement', strength: 'Moderate', detail: 'Claims the float was checked and was still present at 14:10.' },
    { title: 'Entry log', kind: 'Record', strength: 'Moderate', detail: 'Shows activity near reception at 14:07 and 14:12.' }
  ],
  events: [
    ['13:55', 'Alex signs into reception', 'Entry log'],
    ['14:05', 'Alex says they leave early', 'Statement'],
    ['14:10', 'Cash drawer reportedly opened', 'Witness statement'],
    ['14:12', 'Handover sheet signed', 'Document']
  ],
  questions: [
    'Who can independently confirm Alex left at 14:05?',
    'Was the cash drawer visibly locked between 14:05 and 14:10?',
    'Can the entry log identify who accessed reception at 14:10?'
  ],
  answered: [],
  hypotheses: [
    ['Cash was misplaced during handover', 42],
    ['Unauthorised removal by someone with access', 35],
    ['Amount was recorded incorrectly', 23]
  ],
  milestones: { analysisReviewed: false, addedQuestion: false, reportReviewed: false, shared: false }
};

function loadState() {
  try {
    return JSON.parse(localStorage.getItem('clarity-state') || 'null');
  } catch (_) {
    return null;
  }
}

const state = Object.assign({}, DEFAULT_STATE, loadState() || {});
state.mode = localStorage.getItem('clarity-mode') || state.mode || 'professional';
state.view = 'overview';
state.people = Array.isArray(state.people) ? state.people : DEFAULT_STATE.people;
state.evidence = Array.isArray(state.evidence) ? state.evidence : DEFAULT_STATE.evidence;
state.events = Array.isArray(state.events) ? state.events : DEFAULT_STATE.events;
state.questions = Array.isArray(state.questions) ? state.questions : DEFAULT_STATE.questions;
state.answered = Array.isArray(state.answered) ? state.answered : [];
state.hypotheses = Array.isArray(state.hypotheses) ? state.hypotheses : DEFAULT_STATE.hypotheses;
state.milestones = Object.assign({ analysisReviewed: false, addedQuestion: false, reportReviewed: false, shared: false }, state.milestones || {});

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

function persist() {
  localStorage.setItem('clarity-mode', state.mode);
  try {
    localStorage.setItem('clarity-state', JSON.stringify(state));
  } catch (_) {
    /* Private browsing can block storage; the app still works in memory. */
  }
  document.documentElement.classList.toggle('kids-mode', state.mode === 'kids');
}

function analysisSummaryHtml(analysis) {
  const cards = analysis.sections.map((section) => `
    <div class="card">
      <h3>${esc(section.heading)}</h3>
      <ul class="bullet-list">
        ${section.items.map((item) => `<li>${esc(item)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  return `
    <div class="analysis-disclaimer">
      ⓘ ${esc(analysis.disclaimer)}
    </div>
    <div class="analysis-shell">
      <div class="notice">
        <strong>${esc(analysis.headline)}</strong><br/>
        <span style="font-size: 13px; color: var(--muted); display: block; margin-top: 6px;">${esc(analysis.summary)}</span>
      </div>
      <div class="grid three">
        <div class="metric-box"><div class="label">Evidence Quality</div><div class="value">${analysis.metrics.evidenceQuality}%</div></div>
        <div class="metric-box"><div class="label">Verification Gaps</div><div class="value">${analysis.metrics.gaps}</div></div>
        <div class="metric-box"><div class="label">Key Questions</div><div class="value">${analysis.metrics.questions}</div></div>
      </div>
      ${cards}
    </div>
  `;
}

function app() {
  persist();
  document.documentElement.classList.toggle('kids-mode', state.mode === 'kids');
  const kid = state.mode === 'kids';
  const mission = window.ClarityMissions ? window.ClarityMissions.evaluate(state) : null;
  const rankName = mission ? (kid ? mission.rank.kidName : mission.rank.name) : '';

  document.getElementById('app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">${kid ? '🔍' : '◆'}</span> Clarity</div>
        <div class="mode-toggle-wrap">
          <button class="mode-toggle" onclick="toggleMode()">
            ${kid ? '👨‍👩‍👧 Adult Mode' : '👧 Kids Mode'}
          </button>
        </div>
        <nav class="nav">
          ${nav('overview', 'Overview', '◉')}
          ${nav('missions', 'Missions', '🎯', mission ? `${mission.completed}/${mission.total}` : '')}
          ${nav('case', 'Case', '▣')}
          ${nav('timeline', 'Timeline', '⏱')}
          ${nav('evidence', 'Evidence', '◯')}
          ${nav('questions', 'Questions', '❓')}
          ${nav('analysis', 'Analysis', '◎')}
          ${nav('report', 'Report', '▤')}
        </nav>
        ${mission ? `
        <div class="sidebar-rank">
          <span class="sidebar-rank-label">${kid ? 'Your badge' : 'Detective rank'}</span>
          <strong>${esc(rankName)}</strong>
          <div class="progress-track small"><div class="progress-fill" style="width:${mission.percent}%"></div></div>
          <span class="sidebar-rank-xp">${mission.xp} XP · ${mission.completed}/${mission.total} missions</span>
        </div>` : ''}
      </aside>

      <main class="main">
        <div class="main-header">
          <div class="main-header-copy">
            <h1>${kid ? '🔍 Mystery Solver' : '◆ Clarity'}</h1>
            <p class="subtitle">${kid ? 'Fair play. Truth-first.' : 'Evidence-first case analysis.'}</p>
          </div>
          ${mission ? `
          <div class="rank-chip">
            <span class="rank-chip-icon">${kid ? '🔍' : '🕵️'}</span>
            <div>
              <strong>${esc(rankName)}</strong>
              <span>${mission.xp} XP · ${mission.completed}/${mission.total} missions</span>
            </div>
          </div>` : ''}
        </div>
        <div class="main-content">
          ${renderView()}
        </div>
      </main>
    </div>
  `;
}

function nav(id, label, icon, badge) {
  return `<button class="${state.view === id ? 'active' : ''}" onclick="go('${id}')">${icon} ${label}${badge ? ` <span class="nav-badge">${esc(badge)}</span>` : ''}</button>`;
}

function go(v) {
  state.view = v;
  if (v === 'analysis') state.milestones.analysisReviewed = true;
  if (v === 'report') state.milestones.reportReviewed = true;
  app();
}

function toggleMode() {
  state.mode = state.mode === 'kids' ? 'professional' : 'kids';
  persist();
  app();
}

function renderView() {
  if (state.view === 'missions') return missionsView();
  if (state.view === 'case') return caseView();
  if (state.view === 'timeline') return timelineView();
  if (state.view === 'evidence') return evidenceView();
  if (state.view === 'questions') return questionsView();
  if (state.view === 'analysis') return analysisView();
  if (state.view === 'report') return reportView();
  return overview();
}

function heading(kicker, title, sub) {
  return `
    <div class="heading">
      <span class="kicker">${esc(kicker)}</span>
      <h1>${esc(title)}</h1>
      <p class="subtitle">${esc(sub)}</p>
    </div>
  `;
}

function missionHero(kid) {
  const mission = window.ClarityMissions ? window.ClarityMissions.evaluate(state) : null;
  if (!mission) return '';
  const next = mission.nextMission;
  const rankName = kid ? mission.rank.kidName : mission.rank.name;
  const nextRankName = mission.nextRank ? (kid ? mission.nextRank.kidName : mission.nextRank.name) : '';

  return `
    <section class="mission-hero">
      <div class="mission-hero-main">
        <span class="mission-kicker">${kid ? '🎯 Your mission' : '🎯 Case mission'}</span>
        <h2>${next ? esc(kid ? next.kidTitle : next.title) : (kid ? 'All missions done!' : 'Case complete — report filed')}</h2>
        <p>${next ? esc(kid ? next.kidBrief : next.brief) : (kid ? 'You checked the facts and shared the story fairly.' : 'Every mission is complete. Review the report or keep gathering facts.')}</p>
        <div class="progress-track"><div class="progress-fill" style="width:${mission.percent}%"></div></div>
        <div class="mission-hero-meta">
          <span>${mission.completed} of ${mission.total} missions</span>
          <span>${mission.xp} XP</span>
        </div>
        <div class="mission-hero-actions">
          <button class="btn primary" onclick="go('${next ? next.view : 'report'}')">${next ? (kid ? 'Keep going' : 'Continue mission') : (kid ? 'See the story' : 'Open report')} →</button>
          <button class="btn ghost" onclick="go('missions')">${kid ? 'Mission board' : 'View case board'}</button>
        </div>
      </div>
      <div class="rank-card">
        <div class="rank-icon">${kid ? '🔍' : '🕵️'}</div>
        <div class="rank-name">${esc(rankName)}</div>
        <div class="rank-xp">${mission.xp} XP</div>
        <div class="rank-next">${mission.nextRank ? `${mission.nextRank.min - mission.xp} XP to ${esc(nextRankName)}` : (kid ? 'Top badge reached' : 'Top rank reached')}</div>
      </div>
    </section>
  `;
}

function missionsView() {
  const kid = state.mode === 'kids';
  const board = window.ClarityMissions ? window.ClarityMissions.evaluate(state) : null;
  if (!board) return heading('🎯 Missions', 'Mission board', 'The mission engine did not load.');

  return `
    ${heading(kid ? '🎯 Mission Board' : '🎯 Case Board', kid ? 'Your missions' : 'Mission Board', kid ? 'Finish one small job at a time.' : 'Work the case like a detective: collect, verify, compare, report.')}
    <div class="mission-overview">
      <div class="mission-overview-top">
        <div>
          <strong>${esc(state.case.title)}</strong>
          <span>${esc(state.case.location)} · ${esc(state.case.date)}</span>
        </div>
        <span class="chip">${board.completed}/${board.total} complete</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${board.percent}%"></div></div>
    </div>
    <div class="mission-grid">
      ${board.missions.map((mission, index) => missionCard(mission, index, kid)).join('')}
    </div>
    ${toolkitHtml(kid)}
  `;
}

function missionCard(mission, index, kid) {
  const title = kid ? mission.kidTitle : mission.title;
  const brief = kid ? mission.kidBrief : mission.brief;
  const stateLabel = mission.complete ? 'Complete' : mission.done > 0 ? 'In progress' : 'Not started';

  return `
    <article class="mission-card ${mission.complete ? 'is-complete' : ''}">
      <div class="mission-card-head">
        <div class="mission-icon">${mission.icon}</div>
        <div>
          <span class="mission-number">Mission ${index + 1}</span>
          <h3>${esc(title)}</h3>
        </div>
        <span class="mission-state ${mission.complete ? 'done' : ''}">${mission.complete ? '✓ ' + stateLabel : stateLabel}</span>
      </div>
      <p class="mission-brief">${esc(brief)}</p>
      <span class="mission-method">CSI method · ${esc(mission.method)}</span>
      <ul class="mission-steps">
        ${mission.steps.map((step) => `
          <li class="${step.done ? 'done' : ''}">
            <span class="step-check">${step.done ? '✓' : ''}</span>
            <span>${esc(step.label)}</span>
          </li>
        `).join('')}
      </ul>
      <div class="progress-track small"><div class="progress-fill" style="width:${mission.percent}%"></div></div>
      <button class="btn ${mission.complete ? 'ghost' : 'primary'}" onclick="go('${mission.view}')">${mission.complete ? (kid ? 'Look again' : 'Review') : (kid ? 'Let’s do this' : 'Work on this')} →</button>
    </article>
  `;
}

function toolkitHtml(kid) {
  const tools = kid ? [
    ['🧤', 'Look closely', 'Write down what you found before guessing.'],
    ['🔗', 'Check twice', 'See if a second person or record agrees.'],
    ['⏱', 'Put it in order', 'What happened first, next, and last?'],
    ['🧪', 'Try another idea', 'Ask if something else could explain it.'],
    ['⚖️', 'Facts, not blame', 'Share what you know and what is still unclear.']
  ] : [
    ['🧤', 'Chain of custody', 'Log where each item came from and who handled it.'],
    ['🔗', 'Corroboration', 'Match statements against a separate record or physical source.'],
    ['⏱', 'Sequence reconstruction', 'Place events on a timeline and test the order.'],
    ['🧪', 'Alternative testing', 'Ask what evidence would separate two explanations.'],
    ['⚖️', 'Verification over verdicts', 'Record facts and gaps—not guilt, probability, or predictions.']
  ];

  return `
    <section class="toolkit">
      <h2>${kid ? 'Detective kit' : 'Detective toolkit'}</h2>
      <p>${kid ? 'Small, kind steps that help you find the truth.' : 'Real investigative methods, used without jumping to conclusions.'}</p>
      <div class="toolkit-grid">
        ${tools.map(([icon, title, detail]) => `
          <div class="toolkit-card">
            <span class="toolkit-icon">${icon}</span>
            <strong>${esc(title)}</strong>
            <span>${esc(detail)}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function overview() {
  const kid = state.mode === 'kids';
  const analysis = window.ClarityIntelligence ? window.ClarityIntelligence.analyze(state, state.mode) : null;

  return `
    ${heading(kid ? '🔍 Fair Play Desk' : '◆ Case Overview', kid ? 'Let\'s work it out' : 'Good afternoon', kid ? 'Everyone gets a turn. We check facts before deciding.' : 'Evidence-led and balanced.')}
    ${missionHero(kid)}
    <div class="summary-grid">
      <div class="card">
        <h3>${esc(state.case.title)}</h3>
        <p>${esc(state.case.summary)}</p>
        <p style="font-size: 12px; color: var(--muted); margin-top: 12px;">📍 ${esc(state.case.location)} · ${esc(state.case.date)}</p>
      </div>
      <div class="card">
        <h3>${kid ? '✓ Gentle Status' : '✓ Status'}</h3>
        <p>${analysis ? esc(analysis.summary) : 'Keep gathering independent facts.'}</p>
      </div>
    </div>
    ${analysis ? analysisSummaryHtml(analysis) : ''}
  `;
}

function caseView() {
  const kid = state.mode === 'kids';
  return `
    ${heading(kid ? '📋 Case Info' : '📋 Case File', 'Details', 'Keep facts, assumptions, and decisions separate.')}
    <div class="card">
      <form onsubmit="saveCase(event)">
        <div class="form-row">
          <label>Title<input name="title" value="${esc(state.case.title)}" /></label>
          <label>Type<input name="type" value="${esc(state.case.type)}" /></label>
        </div>
        <div class="form-row">
          <label>Location<input name="location" value="${esc(state.case.location)}" /></label>
          <label>Date / Time<input name="date" value="${esc(state.case.date)}" /></label>
        </div>
        <label>Summary<textarea name="summary">${esc(state.case.summary)}</textarea></label>
        <div style="margin-top: 16px;">
          <button type="submit" class="btn primary">Save Case</button>
        </div>
      </form>
    </div>
  `;
}

function peopleHtml() {
  return `<div class="list">${state.people.map((p, i) => `
    <div class="list-item">
      <div>
        <strong>${esc(p.name)}</strong>
        <p>${esc(p.role)}</p>
        <p>${esc(p.note)}</p>
      </div>
      <button class="btn danger" onclick="removePerson(${i})">✕</button>
    </div>
  `).join('')}</div>`;
}

function timelineView() {
  const kid = state.mode === 'kids';
  return `
    ${heading(kid ? '⏱ What Happened' : '⏱ Timeline', 'When?', 'Recorded times, estimates, and sources.')}
    <div class="grid two">
      <div class="card">
        <h3>Events</h3>
        <div class="list">
          ${state.events.map((event, i) => `
            <div class="list-item">
              <div>
                <strong>${esc(event[0])}</strong>
                <p>${esc(event[1])}</p>
              </div>
              <span class="chip">${esc(event[2])}</span>
            </div>
          `).join('')}
        </div>
        <button class="btn primary" style="width: 100%; margin-top: 12px;" onclick="addEvent()">+ Event</button>
      </div>
      <div class="card">
        <h3>People</h3>
        ${peopleHtml()}
        <button class="btn primary" style="width: 100%; margin-top: 12px;" onclick="addPerson()">+ Person</button>
      </div>
    </div>
  `;
}

function evidenceView() {
  const kid = state.mode === 'kids';
  return `
    ${heading(kid ? '📸 What We Know' : '📸 Evidence', 'The Record', 'What was seen, found, or recorded—not what it proves.')}
    <div class="card">
      <div class="list">
        ${state.evidence.map((item, i) => `
          <div class="list-item">
            <div>
              <strong>${esc(item.title)}</strong>
              <p>${esc(item.kind)} · Strength: ${esc(item.strength)}</p>
              <p>${esc(item.detail)}</p>
            </div>
            <button class="btn danger" onclick="removeEvidence(${i})">✕</button>
          </div>
        `).join('')}
      </div>
      <button class="btn primary" style="width: 100%; margin-top: 12px;" onclick="addEvidence()">+ Evidence</button>
    </div>
  `;
}

function questionsView() {
  const kid = state.mode === 'kids';
  return `
    ${heading(kid ? '❓ What to Check' : '❓ Questions', 'To Resolve', 'Gaps and contradictions to verify.')}
    <div class="grid two">
      <div class="card">
        <h3>Open Questions</h3>
        <div class="list">
          ${state.questions.length ? state.questions.map((q, i) => `
            <div class="list-item">
              <div><p>${esc(q)}</p></div>
              <button class="btn success" onclick="answerQuestion(${i})">✓</button>
            </div>
          `).join('') : '<div class="list-item"><div><p>No open questions. Add one to keep testing the case.</p></div></div>'}
        </div>
        ${state.answered.length ? `
          <h4 class="subhead">Answered (${state.answered.length})</h4>
          <div class="list answered-list">
            ${state.answered.map((q) => `<div class="list-item"><div><p>${esc(q)}</p></div><span class="chip success-chip">✓ Checked</span></div>`).join('')}
          </div>
        ` : ''}
        <button class="btn primary" style="width: 100%; margin-top: 12px;" onclick="addQuestion()">+ Question</button>
      </div>
      <div class="card">
        <h3>Working Explanations</h3>
        <div class="list">
          ${state.hypotheses.map(([h, score]) => `
            <div class="list-item">
              <div><p>${esc(h)}</p></div>
              <span class="chip">${esc(score)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function analysisView() {
  const kid = state.mode === 'kids';
  const analysis = window.ClarityIntelligence ? window.ClarityIntelligence.analyze(state, state.mode) : {
    headline: 'No analysis loaded',
    summary: 'The intelligence layer did not load.',
    sections: [],
    status: 'Unavailable',
    disclaimer: 'Check your connection or try refreshing.',
    metrics: { evidenceQuality: 0, gaps: 0, questions: 0 }
  };

  return heading(kid ? '🧩 Gentle Reasoning' : '🧩 Deductive Analysis', kid ? 'Truth Checks' : 'Behavioural & Scene Analysis', kid ? 'Looking for facts and fair explanations.' : 'Looking for verification, not verdicts.') + analysisSummaryHtml(analysis);
}

function reportView() {
  const kid = state.mode === 'kids';
  const analysis = window.ClarityIntelligence ? window.ClarityIntelligence.analyze(state, state.mode) : null;
  return `
    ${heading(kid ? '📄 Fair Summary' : '📄 Case Report', 'Review', 'Neutral, exportable summary.')}
    <div class="card">
      <h3>Case Overview</h3>
      <p>${esc(state.case.summary)}</p>
    </div>
    ${analysis ? `
      <div class="card">
        <h3>Key Findings</h3>
        <ul class="bullet-list">
          ${analysis.sections.map((section) => `<li><strong>${esc(section.heading)}:</strong> ${esc(section.items[0] || '')}</li>`).join('')}
        </ul>
      </div>
      <div class="card">
        <h3>${kid ? 'Safe Next Step' : 'Recommended Next Step'}</h3>
        <p>${esc(analysis.summary)}</p>
      </div>
    ` : ''}
    <div class="quick-actions">
      <button class="btn primary" onclick="printReport()">🖨️ Print / PDF</button>
      <button class="btn" onclick="shareCase()">📤 Share</button>
    </div>
  `;
}

function saveCase(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  Object.assign(state.case, Object.fromEntries(form));
  go('overview');
}

function addPerson() {
  const name = prompt('Person name or label:');
  if (!name) return;
  state.people.push({
    name,
    role: prompt('Role (witness, staff, etc.):') || 'Person involved',
    note: prompt('What did they say or do?:') || 'No notes yet.'
  });
  app();
}

function removePerson(i) {
  state.people.splice(i, 1);
  app();
}

function addEvent() {
  const time = prompt('Time or time range:');
  if (!time) return;
  state.events.push([
    time,
    prompt('What happened?') || 'Event',
    prompt('Source (record, statement, observation):') || 'Unspecified'
  ]);
  app();
}

function removeEvidence(i) {
  state.evidence.splice(i, 1);
  app();
}

function addEvidence() {
  const title = prompt('Evidence title:');
  if (!title) return;
  state.evidence.push({
    title,
    kind: prompt('Type (document, statement, photo, record):') || 'Uncategorised',
    strength: prompt('Reliability? (Strong / Moderate / Weak):') || 'Moderate',
    detail: prompt('Describe:') || 'No detail.'
  });
  app();
}

function addQuestion() {
  const q = prompt('Write a neutral question:');
  if (q) {
    state.questions.push(q);
    state.milestones.addedQuestion = true;
    app();
  }
}

function answerQuestion(i) {
  const [question] = state.questions.splice(i, 1);
  if (question) state.answered.push(question);
  app();
}

function shareCase() {
  const caseText = `Case: ${state.case.title}\nLocation: ${state.case.location}\nDate: ${state.case.date}\n\nSummary: ${state.case.summary}`;
  state.milestones.shared = true;
  persist();
  app();
  if (navigator.share) {
    navigator.share({ title: 'Clarity Case', text: caseText }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(caseText).then(() => alert('Case copied to clipboard.')).catch(() => {});
  }
}

function printReport() {
  state.milestones.shared = true;
  persist();
  app();
  window.print();
}

app();
