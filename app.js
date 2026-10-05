/* Clarity — investigative problem-solving system.
 * Main application: state, routing, modal system, entity management. */

const state = {
  mode: ClarityStorage.getMode(),
  view: 'investigations',
  currentId: null,
  current: null,
  analysis: null,
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

// ─── Entity field configs ───
const ENTITY_CONFIG = {
  people:         { label: 'Person',        nameKey: 'name', fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'role', label: 'Role', type: 'text' },
    { name: 'note', label: 'Notes / What they said or did', type: 'textarea' },
  ]},
  locations:      { label: 'Location',      nameKey: 'name', fields: [
    { name: 'name', label: 'Location name', type: 'text', required: true },
    { name: 'note', label: 'Notes', type: 'textarea' },
  ]},
  objects:        { label: 'Object',        nameKey: 'name', fields: [
    { name: 'name', label: 'Object / Item name', type: 'text', required: true },
    { name: 'note', label: 'Notes', type: 'textarea' },
  ]},
  events:         { label: 'Event',         nameKey: 'description', fields: [
    { name: 'time', label: 'Time or time range', type: 'text', required: true },
    { name: 'description', label: 'What happened', type: 'text', required: true },
    { name: 'source', label: 'Source (record, statement, observation)', type: 'text' },
    { name: 'verified', label: 'Verified by independent source', type: 'checkbox' },
  ]},
  evidence:       { label: 'Evidence',       nameKey: 'title', fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'kind', label: 'Type', type: 'select', options: [
      { value: 'Document', label: 'Document' }, { value: 'Record', label: 'Record / Log' },
      { value: 'Photo', label: 'Photo' }, { value: 'Video', label: 'Video / CCTV' },
      { value: 'Statement', label: 'Statement' }, { value: 'Physical', label: 'Physical item' },
      { value: 'Data', label: 'Data / Digital' }, { value: 'Other', label: 'Other' },
    ]},
    { name: 'strength', label: 'Strength', type: 'select', options: [
      { value: 'Strong', label: 'Strong' }, { value: 'Moderate', label: 'Moderate' }, { value: 'Weak', label: 'Weak' },
    ]},
    { name: 'detail', label: 'Description', type: 'textarea' },
  ]},
  statements:     { label: 'Statement',      nameKey: 'text', fields: [
    { name: 'person', label: 'Person', type: 'text', required: true },
    { name: 'text', label: 'What they said', type: 'textarea', required: true },
  ]},
  hypotheses:     { label: 'Hypothesis',     nameKey: 'text', fields: [
    { name: 'text', label: 'Explanation', type: 'textarea', required: true },
    { name: 'notes', label: 'Notes', type: 'textarea' },
    { name: 'supports', label: 'Supporting Evidence', type: 'checkbox-group' },
    { name: 'contradicts', label: 'Contradicting Evidence', type: 'checkbox-group' },
  ]},
  knownFacts:     { label: 'Known Fact',     nameKey: 'text', fields: [
    { name: 'text', label: 'Fact', type: 'textarea', required: true },
    { name: 'source', label: 'Source', type: 'text' },
  ]},
  unknowns:       { label: 'Unknown',        nameKey: 'text', fields: [
    { name: 'text', label: 'What is unknown', type: 'textarea', required: true },
    { name: 'priority', label: 'Priority', type: 'select', options: [
      { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
    ]},
  ]},
  ruledOut:       { label: 'Ruled Out',      nameKey: 'text', fields: [
    { name: 'text', label: 'What was ruled out', type: 'textarea', required: true },
    { name: 'reason', label: 'Reason', type: 'textarea' },
  ]},
  checkedActions: { label: 'Checked Action', nameKey: 'text', fields: [
    { name: 'text', label: 'What was checked', type: 'text', required: true },
    { name: 'result', label: 'Result', type: 'textarea' },
  ]},
};

