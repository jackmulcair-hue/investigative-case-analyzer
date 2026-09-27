const state = {
  mode: localStorage.getItem('clarity-mode') || 'professional',
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
  hypotheses: [
    ['Cash was misplaced during handover', 42],
    ['Unauthorised removal by someone with access', 35],
    ['Amount was recorded incorrectly', 23]
  ]
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

function persist() {
  localStorage.setItem('clarity-mode', state.mode);
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
    <div class="analysis-shell">
      <div class="notice">
        <strong>${esc(analysis.headline)}:</strong> ${esc(analysis.summary)}
      </div>
      <div class="meta-row">
        <span class="pill">${esc(analysis.status)}</span>
      </div>
      <div class="grid two">${cards}</div>
    </div>
  `;
}

function app() {
  document.getElementById('app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">◈</span> Clarity</div>
        <div class="mode-toggle-wrap">
          <button class="mode-toggle" onclick="toggleMode()">
            ${state.mode === 'kids' ? '👨‍👩‍👧 Switch to adult mode' : '👶 Switch to kids mode'}
          </button>
        </div>
        <nav class="nav">
          ${nav('overview', 'Overview', '◉')}
          ${nav('case', 'Case file', '▣')}
          ${nav('timeline', 'Timeline', '⏱')}
          ${nav('evidence', 'Evidence', '◯')}
          ${nav('questions', 'Questions', '❓')}
          ${nav('analysis', 'Analysis', '◎')}
          ${nav('report', 'Report', '▤')}
        </nav>
      </aside>

      <main class="main">
        ${renderView()}
      </main>
    </div>
  `;
}

function nav(id, label, icon) {
  return `<button class="${state.view === id ? 'active' : ''}" onclick="go('${id}')">${icon}&nbsp; ${label}</button>`;
}

function go(v) {
  state.view = v;
  app();
}

function toggleMode() {
  state.mode = state.mode === 'kids' ? 'professional' : 'kids';
  persist();
  app();
}

function renderView() {
  if (state.view === 'case') return caseView();
  if (state.view === 'timeline') return timelineView();
  if (state.view === 'evidence') return evidenceView();
  if (state.view === 'questions') return questionsView();
  if (state.view === 'analysis') return analysisView();
  if (state.view === 'report') return reportView();
  return overview();
}

function heading(kicker, title, sub) {
  return `<div class="small muted">${esc(kicker.toUpperCase())}</div><h1>${esc(title)}</h1><p class="subtitle">${esc(sub)}</p>`;
}

function overview() {
  const kid = state.mode === 'kids';
  const analysis = window.ClarityIntelligence ? window.ClarityIntelligence.analyze(state, state.mode) : null;

  return `
    ${heading(kid ? 'KIDS MODE • FAIR PLAY DESK' : 'CASE OVERVIEW', kid ? 'Let's work out what happened' : 'Good afternoon, Jack', kid ? 'Everyone gets a chance to explain, and we check for facts before conclusions.' : 'This workspace is deliberately evidence-led and balanced.')} 
    <div class="summary-grid">
      <div class="card">
        <div class="small muted">CASE</div>
        <h3>${esc(state.case.title)}</h3>
        <p>${esc(state.case.summary)}</p>
      </div>
      <div class="card">
        <div class="small muted">STATUS</div>
        <h3>${kid ? 'Gentle and fair' : 'Evidence-first'}</h3>
        <p>${analysis ? esc(analysis.summary) : 'Keep gathering independent corroboration.'}</p>
      </div>
    </div>
    ${analysis ? analysisSummaryHtml(analysis) : ''}
  `;
}

function caseView() {
  return heading('CASE FILE', 'Case details', 'Keep observations, assumptions and decisions clearly separated.') + `
    <div class="card">
      <form onsubmit="saveCase(event)">
        <div class="grid two">
          <label>Title<input name="title" value="${esc(state.case.title)}" /></label>
          <label>Type<input name="type" value="${esc(state.case.type)}" /></label>
          <label>Location<input name="location" value="${esc(state.case.location)}" /></label>
          <label>Date<input name="date" value="${esc(state.case.date)}" /></label>
        </div>
        <label>Summary<textarea name="summary">${esc(state.case.summary)}</textarea></label>
        <button type="submit">Save case</button>
      </form>
    </div>
  `;
}

function peopleHtml() {
  return `<div class="list">${state.people.map((p, i) => `
    <div class="list-item">
      <div>
        <strong>${esc(p.name)}</strong>
        <p>${esc(p.role)} · ${esc(p.note)}</p>
      </div>
      <button class="danger" onclick="removePerson(${i})">Remove</button>
    </div>
  `).join('')}</div>`;
}

function timelineView() {
  return heading('TIMELINE', 'What happened, and when?', 'Separate recorded events from estimates. Unknown times are allowed.') + `
    <div class="grid two">
      <div class="card">
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
        <button onclick="addEvent()">Add event</button>
      </div>
      <div class="card">
        <h3>People</h3>
        ${peopleHtml()}
        <button onclick="addPerson()">Add person</button>
      </div>
    </div>
  `;
}

function evidenceView() {
  return heading('EVIDENCE', 'Evidence register', 'Record what was observed, where it came from and how strong the source is—not what it proves by itself.') + `
    <div class="card">
      <div class="list">
        ${state.evidence.map((item, i) => `
          <div class="list-item">
            <div>
              <strong>${esc(item.title)}</strong>
              <p>${esc(item.kind)} · ${esc(item.strength)} · ${esc(item.detail)}</p>
            </div>
            <button class="danger" onclick="removeEvidence(${i})">Remove</button>
          </div>
        `).join('')}
      </div>
      <button onclick="addEvidence()">Add evidence</button>
    </div>
  `;
}

function questionsView() {
  return heading('QUESTIONS', 'Questions to resolve', 'Neutral prompts generated from gaps and contradictions. Record answers with their source.') + `
    <div class="grid two">
      <div class="card">
        <div class="list">
          ${state.questions.map((q, i) => `
            <div class="list-item">
              <div><p>${esc(q)}</p></div>
              <button class="danger" onclick="answerQuestion(${i})">Answered</button>
            </div>
          `).join('')}
        </div>
        <button onclick="addQuestion()">Add question</button>
      </div>
      <div class="card">
        <h3>Hypotheses</h3>
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
  const analysis = window.ClarityIntelligence ? window.ClarityIntelligence.analyze(state, state.mode) : {
    headline: 'No analysis engine loaded',
    summary: 'This version could not load the intelligence layer.',
    sections: [],
    status: 'Unavailable',
  };

  return heading('INTELLIGENCE', state.mode === 'kids' ? 'Gentle reasoning and truth checks' : 'Behavioural and deductive analysis', 'Look for patterns, access, motive, time, and independent confirmation without turning a hunch into a verdict.') + analysisSummaryHtml(analysis);
}

function reportView() {
  const analysis = window.ClarityIntelligence ? window.ClarityIntelligence.analyze(state, state.mode) : null;
  return heading('CASE REPORT', 'Review before you act', 'A neutral, exportable summary. It deliberately avoids naming a culprit.') + `
    <div class="report-block">
      <div class="card">
        <h3>Overview</h3>
        <p>${esc(state.case.summary)}</p>
      </div>
      <div class="card">
        <h3>Key findings</h3>
        <ul>
          ${analysis ? analysis.sections.map((section) => `<li><strong>${esc(section.heading)}:</strong> ${esc(section.items[0])}</li>`).join('') : '<li>Analysis is unavailable.</li>'}
        </ul>
      </div>
      <div class="card">
        <h3>Safe conclusion</h3>
        <p>${analysis ? esc(analysis.summary) : 'Continue gathering verification before making a judgement.'}</p>
      </div>
    </div>
  `;
}

function saveCase(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  Object.assign(state.case, Object.fromEntries(form));
  go('overview');
}

function newCase() {
  if (!confirm('Start a new case? The current case stays in this browser until replaced.')) return;
  state.case = { title: 'Untitled case', type: 'Incident', location: '', date: 'Today', summary: '' };
  app();
}

function addPerson() {
  const name = prompt('Person name or neutral label:');
  if (!name) return;
  state.people.push({
    name,
    role: prompt('Role (witness, reporter, visitor, etc.):') || 'Person involved',
    note: prompt('Relevant information or statement:') || 'No notes recorded yet.'
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
    prompt('What happened?') || 'Unspecified event',
    prompt('Source (record, statement, observation):') || 'Unspecified source'
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
    strength: prompt('How reliable is this source? Strong / Moderate / Weak:') || 'Moderate',
    detail: prompt('Describe the evidence:') || 'No detail recorded.'
  });
  app();
}

function addQuestion() {
  const q = prompt('Write a neutral question:');
  if (q) {
    state.questions.push(q);
    app();
  }
}

function answerQuestion(i) {
  state.questions.splice(i, 1);
  app();
}

app();
