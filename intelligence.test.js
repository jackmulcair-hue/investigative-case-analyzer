const test = require('node:test');
const assert = require('node:assert/strict');
const intelligence = require('./intelligence.js');

test('behavioral analysis flags evasive wording', () => {
  const result = intelligence.analyzeBehavioralTraits([
    { name: 'Alex', role: 'Staff', note: 'I forgot and I thought it was probably fine.' },
    { name: 'Sam', role: 'Witness', note: 'I saw everything clearly.' }
  ], 'professional');

  assert.ok(result[0].risk >= 30);
  assert.match(result[0].summary, /evasive|uncertain|defensive|control/i);
});

test('contradictions are surfaced when access and timing are not independently confirmed', () => {
  const contradictions = intelligence.detectContradictions(
    [
      ['14:05', 'Alex says they leave early', 'Statement'],
      ['14:10', 'Cash drawer reportedly opened', 'Witness statement']
    ],
    [
      { title: 'Front desk statement', kind: 'Statement', detail: 'Cash looked present', strength: 'Moderate' }
    ],
    [
      { name: 'Alex', role: 'Staff', note: 'Had key access and left at 14:05.' }
    ]
  );

  assert.ok(contradictions.length >= 1);
  assert.match(contradictions[0].title, /Access|Movement|Reliance/i);
});

test('kids mode produces gentle, action-oriented questions', () => {
  const questions = intelligence.buildSmartQuestions(
    [{ name: 'Alex', role: 'Staff', note: 'I left at 14:05.' }],
    [['14:05', 'Left early', 'statement']],
    [{ title: 'Entry log', kind: 'Record', detail: 'someone moved near reception', strength: 'Moderate' }],
    { location: 'kitchen' },
    'kids'
  );

  assert.ok(questions.some((q) => /what did you see first|independent fact|near the/i.test(q.toLowerCase())));
});

test('full analysis returns structured sections for a case', () => {
  const analysis = intelligence.analyze({
    case: { title: 'Missing cookies', location: 'kitchen', summary: 'Cookies vanished after school.' },
    people: [{ name: 'Child A', role: 'Student', note: 'I forgot and thought I heard a crunch.' }],
    evidence: [{ title: 'Crumbs', kind: 'Physical', detail: 'Chocolate on the table', strength: 'Moderate' }],
    events: [['15:00', 'Cookies seen on plate', 'Observation'], ['15:20', 'Plate is empty', 'Observation']],
  }, 'professional');

  assert.ok(analysis.sections.length >= 4);
  assert.ok(typeof analysis.summary === 'string');
});
