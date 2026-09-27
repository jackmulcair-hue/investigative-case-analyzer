(function (global) {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function toText(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(' ');
    return String(value);
  }

  function analyzeBehavioralTraits(people, mode) {
    const list = Array.isArray(people) ? people : [];
    const output = [];

    list.forEach((person) => {
      const text = `${toText(person.name)} ${toText(person.role)} ${toText(person.note)}`.toLowerCase();
      const observations = [];
      let score = 0;

      if (/(not sure|don't know|can't remember|not certain|unclear|maybe)/.test(text)) {
        observations.push('uncertain language');
        score += 20;
      }
      if (/(i forgot|it was just|i thought|i assumed|probably|maybe|i guess)/.test(text)) {
        observations.push('evasive or self-correcting wording');
        score += 18;
      }
      if (/(angry|shouting|frustrated|defensive|sudden|panicked|nervous|overexplaining)/.test(text)) {
        observations.push('emotional intensity or defensive posture');
        score += 16;
      }
      if (/(i was there|no one saw|only me|everyone else|i had to|it had to be)/.test(text)) {
        observations.push('control-seeking or minimising language');
        score += 18;
      }
      if (/(avoided|didn't look|looked away|fidget|stopped|paused|silence|changed the subject)/.test(text)) {
        observations.push('possible discomfort, avoidance, or body-language discomfort');
        score += 16;
      }

      if (observations.length === 0) {
        observations.push('steady, consistent wording');
      }

      output.push({
        name: person.name || 'Unnamed person',
        risk: clamp(score, 0, 100),
        notes: observations.slice(0, 3),
        summary: observations.length
          ? `${person.name || 'This person'} shows ${observations.slice(0, 2).join(' and ')}. Treat this as an area for verification, not proof.`
          : `${person.name || 'This person'} is relatively calm and consistent; keep gathering independent corroboration.`,
      });
    });

    if (!output.length) {
      output.push({
        name: 'No people entered',
        risk: 0,
        notes: ['Add people to compare timelines and statements.'],
        summary: 'No behavioural signals are available yet.',
      });
    }

    return output;
  }

  function detectContradictions(events, evidence, people) {
    const contradictions = [];
    const eventText = (events || []).map((entry) => Array.isArray(entry) ? entry.join(' ') : '').join(' ').toLowerCase();
    const personText = (people || []).map((person) => `${person.name} ${person.role} ${person.note}`).join(' ').toLowerCase();
    const evidenceText = (evidence || []).map((item) => `${item.title} ${item.kind} ${item.detail} ${item.strength}`).join(' ').toLowerCase();

    if (/(key|access|drawer|cash|door|entry|room)/.test(personText) && /(opened|entered|left|accessed|took|moved)/.test(eventText) && !/(camera|log|security|lock|keys|signed)/.test(evidenceText)) {
      contradictions.push({
        title: 'Access route is not fully verified',
        detail: 'The timeline suggests access to a sensitive area, but there is still no independent confirmation of who was present and when.',
      });
    }

    if (/(left|departed|went home|left early|arrived|came back)/.test(eventText) && /(left at|left early|was still|was there)/.test(personText) && !/(verified|confirm|independent|camera|log)/.test(evidenceText)) {
      contradictions.push({
        title: 'Movement timeline needs corroboration',
        detail: 'At least one person describes travel or departure timing that has not yet been independently supported.',
      });
    }

    if ((evidence || []).length > 0 && (evidence || []).some((item) => /(statement|witness|testimony)/.test(item.kind)) && !(evidence || []).some((item) => /(photo|camera|record|log|document|receipt)/.test(item.kind))) {
      contradictions.push({
        title: 'Reliance on statements without physical corroboration',
        detail: 'Witness or spoken accounts are present, but a physical or documentary record is missing to triangulate the account.',
      });
    }

    if (!contradictions.length) {
      contradictions.push({
        title: 'No major contradiction detected yet',
        detail: 'The current record is still consistent; keep probing for independent verification rather than ending the inquiry early.',
      });
    }

    return contradictions.slice(0, 3);
  }

  function detectCrimeSceneSignals(evidence, events, caseInfo) {
    const sceneSignals = [];
    const evidenceText = (evidence || []).map((item) => `${item.title} ${item.kind} ${item.detail}`).join(' ').toLowerCase();
    const eventText = (events || []).map((entry) => Array.isArray(entry) ? entry.join(' ') : '').join(' ').toLowerCase();
    const locationText = toText(caseInfo && caseInfo.location).toLowerCase();

    if (/(door|lock|key|window|entry|exit|access|camera|cctv|alarm)/.test(evidenceText + ' ' + eventText + ' ' + locationText)) {
      sceneSignals.push('Access points and physical barriers should be checked to confirm who could have reached the scene.');
    }
    if (/(cash|item|object|missing|taken|stolen|damage|trace|fingerprint|footprint|blood|mark)/.test(evidenceText + ' ' + eventText)) {
      sceneSignals.push('The physical evidence should be examined for transfer, trace, or point-of-contact indicators.');
    }
    if (/(time|sequence|before|after|between|window)/.test(eventText)) {
      sceneSignals.push('Sequence of movement matters as much as motive; verify time windows before interpreting actions.');
    }
    if (!sceneSignals.length) {
      sceneSignals.push('No obvious crime-scene indicators are present yet; continue gathering direct evidence and independent timelines.');
    }

    return sceneSignals.slice(0, 3);
  }

  function buildSmartQuestions(people, events, evidence, caseInfo, mode) {
    const questions = [];
    const personNames = (people || []).map((person) => person.name).filter(Boolean);
    const timeHints = (events || []).slice(0, 2).map((entry) => Array.isArray(entry) ? entry[0] : '').filter(Boolean);
    const location = toText(caseInfo && caseInfo.location) || 'the location';

    questions.push(`Who had direct access to ${location} between ${timeHints[0] || 'the first relevant time'} and ${timeHints[1] || 'the next key time'}?`);
    questions.push('What independent record confirms the timeline: log, CCTV, witness, or document?');
    questions.push(`Which detail in ${personNames[0] || 'the main account'} is strongest, and which detail still needs corroboration?`);

    if ((evidence || []).length) {
      questions.push('What physical or documentary evidence remains untested or unchallenged?');
    }

    if (mode === 'kids') {
      questions.push('What did you see first, what changed next, and who was near the item when the change happened?');
      questions.push('Can we check one independent fact before deciding who is telling the truth?');
    }

    return questions.slice(0, 5);
  }

  function createAssessment(state, mode) {
    const behavioural = analyzeBehavioralTraits(state.people || [], mode);
    const contradictions = detectContradictions(state.events || [], state.evidence || [], state.people || []);
    const crimeScene = detectCrimeSceneSignals(state.evidence || [], state.events || [], state.case || {});
    const questions = buildSmartQuestions(state.people || [], state.events || [], state.evidence || [], state.case || {}, mode);

    const caseTitle = toText(state.case && state.case.title) || 'Untitled case';
    const headline = mode === 'kids'
      ? 'Gentle mystery check-in'
      : 'Balanced investigative intelligence';

    const sections = [
      {
        heading: mode === 'kids' ? 'What we know' : 'Evidence snapshot',
        items: [
          `Case: ${caseTitle}`,
          `Location: ${toText(state.case && state.case.location) || 'Not specified'}`,
          `Current direction: look for independent confirmation before drawing a conclusion.`,
        ],
      },
      {
        heading: mode === 'kids' ? 'Gentle behavioural cues' : 'Behavioural signals',
        items: behavioural.map((signal) => `${signal.name}: ${signal.summary}`),
      },
      {
        heading: mode === 'kids' ? 'Truth-checking prompts' : 'Contradictions and gaps',
        items: contradictions.map((item) => `${item.title}: ${item.detail}`),
      },
      {
        heading: mode === 'kids' ? 'Scene and access check' : 'Crime-scene and access check',
        items: crimeScene,
      },
      {
        heading: mode === 'kids' ? 'Next safe questions' : 'Next investigative questions',
        items: questions,
      },
    ];

    return {
      headline,
      status: mode === 'kids' ? 'Calm and fair' : 'Evidence-first and cautious',
      sections,
      summary: mode === 'kids'
        ? 'The goal is to understand what happened, not to assign blame quickly. Gather one fact, one witness, and one physical check before deciding.'
        : 'This assessment is designed to surface patterns, contradictions, and missing verification points without turning into a guilt score or assumption-driven conclusion.',
    };
  }

  function analyzeState(state, mode) {
    const safeState = state || {};
    return createAssessment(safeState, mode || 'professional');
  }

  const api = {
    analyze: analyzeState,
    analyzeBehavioralTraits,
    detectContradictions,
    detectCrimeSceneSignals,
    buildSmartQuestions,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.ClarityIntelligence = api;
}(typeof window !== 'undefined' ? window : globalThis));




















































































































