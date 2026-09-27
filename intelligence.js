/* Clarity's explainable, non-diagnostic reasoning layer. It identifies verification needs—not guilt, deception, or psychological diagnoses. */
(function (global) {
  const text = (value) => String(value ?? '').trim();
  const allText = (items, mapper) => (items || []).map(mapper).join(' ').toLowerCase();
  const unique = (items) => [...new Set(items.filter(Boolean))];
  const signal = (label, detail, level = 'check') => ({ label, detail, level });

  function observationQuality(item) {
    const kind = text(item && item.kind).toLowerCase();
    const strength = text(item && item.strength).toLowerCase();
    let score = strength === 'strong' ? 3 : strength === 'weak' ? 1 : 2;
    if (/photo|video|camera|record|log|document|receipt|physical/.test(kind)) score += 1;
    if (/statement|rumour|memory|hearsay/.test(kind)) score -= 1;
    return Math.max(1, Math.min(4, score));
  }

  function assessBehaviour(people, mode) {
    return (people || []).map((person) => {
      const note = text(person.note);
      const lower = note.toLowerCase();
      const cues = [];
      if (/can't remember|cannot remember|not sure|maybe|i think|i guess/.test(lower)) cues.push('memory uncertainty');
      if (/changed the subject|would not answer|avoided|refused|no comment/.test(lower)) cues.push('answer avoidance');
      if (/angry|shouting|threatened|pressure|blame|everyone knows/.test(lower)) cues.push('emotional or pressure language');
      if (/looked away|fidget|nervous|paused|silence/.test(lower)) cues.push('reported discomfort cue');
      const caveat = mode === 'kids'
        ? 'A feeling or body clue is not proof. Ask kindly and check one fact.'
        : 'A wording or body-language cue is not a lie detector. Stress, fear, culture, neurodiversity, and memory can explain it.';
      return {
        name: text(person.name) || 'Unnamed person',
        cues: cues.length ? cues : ['no recorded cue'],
        summary: cues.length ? `${cues.join(', ')}. ${caveat}` : `No notable cue recorded. ${caveat}`,
        followUp: cues.length ? 'Ask for a free account, then compare it with an independent source.' : 'Record the person’s exact words and separate them from interpretation.'
      };
    });
  }

  function analyseTimeline(events) {
    const rows = (events || []).filter((event) => Array.isArray(event) && event.length >= 2);
    const out = [];
    const seen = new Map();
    rows.forEach(([time, what, source], index) => {
      const key = text(time).toLowerCase();
      if (seen.has(key)) out.push(signal('Repeated time entry', `${time} appears more than once (${seen.get(key)} and ${what}). Confirm whether these are separate events.`, 'important'));
      else seen.set(key, what);
      if (!text(source) || /unknown|unspecified/i.test(text(source))) out.push(signal('Un sourced timeline item', `${time}: ${what} has no clear source recorded.`, 'important'));
      if (index && text(rows[index - 1][0]) > text(time)) out.push(signal('Timeline ordering check', `${time} is listed before an earlier-looking time. Sort or verify the sequence.`, 'check'));
    });
    if (!rows.length) out.push(signal('Timeline is empty', 'Add observed events, estimated times, and sources before drawing a sequence.', 'important'));
    return out;
  }

  function compareEvidence(evidence, people, events) {
    const findings = [];
    const eText = allText(evidence, (item) => `${item.title} ${item.kind} ${item.detail}`);
    const pText = allText(people, (person) => `${person.name} ${person.role} ${person.note}`);
    const tText = allText(events, (event) => event.join(' '));
    if (/access|key|drawer|door|room|entry/.test(eText + pText + tText)) findings.push(signal('Access test', 'Map who could physically reach the relevant place, using records rather than assumptions.', 'check'));
    if (/left|departed|arrived|opened|moved|took|missing/.test(tText + pText)) findings.push(signal('Movement test', 'Confirm the smallest time window in which the change could have occurred.', 'check'));
    if (evidence.some((item) => /statement|witness|testimony/i.test(item.kind)) && !evidence.some((item) => /record|log|photo|video|camera|document|physical/i.test(item.kind))) findings.push(signal('Corroboration gap', 'Accounts are present without a separate record or physical source to compare them against.', 'important'));
    if (!findings.length) findings.push(signal('No automatic gap found', 'This is not a clean bill of health; continue checking source quality and alternative explanations.', 'check'));
    return findings;
  }

  function generateQuestions(state, mode) {
    const location = text(state.case && state.case.location) || 'the relevant place';
    const events = state.events || [];
    const first = events[0] && events[0][0];
    const last = events[events.length - 1] && events[events.length - 1][0];
    const qs = [
      `What is directly observed, and what is an interpretation?`,
      `Who or what can independently verify the period from ${first || 'the first event'} to ${last || 'the last event'}?`,
      `Who had legitimate access to ${location}, and who actually used it?`,
      'What evidence would distinguish the leading explanation from its strongest alternative?',
      'What fact, if discovered, would change the current working view?'
    ];
    if (mode === 'kids') return [
      'What did you see, hear, or touch yourself?',
      'What happened first, and what happened next?',
      'Can we check one kind fact before deciding who is responsible?',
      'Is there another safe explanation we should consider?'
    ];
    return qs;
  }

  function rankHypotheses(hypotheses, evidence) {
    const quality = (evidence || []).reduce((sum, item) => sum + observationQuality(item), 0);
    return (hypotheses || []).map(([name, existing], index) => ({
      name, existing: Number(existing) || 0,
      index, evidenceCoverage: Math.min(100, Math.round((quality * 8) + (100 - index * 15))),
      note: 'Working comparison only—not probability, guilt, or a prediction.'
    }));
  }

  function analyze(state, mode = 'professional') {
    const safe = state || {};
    const behaviour = assessBehaviour(safe.people, mode);
    const gaps = compareEvidence(safe.evidence || [], safe.people || [], safe.events || []);
    const timeline = analyseTimeline(safe.events || []);
    const hypotheses = rankHypotheses(safe.hypotheses || [], safe.evidence || []);
    return {
      headline: mode === 'kids' ? 'Gentle mystery guide' : 'Evidence-first intelligence review',
      status: mode === 'kids' ? 'Calm, fair, and curious' : 'Cautious and explainable',
      disclaimer: mode === 'kids' ? 'People can look worried or forget things without doing anything wrong.' : 'Behaviour and body language are context clues only. This tool cannot detect lies, diagnose traits, identify criminals, or replace emergency, safeguarding, legal, or professional help.',
      sections: [
        { heading: mode === 'kids' ? 'What we can check' : 'Case snapshot', items: [`${text(safe.case && safe.case.title) || 'Untitled case'}`, `${(safe.evidence || []).length} evidence item(s), ${(safe.events || []).length} timeline event(s), ${(safe.people || []).length} person record(s)`] },
        { heading: mode === 'kids' ? 'Kind conversation cues' : 'Behavioural observations', items: behaviour.map((item) => `${item.name}: ${item.summary}`) },
        { heading: 'Timeline checks', items: timeline.map((item) => `${item.label}: ${item.detail}`) },
        { heading: mode === 'kids' ? 'What to check next' : 'Access, corroboration, and scene checks', items: gaps.map((item) => `${item.label}: ${item.detail}`) },
        { heading: mode === 'kids' ? 'Gentle questions' : 'Decision-changing questions', items: generateQuestions(safe, mode) },
        { heading: 'Alternative explanations', items: hypotheses.length ? hypotheses.map((item) => `${item.name}: ${item.note}`) : ['Add two or more competing explanations before settling on one.'] }
      ],
      metrics: { evidenceQuality: Math.round(((safe.evidence || []).reduce((sum, item) => sum + observationQuality(item), 0) / Math.max(1, (safe.evidence || []).length * 4)) * 100), gaps: gaps.length, questions: generateQuestions(safe, mode).length }
    };
  }

  const api = { analyze, assessBehaviour, analyseTimeline, compareEvidence, generateQuestions, rankHypotheses };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ClarityIntelligence = api;
}(typeof window !== 'undefined' ? window : globalThis));