// ─── Main render ───
function app() {
  document.documentElement.classList.toggle('kids-mode', state.mode === 'kids');
  ClarityStorage.setMode(state.mode);

  if (state.currentId) {
    state.current = ClarityStorage.loadInvestigation(state.currentId);
    if (!state.current) { state.currentId = null; state.view = 'investigations'; }
  }
  if (state.current) {
    state.analysis = ClarityIntelligence.analyze(state.current, state.mode);
  } else {
    state.analysis = null;
  }

  const inInvestigation = state.current && state.view !== 'investigations';

  document.getElementById('app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">${state.mode === 'kids' ? '🔍' : '◆'}</span> Clarity</div>
        <div class="mode-toggle-wrap">
          <button class="mode-toggle" onclick="toggleMode()">
            ${state.mode === 'kids' ? '👨 Adult Mode' : '👧 Kids Mode'}
          </button>
        </div>
        ${inInvestigation ? `
          <button class="back-btn" onclick="backToList()">← All Cases</button>
          <nav class="nav">
            ${nav('overview', 'Overview', '◉')}
            ${nav('case', 'Case', '📋')}
            ${nav('timeline', 'Timeline', '⏱')}
            ${nav('evidence', 'Evidence', '📄')}
            ${nav('workspace', 'Workspace', '🔗')}
            ${nav('analysis', 'Analysis', '🧩')}
            ${nav('questions', 'Questions', '❓')}
            ${nav('history', 'History', '📜')}
            ${nav('report', 'Report', '📄')}
          </nav>
        ` : ''}
      </aside>
      <main class="main">
        ${inInvestigation ? `<div class="main-header"><h1>${esc(state.current.title)}</h1><p class="subtitle">${esc(state.current.type)} · ${esc(state.current.status)}</p></div>` : ''}
        <div class="main-content ${inInvestigation ? '' : 'full-width'}">
          ${renderView()}
        </div>
      </main>
    </div>
  `;

  if (state.view === 'workspace' && state.current) {
    const container = document.getElementById('workspace-container');
    if (container) ClarityWorkspace.render(state.current, container);
  }
}

function nav(id, label, icon) {
  return `<button class="${state.view === id ? 'active' : ''}" onclick="go('${id}')">${icon} ${label}</button>`;
}

function go(v) {
  state.view = v;
  app();
}

function toggleMode() {
  state.mode = state.mode === 'kids' ? 'professional' : 'kids';
  app();
}

function backToList() {
  state.view = 'investigations';
  state.currentId = null;
  state.current = null;
  state.analysis = null;
  app();
}

function renderView() {
  if (!state.current || state.view === 'investigations') return investigationsView();
  if (state.view === 'case') return caseView();
  if (state.view === 'timeline') return timelineView();
  if (state.view === 'evidence') return evidenceView();
  if (state.view === 'workspace') return workspaceView();
  if (state.view === 'analysis') return analysisView();
  if (state.view === 'questions') return questionsView();
  if (state.view === 'history') return historyView();
  if (state.view === 'report') return reportView();
  return overviewView();
}

// ─── Section toggle ───
function toggleSection(key) {
  const body = document.getElementById('body-' + key);
  if (!body) return;
  body.classList.toggle('collapsed');
  const icon = document.getElementById('icon-' + key);
  if (icon) icon.textContent = body.classList.contains('collapsed') ? '▶' : '▼';
}

// ─── Modal system ───
let modalConfig = null;

function openModal(config) {
  modalConfig = config;
  let fields = config.fields;
  if (config.type === 'hypotheses') {
    const evOpts = (state.current.evidence || []).map((e) => ({ value: e.id, label: e.title }));
    fields = fields.map((f) => f.type === 'checkbox-group' ? { ...f, options: evOpts } : f);
  }
  const overlay = document.createElement('div');
  overlay.id = 'clarity-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${esc(config.title)}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <form id="modal-form" class="modal-body" onsubmit="event.preventDefault();saveModal()">
        ${renderModalFields(fields, config.values)}
      </form>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn primary" onclick="saveModal()">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function renderModalFields(fields, values) {
  return fields.map((f) => {
    const val = values ? (values[f.name] ?? '') : '';
    if (f.type === 'textarea')
      return `<label>${esc(f.label)}${f.required ? ' *' : ''}<textarea name="${f.name}" ${f.required ? 'required' : ''}>${esc(val)}</textarea></label>`;
    if (f.type === 'select') {
      const opts = f.options.map((o) => `<option value="${o.value}" ${String(o.value) === String(val) ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
      return `<label>${esc(f.label)}<select name="${f.name}">${opts}</select></label>`;
    }
    if (f.type === 'checkbox')
      return `<label class="checkbox-label"><input type="checkbox" name="${f.name}" ${val ? 'checked' : ''}/> ${esc(f.label)}</label>`;
    if (f.type === 'checkbox-group') {
      const selected = new Set(Array.isArray(val) ? val : []);
      const items = (f.options || []).map((o) => `<label class="checkbox-item"><input type="checkbox" name="${f.name}" value="${o.value}" ${selected.has(o.value) ? 'checked' : ''}/> ${esc(o.label)}</label>`).join('');
      return `<div class="form-group"><span class="form-label">${esc(f.label)}</span><div class="checkbox-group">${items || '<span class="empty-hint">No evidence yet</span>'}</div></div>`;
    }
    return `<label>${esc(f.label)}${f.required ? ' *' : ''}<input name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}" ${f.required ? 'required' : ''}/></label>`;
  }).join('');
}

