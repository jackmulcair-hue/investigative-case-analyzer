/* Clarity prototype test suite. Run with: node --test intelligence.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const intelligence = require('./intelligence.js');

test('behaviour cues are caveated and never treated as proof', () => {
  const result = intelligence.assessBehaviour([{ name: 'A', note: 'looked away and said maybe' }], 'professional');
  assert.match(result[0].summary, /not a lie detector/i);
});
test('timeline checks find missing sources', () => {
  const result = intelligence.analyseTimeline([['10:00', 'Item moved', '']]);
  assert.ok(result.some((item) => /source/i.test(item.label)));
});
test('question generator creates alternative-explanation prompts', () => {
  const result = intelligence.generateQuestions({ case: { location: 'kitchen' }, events: [] }, 'professional');
  assert.ok(result.some((question) => /alternative/i.test(question)));
});
test('complete analysis returns metrics and structured sections', () => {
  const result = intelligence.analyze({ case: { title: 'Cookies' }, evidence: [], events: [], people: [], hypotheses: [] }, 'kids');
  assert.equal(result.sections.length, 6);
  assert.equal(typeof result.metrics.evidenceQuality, 'number');
  assert.match(result.disclaimer, /worried|forget/i);
});
