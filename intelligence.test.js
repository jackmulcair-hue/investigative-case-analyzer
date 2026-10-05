/* Clarity intelligence test suite. Run with: node --test intelligence.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const intel = require('./intelligence.js');

test('keywords extracts significant words and ignores stop words', () => {
  const kw = intel.keywords('The cash was missing from the drawer');
  assert.ok(kw.includes('cash'));
  assert.ok(kw.includes('missing'));
  assert.ok(kw.includes('drawer'));
  assert.ok(!kw.includes('the'));
  assert.ok(!kw.includes('was'));
});

test('overlap counts shared keywords', () => {
  const score = intel.overlap('cash missing from drawer', 'cash drawer was empty');
  assert.ok(score >= 2);
});

test('evidenceQuality scores verified sources higher', () => {
  assert.ok(intel.evidenceQuality({ kind: 'CCTV record', strength: 'strong' }) >= 4);
  assert.ok(intel.evidenceQuality({ kind: 'hearsay', strength: 'weak' }) <= 1);
});

test('classifyInformation separates facts, observations, and assumptions', () => {
  const result = intel.classifyInformation({
    evidence: [
      { title: 'CCTV', kind: 'camera record', strength: 'strong', detail: 'Shows entry at 14:07' },
      { title: 'Statement', kind: 'witness statement', strength: 'moderate', detail: 'Saw nothing unusual' },
    ],
    events: [{ time: '14:00', description: 'Door opened', source: '', verified: false }],
    knownFacts: [{ text: 'Float was £500', source: 'handover sheet' }],
    hypotheses: [{ id: 'h1', text: 'Cash misplaced', confidence: 85 }],
    unknowns: [{ text: 'Who was in the room', priority: 'high' }],
    ruledOut: [{ text: 'Burglary', reason: 'No forced entry' }],
  });
  assert.ok(result.confirmedFacts.length >= 2);
  assert.ok(result.observations.length >= 1);
  assert.ok(result.assumptions.length >= 1);
  assert.ok(result.unknowns.length >= 1);
});

test('evaluateHypotheses assigns confidence and ranks them', () => {
  const result = intel.evaluateHypotheses({
    hypotheses: [
      { id: 'h1', text: 'Cash was misplaced during handover', supports: [], contradicts: [] },
      { id: 'h2', text: 'Cash was taken by someone with access', supports: [], contradicts: [] },
    ],
    evidence: [
      { id: 'e1', title: 'Handover sheet', kind: 'document', strength: 'strong', detail: 'Cash was counted and signed for' },
      { id: 'e2', title: 'Access log', kind: 'record', strength: 'moderate', detail: 'Someone with access entered after handover' },
    ],
  });
  assert.equal(result.length, 2);
  assert.ok(result[0].confidence >= result[1].confidence);
  assert.ok(result[0].confidence >= 5 && result[0].confidence <= 95);
});

test('detectContradictions finds conflicting evidence', () => {
  const result = intel.detectContradictions({
    evidence: [
      { title: 'A', kind: 'statement', strength: 'moderate', detail: 'The door was not locked' },
      { title: 'B', kind: 'record', strength: 'strong', detail: 'The door was locked at all times' },
    ],
    events: [],
    statements: [],
  });
  assert.ok(result.length >= 1);
});

test('detectContradictions finds duplicate timeline entries', () => {
  const result = intel.detectContradictions({
    events: [
      { time: '14:00', description: 'Person A entered', source: 'log' },
      { time: '14:00', description: 'Person B entered', source: 'log' },
    ],
    evidence: [],
    statements: [],
  });
  assert.ok(result.some((c) => /14:00/.test(c.text)));
});

test('detectBias flags confirmation bias when one hypothesis dominates', () => {
  const result = intel.detectBias({
    evidence: [
      { title: 'E1', kind: 'record', strength: 'strong', detail: 'supports theory A' },
      { title: 'E2', kind: 'record', strength: 'strong', detail: 'supports theory A' },
      { title: 'E3', kind: 'record', strength: 'strong', detail: 'supports theory A' },
    ],
    hypotheses: [
      { id: 'h1', text: 'Theory A is correct', supports: [], contradicts: [] },
      { id: 'h2', text: 'Theory B is correct', supports: [], contradicts: [] },
    ],
    events: [],
    people: [],
  });
  assert.ok(result.length >= 1);
});

test('findConnections links people to events and evidence', () => {
  const result = intel.findConnections({
    people: [{ name: 'Alex', role: 'staff', note: '' }],
    events: [{ time: '14:00', description: 'Alex entered the room', source: 'log' }],
    evidence: [{ title: 'Log', kind: 'record', strength: 'strong', detail: 'Alex signed in' }],
    locations: [],
    objects: [],
  });
  assert.ok(result.some((c) => c.type === 'person-event'));
  assert.ok(result.some((c) => c.type === 'person-evidence'));
});

test('generateQuestions prioritises distinguishing between close hypotheses', () => {
  const result = intel.generateQuestions({
    hypotheses: [
      { id: 'h1', text: 'Explanation A', supports: [], contradicts: [] },
      { id: 'h2', text: 'Explanation B', supports: [], contradicts: [] },
    ],
    evidence: [],
    events: [],
    people: [],
    statements: [],
    unknowns: [],
    questions: [],
  });
  assert.ok(result.length > 0);
});

test('analyze returns all 12 sections with metrics', () => {
  const result = intel.analyze({
    title: 'Test Case',
    whatHappened: 'Something happened',
    evidence: [{ id: 'e1', title: 'Photo', kind: 'photo', strength: 'strong', detail: 'Shows the scene' }],
    events: [{ time: '12:00', description: 'Event occurred', source: 'log', verified: true }],
    people: [{ name: 'Witness', role: 'witness', note: 'Saw something' }],
    hypotheses: [
      { id: 'h1', text: 'Explanation A', supports: ['e1'], contradicts: [] },
      { id: 'h2', text: 'Explanation B', supports: [], contradicts: [] },
    ],
    knownFacts: [{ text: 'It was daytime', source: 'observation' }],
    unknowns: [{ text: 'Who was present', priority: 'high' }],
  }, 'professional');
  assert.equal(result.sections.length, 12);
  assert.equal(typeof result.metrics.evidenceQuality, 'number');
  assert.ok(result.mostLikely);
  assert.match(result.disclaimer, /not proof/i);
});

test('kids mode disclaimer is gentle', () => {
  const result = intel.analyze({}, 'kids');
  assert.match(result.disclaimer, /wrong|kindly/i);
});