function closeModal() {
  modalConfig = null;
  const overlay = document.getElementById('clarity-modal');
  if (overlay) overlay.remove();
}

function saveModal() {
  if (!modalConfig) return;
  const form = document.getElementById('modal-form');
  const data = {};
  modalConfig.fields.forEach((f) => {
    if (f.type === 'checkbox-group')
      data[f.name] = Array.from(form.querySelectorAll(`input[name="${f.name}"]:checked`)).map((cb) => cb.value);
    else if (f.type === 'checkbox')
      data[f.name] = form.querySelector(`input[name="${f.name}"]`).checked;
    else {
      const el = form.querySelector(`[name="${f.name}"]`);
      data[f.name] = el ? el.value : '';
    }
  });
  modalConfig.onSave(data);
  closeModal();
}

// ─── Entity management ───
function addEntity(type) {
  const config = ENTITY_CONFIG[type];
  openModal({
    title: 'Add ' + config.label,
    type: type,
    fields: config.fields,
    onSave: (data) => {
      const entity = { id: ClarityStorage.uid(type.charAt(0)), ...data };
      if (!state.current[type]) state.current[type] = [];
      state.current[type].push(entity);
      ClarityStorage.logHistory(state.current, 'added', config.label + ': ' + (data[config.nameKey] || '').slice(0, 50));
      ClarityStorage.saveInvestigation(state.current);
      app();
    },
  });
}

function editEntity(type, id) {
  const config = ENTITY_CONFIG[type];
  const entity = (state.current[type] || []).find((e) => e.id === id);
  if (!entity) return;
  openModal({
    title: 'Edit ' + config.label,
    type: type,
    fields: config.fields,
    values: entity,
    onSave: (data) => {
      Object.assign(entity, data);
      ClarityStorage.logHistory(state.current, 'edited', config.label + ': ' + (data[config.nameKey] || '').slice(0, 50));
      ClarityStorage.saveInvestigation(state.current);
      app();
    },
  });
}

function removeEntity(type, id) {
  const config = ENTITY_CONFIG[type];
  const entity = (state.current[type] || []).find((e) => e.id === id);
  state.current[type] = (state.current[type] || []).filter((e) => e.id !== id);
  ClarityStorage.logHistory(state.current, 'removed', config.label + ': ' + (entity && entity[config.nameKey] || '').slice(0, 50));
  ClarityStorage.saveInvestigation(state.current);
  app();
}

// ─── Case details ───
function saveCaseDetails(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const data = Object.fromEntries(form);
  Object.assign(state.current, data);
  ClarityStorage.logHistory(state.current, 'updated', 'Case details');
  ClarityStorage.saveInvestigation(state.current);
  app();
}

// ─── Investigation CRUD ───
function createNewInvestigation() {
  openModal({
    title: 'New Investigation',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: [
        { value: 'Missing item', label: 'Missing item' },
        { value: 'Unexplained event', label: 'Unexplained event' },
        { value: 'Conflicting accounts', label: 'Conflicting accounts' },
        { value: 'Troubleshooting', label: 'Troubleshooting' },
        { value: 'Reconstructing events', label: 'Reconstructing events' },
        { value: 'Missing property', label: 'Missing property' },
        { value: 'Unexplained situation', label: 'Unexplained situation' },
        { value: 'Other', label: 'Other' },
      ]},
    ],
    onSave: (data) => {
      const inv = ClarityStorage.createInvestigation(data.title, data.type);
      openInvestigation(inv.id);
    },
  });
}

function openInvestigation(id) {
  state.currentId = id;
  state.view = 'overview';
  app();
}

function deleteInvestigationById(id) {
  if (!confirm('Delete this investigation? This cannot be undone.')) return;
  ClarityStorage.deleteInvestigation(id);
  if (state.currentId === id) backToList();
  else app();
}

function exportInvestigationById(id) {
  const data = ClarityStorage.exportInvestigation(id);
  if (!data) return;
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clarity-investigation.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportCurrentInvestigation() {
  if (state.currentId) exportInvestigationById(state.currentId);
}

function importInvestigationData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const inv = ClarityStorage.importInvestigation(reader.result);
      if (inv) { openInvestigation(inv.id); }
      else alert('Failed to import. Check the file format.');
    };
    reader.readAsText(file);
  };
  input.click();
}

