/* Clarity storage layer — persists investigations to localStorage. */
(function (global) {
  const KEY = 'clarity-investigations';
  const MODE_KEY = 'clarity-mode';

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Clarity: failed to load investigations', e);
      return [];
    }
  }

  function saveAll(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Clarity: failed to save investigations', e);
    }
  }

  function listInvestigations() {
    return loadAll()
      .map((inv) => ({
        id: inv.id,
        title: inv.title,
        type: inv.type,
        status: inv.status,
        updatedAt: inv.updatedAt,
        createdAt: inv.createdAt,
        summary: inv.whatHappened || '',
        counts: {
          people: (inv.people || []).length,
          evidence: (inv.evidence || []).length,
          events: (inv.events || []).length,
          hypotheses: (inv.hypotheses || []).length,
        },
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function loadInvestigation(id) {
    return loadAll().find((inv) => inv.id === id) || null;
  }

  function saveInvestigation(investigation) {
    investigation.updatedAt = Date.now();
    const all = loadAll();
    const idx = all.findIndex((inv) => inv.id === investigation.id);
    if (idx >= 0) all[idx] = investigation;
    else all.push(investigation);
    saveAll(all);
    return investigation;
  }

  function deleteInvestigation(id) {
    const all = loadAll().filter((inv) => inv.id !== id);
    saveAll(all);
  }

  function createInvestigation(title, type) {
    const now = Date.now();
    const inv = {
      id: uid('inv'),
      title: title || 'Untitled Investigation',
      type: type || 'Unexplained situation',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      whatHappened: '',
      whatWasExpected: '',
      people: [],
      locations: [],
      objects: [],
      events: [],
      evidence: [],
      statements: [],
      hypotheses: [],
      knownFacts: [],
      unknowns: [],
      ruledOut: [],
      checkedActions: [],
      history: [{ timestamp: now, action: 'created', detail: 'Investigation created' }],
      questions: [],
    };
    saveInvestigation(inv);
    return inv;
  }

  function logHistory(investigation, action, detail) {
    if (!investigation.history) investigation.history = [];
    investigation.history.push({
      timestamp: Date.now(),
      action,
      detail,
    });
  }

  function exportInvestigation(id) {
    const inv = loadInvestigation(id);
    if (!inv) return null;
    return JSON.stringify(inv, null, 2);
  }

  function importInvestigation(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      data.id = uid('inv');
      data.createdAt = Date.now();
      data.updatedAt = Date.now();
      if (!data.history) data.history = [];
      data.history.push({ timestamp: Date.now(), action: 'imported', detail: 'Investigation imported' });
      saveInvestigation(data);
      return data;
    } catch (e) {
      console.warn('Clarity: failed to import investigation', e);
      return null;
    }
  }

  function getMode() {
    return localStorage.getItem(MODE_KEY) || 'professional';
  }

  function setMode(mode) {
    localStorage.setItem(MODE_KEY, mode);
  }

  const api = {
    uid,
    listInvestigations,
    loadInvestigation,
    saveInvestigation,
    deleteInvestigation,
    createInvestigation,
    logHistory,
    exportInvestigation,
    importInvestigation,
    getMode,
    setMode,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ClarityStorage = api;
}(typeof window !== 'undefined' ? window : globalThis));
