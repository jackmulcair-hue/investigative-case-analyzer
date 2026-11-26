/* Clarity mission board — turns the case workspace into a guided investigation.
   Progress is derived from the recorded case, so it never invents findings. */
(function (global) {
  const list = (value) => (Array.isArray(value) ? value : []);
  const text = (value) => String(value ?? '').trim();

  const evidenceCount = (state) => list(state.evidence).filter((item) => text(item && item.title)).length;
  const allEvidenceTagged = (state) => {
    const items = list(state.evidence);
    return items.length > 0 && items.every((item) => text(item.kind) && text(item.strength));
  };
  const hasRecordedSource = (state) => list(state.evidence).some((item) =>
    /physical|document|record|photo|video|camera|log|receipt|forensic|fingerprint|dna/i.test(text(item && item.kind))
  );
  const allEventsSourced = (state) => {
    const events = list(state.events);
    return events.length > 0 && events.every((event) => {
      const source = text(Array.isArray(event) ? event[2] : '');
      return Boolean(source) && !/unknown|unspecified|n\/a/i.test(source);
    });
  };
  const hasIndependentSource = (state) => list(state.events).some((event) =>
    /record|log|document|statement|witness|photo|video|camera|receipt|entry/i.test(text(Array.isArray(event) ? event[2] : ''))
  );
  const peopleDetailed = (state) => {
    const people = list(state.people);
    return people.length > 0 && people.every((person) =>
      text(person.role) && text(person.note) && !/no notes yet/i.test(text(person.note))
    );
  };
  const answeredCount = (state) => list(state.answered).length;
  const flag = (state, name) => Boolean(state && state.milestones && state.milestones[name]);

  const MISSIONS = [
    {
      id: 'scene',
      title: 'Secure the Scene',
      kidTitle: 'Look Closely',
      icon: '🧤',
      method: 'Evidence collection',
      brief: 'Record what was found before deciding what it means. Tag each item with where it came from and how reliable it is.',
      kidBrief: 'Write down what you found. Do not guess what it means yet.',
      view: 'evidence',
      steps: (state) => [
        { label: 'Collect at least 3 evidence items', done: evidenceCount(state) >= 3 },
        { label: 'Tag every item with a type and reliability', done: allEvidenceTagged(state) },
        { label: 'Include a physical, documentary, or recorded source', done: hasRecordedSource(state) }
      ]
    },
    {
      id: 'timeline',
      title: 'Rebuild the Timeline',
      kidTitle: 'Put It in Order',
      icon: '⏱',
      method: 'Sequence reconstruction',
      brief: 'Anchor each event to a time and a source. Gaps in the sequence are clues, not conclusions.',
      kidBrief: 'What happened first, next, and last? Write down the time for each thing.',
      view: 'timeline',
      steps: (state) => [
        { label: 'Log at least 3 timed events', done: list(state.events).length >= 3 },
        { label: 'Give every event a named source', done: allEventsSourced(state) },
        { label: 'Include a witness, record, or document source', done: hasIndependentSource(state) }
      ]
    },
    {
      id: 'people',
      title: 'Interview & Map People',
      kidTitle: 'Ask Kindly',
      icon: '👥',
      method: 'Witness statements',
      brief: 'Capture who was where and what they said, in their own words—separate from interpretation.',
      kidBrief: 'Who was there? Write what each person saw or said.',
      view: 'timeline',
      steps: (state) => [
        { label: 'Record at least 2 people', done: list(state.people).length >= 2 },
        { label: 'Note each person’s role', done: peopleDetailed(state) },
        { label: 'Capture their account in the notes', done: peopleDetailed(state) }
      ]
    },
    {
      id: 'hypotheses',
      title: 'Test the Hypotheses',
      kidTitle: 'Try Other Ideas',
      icon: '🧪',
      method: 'Alternative explanation testing',
      brief: 'Hold two or more explanations at once and ask what evidence would separate them.',
      kidBrief: 'Could something else explain what happened? Keep more than one idea.',
      view: 'analysis',
      steps: (state) => [
        { label: 'Keep at least 2 competing explanations', done: list(state.hypotheses).length >= 2 },
        { label: 'Gather enough evidence to compare them', done: evidenceCount(state) >= 3 },
        { label: 'Review the analysis for gaps', done: flag(state, 'analysisReviewed') }
      ]
    },
    {
      id: 'gaps',
      title: 'Close the Gaps',
      kidTitle: 'Check the Facts',
      icon: '❓',
      method: 'Verification',
      brief: 'Answer the questions that would change the case, and add one of your own. Record what you learned.',
      kidBrief: 'Which questions can you check? Ask one more kind question.',
      view: 'questions',
      steps: (state) => [
        { label: 'Answer at least 2 verification questions', done: answeredCount(state) >= 2 },
        { label: 'Add one neutral question of your own', done: flag(state, 'addedQuestion') }
      ]
    },
    {
      id: 'report',
      title: 'File the Case Report',
      kidTitle: 'Share Fairly',
      icon: '📄',
      method: 'Neutral reporting',
      brief: 'Summarise the facts, the gaps, and the next safe step. No verdicts, no guilt scores.',
      kidBrief: 'Tell the story fairly: what you know, what you do not know, and what to do next.',
      view: 'report',
      steps: (state) => [
        { label: 'Review the neutral case report', done: flag(state, 'reportReviewed') },
        { label: 'Share or print the summary', done: flag(state, 'shared') }
      ]
    }
  ];

  const RANKS = [
    { min: 0, name: 'Rookie Detective', kidName: 'Junior Sleuth' },
    { min: 95, name: 'Field Agent', kidName: 'Fact Finder' },
    { min: 160, name: 'Scene Investigator', kidName: 'Clue Collector' },
    { min: 220, name: 'Case Detective', kidName: 'Fair-Play Detective' },
    { min: 300, name: 'Lead Investigator', kidName: 'Truth Champion' }
  ];

  function xp(state) {
    return evidenceCount(state) * 10
      + list(state.events).length * 8
      + list(state.people).length * 6
      + list(state.hypotheses).length * 4
      + answeredCount(state) * 12
      + (flag(state, 'analysisReviewed') ? 15 : 0)
      + (flag(state, 'addedQuestion') ? 10 : 0)
      + (flag(state, 'reportReviewed') ? 15 : 0)
      + (flag(state, 'shared') ? 20 : 0);
  }

  function evaluate(state) {
    const missions = MISSIONS.map((def) => {
      const steps = def.steps(state).map((step) => ({ label: step.label, done: Boolean(step.done) }));
      const done = steps.filter((step) => step.done).length;
      return {
        id: def.id,
        title: def.title,
        kidTitle: def.kidTitle,
        icon: def.icon,
        method: def.method,
        brief: def.brief,
        kidBrief: def.kidBrief,
        view: def.view,
        steps,
        done,
        complete: done === steps.length,
        percent: Math.round((done / Math.max(1, steps.length)) * 100)
      };
    });
    const completed = missions.filter((mission) => mission.complete).length;
    const totalXp = xp(state);
    const rank = [...RANKS].reverse().find((entry) => totalXp >= entry.min) || RANKS[0];
    const nextRank = RANKS.find((entry) => entry.min > totalXp) || null;
    return {
      missions,
      completed,
      total: missions.length,
      percent: Math.round((completed / Math.max(1, missions.length)) * 100),
      xp: totalXp,
      rank,
      nextRank,
      nextMission: missions.find((mission) => !mission.complete) || null
    };
  }

  global.ClarityMissions = { MISSIONS, RANKS, evaluate, xp };
}(typeof window !== 'undefined' ? window : globalThis));