function shareCase() {
  const inv = state.current;
  if (!inv) return;
  const text = `Clarity: ${inv.title}\n\nSituation: ${inv.whatHappened || 'N/A'}\n\nStatus: ${inv.status}`;
  if (navigator.share) navigator.share({ title: 'Clarity: ' + inv.title, text });
  else if (navigator.clipboard) { navigator.clipboard.writeText(text); alert('Case summary copied.'); }
}

// ─── Questions ───
function addCustomQuestion() {
  openModal({
    title: 'Add Question',
    fields: [
      { name: 'text', label: 'Question', type: 'textarea', required: true },
      { name: 'priority', label: 'Priority', type: 'select', options: [
        { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
      ]},
    ],
    onSave: (data) => {
      if (!state.current.questions) state.current.questions = [];
      state.current.questions.push({ id: ClarityStorage.uid('q'), text: data.text, priority: data.priority, answered: false });
      ClarityStorage.logHistory(state.current, 'added', 'Question: ' + data.text.slice(0, 50));
      ClarityStorage.saveInvestigation(state.current);
      app();
    },
  });
}

// ─── Seed data ───
function seedIfEmpty() {
  if (ClarityStorage.listInvestigations().length > 0) return;
  const inv = ClarityStorage.createInvestigation('The Missing Float', 'Missing property');
  inv.whatHappened = 'Cash from the reception float was discovered missing after the afternoon handover. The handover sheet recorded £500, but the drawer was empty when checked.';
  inv.whatWasExpected = 'The float should have been £500 in the locked drawer, as recorded on the signed handover sheet.';
  const uid = ClarityStorage.uid;
  inv.people = [
    { id: uid('p'), name: 'Alex Morgan', role: 'Staff member', note: 'Had key access; says they left at 14:05.' },
    { id: uid('p'), name: 'Jordan Lee', role: 'Volunteer', note: 'Was in the reception area during the handover.' },
    { id: uid('p'), name: 'Samir Patel', role: 'Witness', note: 'Saw the drawer and desk area near 14:10; says it looked undisturbed.' },
  ];
  inv.locations = [{ id: uid('l'), name: 'Riverside Community Centre', note: 'Reception area with float drawer' }];
  inv.objects = [
    { id: uid('o'), name: 'Cash float', note: '£500 in the reception drawer' },
    { id: uid('o'), name: 'Handover sheet', note: 'Signed document recording the float amount' },
  ];
  inv.events = [
    { id: uid('e'), time: '13:55', description: 'Alex signs into reception', source: 'Entry log', verified: true },
    { id: uid('e'), time: '14:05', description: 'Alex says they left early', source: 'Statement', verified: false },
    { id: uid('e'), time: '14:10', description: 'Cash drawer reportedly opened', source: 'Witness statement', verified: false },
    { id: uid('e'), time: '14:12', description: 'Handover sheet signed', source: 'Document', verified: true },
  ];
  inv.evidence = [
    { id: uid('v'), title: 'Handover sheet', kind: 'Document', strength: 'Strong', detail: 'Signed at 14:12; amount recorded as £500.' },
    { id: uid('v'), title: 'Front desk statement', kind: 'Statement', strength: 'Moderate', detail: 'Claims the float was checked and was still present at 14:10.' },
    { id: uid('v'), title: 'Entry log', kind: 'Record', strength: 'Moderate', detail: 'Shows activity near reception at 14:07 and 14:12.' },
  ];
  inv.hypotheses = [
    { id: uid('h'), text: 'Cash was misplaced during handover', confidence: 42, notes: '', supports: [], contradicts: [] },
    { id: uid('h'), text: 'Unauthorised removal by someone with access', confidence: 35, notes: '', supports: [], contradicts: [] },
    { id: uid('h'), text: 'Amount was recorded incorrectly', confidence: 23, notes: '', supports: [], contradicts: [] },
  ];
  inv.unknowns = [
    { id: uid('u'), text: 'Who can independently confirm Alex left at 14:05?', priority: 'high' },
    { id: uid('u'), text: 'Was the cash drawer visibly locked between 14:05 and 14:10?', priority: 'high' },
  ];
  inv.knownFacts = [{ id: uid('k'), text: 'The float was recorded as £500 on the handover sheet', source: 'Handover sheet' }];
  inv.ruledOut = [{ id: uid('r'), text: 'External burglary', reason: 'No signs of forced entry; building was locked' }];
  inv.checkedActions = [{ id: uid('c'), text: 'Checked entry log', result: 'Shows Alex and Jordan in reception area' }];
  ClarityStorage.saveInvestigation(inv);
}

// ─── Start ───
seedIfEmpty();
app();
