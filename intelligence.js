/* Clarity Intelligence — critical-thinking investigation engine.
 * Emulates sceptical, analytical, evidence-driven reasoning.
 * Identifies facts vs assumptions, contradictions, missing information,
 * alternative explanations, confirmation bias, and overlooked connections.
 * Confidence is an assessment of evidence support — never proof. */
(function (global) {
  const text = (v) => String(v ?? '').trim();
  const lower = (v) => text(v).toLowerCase();
  const allText = (items, mapper) => (items || []).map(mapper).join(' ').toLowerCase();

  const STOP_WORDS = new Set(['the','a','an','is','was','were','are','been','being','to','of','in','on','at','by','for','with','from','that','this','it','as','be','or','and','not','but','if','then','so','do','did','does','has','had','have','can','could','would','should','will','what','when','where','who','whom','which','why','how','about','into','through','during','before','after','above','below','up','down','out','off','over','under','again','further','once','here','there','all','any','both','each','few','more','most','other','some','such','no','nor','only','own','same','than','too','very','just','also','said','says','one','two','they','them','their','he','she','his','her','its','our','your','my','me','him','we','us','i','you']);

  function keywords(str) {
    const words = lower(str).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    return [...new Set(words)];
  }

  function overlap(a, b) {
    const ka = new Set(keywords(a));
    const kb = keywords(b);
    return kb.filter((w) => ka.has(w)).length;
  }

  function evidenceQuality(item) {
    const kind = lower(item && item.kind);
    const strength = lower(item && item.strength);
    let score = strength === 'strong' ? 3 : strength === 'weak' ? 1 : 2;
    if (/photo|video|camera|cctv|record|log|document|receipt|physical|forensic|dna|fingerprint/.test(kind)) score += 1;
    if (/statement|rumour|memory|hearsay|opinion|guess/.test(kind)) score -= 1;
    return Math.max(1, Math.min(4, score));
  }

  function isVerifiedSource(item) {
    const kind = lower(item && item.kind);
    return /record|log|document|receipt|photo|video|camera|cctv|physical|forensic|dna|fingerprint|gps|data|sensor|alarm/.test(kind);
  }

  function isObservation(item) {
    const kind = lower(item && item.kind);
    return /statement|witness|testimony|observation|account|memory|recall/.test(kind);
  }

  // ─── Contradiction detection ───
  function detectContradictions(state) {
    const contradictions = [];
    const evidence = state.evidence || [];
    const statements = state.statements || [];
    const events = state.events || [];

    // Explicit contradictions from user
    (state.contradictions || []).forEach((c) => {
      contradictions.push({ text: c.text || c, items: c.items || [], source: 'user-flagged' });
    });

    // Timeline: same time, different events
    const timeMap = new Map();
    events.forEach((ev) => {
      const t = lower(ev.time);
      if (!t) return;
      if (!timeMap.has(t)) timeMap.set(t, []);
      timeMap.get(t).push(ev);
    });
    timeMap.forEach((evs, t) => {
      if (evs.length > 1) {
        const descs = evs.map((e) => e.description).join(' vs ');
        contradictions.push({
          text: `Two events recorded at ${evs[0].time}: ${descs}`,
          items: evs.map((e) => e.description),
          source: 'timeline',
        });
      }
    });

    // Evidence contradictions: items mentioning same entities but conflicting
    for (let i = 0; i < evidence.length; i++) {
      for (let j = i + 1; j < evidence.length; j++) {
        const a = evidence[i], b = evidence[j];
        if (overlap(a.detail + ' ' + a.title, b.detail + ' ' + b.title) >= 2) {
          // Check for negation patterns
          const aText = lower(a.detail);
          const bText = lower(b.detail);
          const aNeg = /\b(not|no|never|didn't|did not|absent|missing|gone|left|denies|refutes)\b/.test(aText);
          const bNeg = /\b(not|no|never|didn't|did not|absent|missing|gone|left|denies|refutes)\b/.test(bText);
          if (aNeg !== bNeg && aNeg !== undefined) {
            // One affirms, one denies — possible contradiction
            const shared = keywords(a.detail + ' ' + a.title).filter((w) => keywords(b.detail + ' ' + b.title).includes(w));
            if (shared.length >= 2) {
              contradictions.push({
                text: `"${a.title}" and "${b.title}" may conflict on: ${shared.join(', ')}`,
                items: [a.detail, b.detail],
                source: 'evidence-pair',
              });
            }
          }
        }
      }
    }

    // Statements vs evidence conflicts
    statements.forEach((stmt) => {
      const stmtText = lower(stmt.text);
      const stmtNeg = /\b(not|no|never|didn't|did not|absent|missing|gone|left|denies)\b/.test(stmtText);
      evidence.forEach((ev) => {
        if (overlap(stmt.text, ev.detail + ' ' + ev.title) >= 2) {
          const evNeg = /\b(not|no|never|didn't|did not|absent|missing|gone|left|denies)\b/.test(lower(ev.detail));
          if (stmtNeg !== evNeg) {
            contradictions.push({
              text: `Statement by ${stmt.person || 'unknown'} may conflict with evidence "${ev.title}"`,
              items: [stmt.text, ev.detail],
              source: 'statement-vs-evidence',
            });
          }
        }
      });
    });

    return contradictions;
  }

  // ─── Fact / assumption / observation classification ───
  function classifyInformation(state) {
    const confirmedFacts = [];
    const observations = [];
    const assumptions = [];
    const unknowns = [];

    // Explicit known facts
    (state.knownFacts || []).forEach((f) => {
      confirmedFacts.push({ text: f.text || f, source: f.source || 'user-confirmed', type: 'known-fact' });
    });

    // Evidence classification
    (state.evidence || []).forEach((item) => {
      const entry = {
        text: `${item.title}: ${item.detail}`,
        source: item.kind || 'unspecified',
        type: 'evidence',
        quality: evidenceQuality(item),
      };
      if (isVerifiedSource(item) && (lower(item.strength) === 'strong' || lower(item.strength) === 'moderate')) {
        confirmedFacts.push(entry);
      } else if (isObservation(item)) {
        observations.push(entry);
      } else {
        confirmedFacts.push(entry);
      }
    });

    // Events classification
    (state.events || []).forEach((ev) => {
      const entry = {
        text: `${ev.time}: ${ev.description}`,
        source: ev.source || 'unspecified',
        type: 'event',
      };
      if (ev.verified) confirmedFacts.push(entry);
      else observations.push(entry);
    });

    // Statements
    (state.statements || []).forEach((stmt) => {
      observations.push({
        text: `${stmt.person || 'Unknown'}: ${stmt.text}`,
        source: 'statement',
        type: 'statement',
      });
    });

    // Assumptions: hypotheses treated as established, or claims without sources
    (state.hypotheses || []).forEach((h) => {
      if (h.confidence && h.confidence > 80) {
        assumptions.push({
          text: `Hypothesis treated as near-certain (${h.confidence}%): "${h.text}"`,
          source: 'high-confidence-hypothesis',
          type: 'assumption',
        });
      }
    });

    // Events/evidence without sources → assumptions
    (state.events || []).forEach((ev) => {
      if (!text(ev.source) || /unknown|unspecified/i.test(ev.source)) {
        assumptions.push({
          text: `Timeline event without a source: "${ev.time}: ${ev.description}"`,
          source: 'unsourced',
          type: 'assumption',
        });
      }
    });

    // Explicit unknowns
    (state.unknowns || []).forEach((u) => {
      unknowns.push({ text: u.text || u, priority: u.priority || 'medium', type: 'user-flagged' });
    });

    // Ruled out
    (state.ruledOut || []).forEach((r) => {
      assumptions.push({
        text: `Ruled out: "${r.text || r}" — ${r.reason || 'no reason given'}`,
        source: 'ruled-out',
        type: 'ruled-out',
      });
    });

    return { confirmedFacts, observations, assumptions, unknowns };
  }

  // ─── Hypothesis evaluation ───
  function evaluateHypotheses(state) {
    const hypotheses = (state.hypotheses || []).map((h) => ({
      id: h.id,
      text: h.text,
      evidenceFor: [],
      evidenceAgainst: [],
      confidence: 0,
      notes: h.notes || '',
    }));

    if (!hypotheses.length) return [];

    const allEvidence = state.evidence || [];
    const allEvents = state.events || [];
    const allStatements = state.statements || [];
    const allPeople = state.people || [];

    hypotheses.forEach((h) => {
      const hText = h.text;

      // Explicitly linked evidence
      const linked = (state.hypotheses || []).find((orig) => orig.id === h.id);
      if (linked) {
        (linked.supports || []).forEach((eid) => {
          const ev = allEvidence.find((e) => e.id === eid);
          if (ev) h.evidenceFor.push({ text: `${ev.title}: ${ev.detail}`, quality: evidenceQuality(ev), reason: 'explicitly linked' });
        });
        (linked.contradicts || []).forEach((eid) => {
          const ev = allEvidence.find((e) => e.id === eid);
          if (ev) h.evidenceAgainst.push({ text: `${ev.title}: ${ev.detail}`, quality: evidenceQuality(ev), reason: 'explicitly linked' });
        });
      }

      // Keyword-matched evidence
      allEvidence.forEach((ev) => {
        if (linked && ((linked.supports || []).includes(ev.id) || (linked.contradicts || []).includes(ev.id))) return;
        const score = overlap(hText, ev.title + ' ' + ev.detail);
        if (score >= 2) {
          // Determine if it supports or contradicts
          const evNeg = /\b(not|no|never|didn't|did not|absent|missing|gone|left|denies|refutes|contradicts)\b/.test(lower(ev.detail));
          const hNeg = /\b(not|no|never|didn't|did not|absent|missing|gone|left|denies|refutes)\b/.test(lower(hText));
          if (evNeg !== hNeg) {
            h.evidenceAgainst.push({ text: `${ev.title}: ${ev.detail}`, quality: evidenceQuality(ev), reason: 'keyword match (conflicting)' });
          } else {
            h.evidenceFor.push({ text: `${ev.title}: ${ev.detail}`, quality: evidenceQuality(ev), reason: 'keyword match' });
          }
        }
      });

      // Keyword-matched events
      allEvents.forEach((ev) => {
        const score = overlap(hText, ev.description);
        if (score >= 2) {
          h.evidenceFor.push({ text: `Event ${ev.time}: ${ev.description}`, quality: ev.verified ? 3 : 2, reason: 'timeline match' });
        }
      });

      // Keyword-matched statements
      allStatements.forEach((stmt) => {
        const score = overlap(hText, stmt.text);
        if (score >= 2) {
          h.evidenceFor.push({ text: `Statement by ${stmt.person}: ${stmt.text}`, quality: 2, reason: 'statement match' });
        }
      });

      // Confidence calculation
      const forScore = h.evidenceFor.reduce((sum, e) => sum + e.quality, 0);
      const againstScore = h.evidenceAgainst.reduce((sum, e) => sum + e.quality, 0);
      const totalEvidence = forScore + againstScore;
      let confidence;
      if (totalEvidence === 0) {
        confidence = 50;
      } else {
        confidence = Math.round(50 + ((forScore - againstScore) / totalEvidence) * 45);
      }
      // Multiple independent sources boost confidence slightly
      const sources = new Set(h.evidenceFor.map((e) => e.text.split(':')[0]));
      if (sources.size >= 3) confidence += 5;
      // Clamp: never 0 or 100
      h.confidence = Math.max(5, Math.min(95, confidence));
    });

    // Sort by confidence
    hypotheses.sort((a, b) => b.confidence - a.confidence);

    return hypotheses;
  }

  // ─── Bias detection ───
  function detectBias(state) {
    const biases = [];
    const evidence = state.evidence || [];
    const hypotheses = state.hypotheses || [];
    const people = state.people || [];

    // Confirmation bias: one hypothesis dominates, alternatives underexplored
    if (hypotheses.length >= 2) {
      const evaluated = evaluateHypotheses(state);
      const top = evaluated[0];
      const rest = evaluated.slice(1);
      if (top && rest.length) {
        const avgRest = rest.reduce((s, h) => s + h.confidence, 0) / rest.length;
        if (top.confidence - avgRest > 30) {
          biases.push({
            type: 'Confirmation bias',
            detail: `The leading explanation ("${top.text}") dominates at ${top.confidence}%. Alternatives average only ${Math.round(avgRest)}%. Actively seek evidence that would disprove the leading explanation.`,
            severity: top.confidence - avgRest > 45 ? 'high' : 'medium',
          });
        }
      }
    }

    // Single-source dependency
    if (evidence.length >= 3) {
      const sourceCounts = {};
      evidence.forEach((e) => {
        const src = lower(e.kind) || 'unspecified';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });
      const total = evidence.length;
      Object.entries(sourceCounts).forEach(([src, count]) => {
        if (count / total > 0.7 && src !== 'unspecified') {
          biases.push({
            type: 'Single-source dependency',
            detail: `${Math.round((count / total) * 100)}% of evidence comes from "${src}" sources. Seek independent corroboration.`,
            severity: 'medium',
          });
        }
      });
    }

    // False assumptions: events without sources
    const unsourced = (state.events || []).filter((ev) => !text(ev.source) || /unknown|unspecified/i.test(ev.source));
    if (unsourced.length > 0) {
      biases.push({
        type: 'Unverified claims',
        detail: `${unsourced.length} timeline event(s) have no recorded source. These may be assumptions treated as facts.`,
        severity: unsourced.length > 2 ? 'high' : 'medium',
      });
    }

    // Overlooked evidence: evidence not linked to any hypothesis
    if (hypotheses.length > 0 && evidence.length > 0) {
      const allLinked = new Set();
      hypotheses.forEach((h) => {
        (h.supports || []).forEach((id) => allLinked.add(id));
        (h.contradicts || []).forEach((id) => allLinked.add(id));
      });
      const unlinked = evidence.filter((e) => !allLinked.has(e.id));
      if (unlinked.length > 0) {
        biases.push({
          type: 'Overlooked evidence',
          detail: `${unlinked.length} evidence item(s) not linked to any hypothesis: ${unlinked.map((e) => e.title).join(', ')}. Consider how they fit.`,
          severity: 'low',
        });
      }
    }

    // Coincidence flag: multiple people at same location/time
    if (people.length >= 3) {
      const roles = people.map((p) => lower(p.role));
      if (roles.filter((r) => /witness|staff|volunteer|present|nearby/.test(r)).length >= 3) {
        biases.push({
          type: 'Possible coincidence',
          detail: 'Multiple people were present in the same area. Their accounts may align by coincidence rather than shared knowledge. Compare independent details.',
          severity: 'low',
        });
      }
    }

    return biases;
  }

  // ─── Connection finding ───
  function findConnections(state) {
    const connections = [];
    const people = state.people || [];
    const events = state.events || [];
    const evidence = state.evidence || [];
    const locations = state.locations || [];
    const objects = state.objects || [];

    // People mentioned in events
    events.forEach((ev) => {
      people.forEach((p) => {
        if (lower(ev.description).includes(lower(p.name)) && lower(p.name).length > 2) {
          connections.push({
            text: `${p.name} appears in event: "${ev.description}" (${ev.time})`,
            type: 'person-event',
          });
        }
      });
    });

    // People mentioned in evidence
    evidence.forEach((ev) => {
      people.forEach((p) => {
        if (lower(ev.detail + ' ' + ev.title).includes(lower(p.name)) && lower(p.name).length > 2) {
          connections.push({
            text: `${p.name} referenced in evidence: "${ev.title}"`,
            type: 'person-evidence',
          });
        }
      });
    });

    // Locations in events
    events.forEach((ev) => {
      locations.forEach((loc) => {
        if (lower(ev.description).includes(lower(loc.name)) && lower(loc.name).length > 2) {
          connections.push({
            text: `Location "${loc.name}" appears in event: "${ev.description}"`,
            type: 'location-event',
          });
        }
      });
    });

    // Objects in evidence
    evidence.forEach((ev) => {
      objects.forEach((obj) => {
        if (lower(ev.detail + ' ' + ev.title).includes(lower(obj.name)) && lower(obj.name).length > 2) {
          connections.push({
            text: `Object "${obj.name}" referenced in evidence: "${ev.title}"`,
            type: 'object-evidence',
          });
        }
      });
    });

    // Shared keywords between unrelated evidence
    for (let i = 0; i < evidence.length; i++) {
      for (let j = i + 1; j < evidence.length; j++) {
        const score = overlap(evidence[i].detail, evidence[j].detail);
        if (score >= 3) {
          connections.push({
            text: `Evidence "${evidence[i].title}" and "${evidence[j].title}" share ${score} key concepts — may be related.`,
            type: 'evidence-evidence',
          });
        }
      }
    }

    // Deduplicate
    const seen = new Set();
    return connections.filter((c) => {
      if (seen.has(c.text)) return false;
      seen.add(c.text);
      return true;
    });
  }

  // ─── Intelligent questioning ───
  function generateQuestions(state) {
    const questions = [];
    const evaluated = evaluateHypotheses(state);
    const contradictions = detectContradictions(state);
    const classified = classifyInformation(state);

    // If two top hypotheses are close, ask what would distinguish them
    if (evaluated.length >= 2 && evaluated[0].confidence - evaluated[1].confidence < 15) {
      questions.push({
        text: `What single piece of evidence would distinguish "${evaluated[0].text}" from "${evaluated[1].text}"?`,
        priority: 'high',
        reason: 'Top two explanations are close in confidence.',
      });
    }

    // For each contradiction, ask how to resolve it
    contradictions.slice(0, 3).forEach((c) => {
      questions.push({
        text: `How can this contradiction be resolved: ${c.text}?`,
        priority: 'high',
        reason: 'Unresolved contradiction.',
      });
    });

    // For the leading hypothesis, what unverified claim is it most dependent on?
    if (evaluated.length > 0) {
      const top = evaluated[0];
      const weakSupport = top.evidenceFor.filter((e) => e.quality <= 2);
      if (weakSupport.length > 0) {
        questions.push({
          text: `The leading explanation relies on: "${weakSupport[0].text}". Can this be independently verified?`,
          priority: 'high',
          reason: 'Leading explanation depends on weak evidence.',
        });
      }
    }

    // Missing information
    classified.unknowns.slice(0, 3).forEach((u) => {
      questions.push({
        text: u.text,
        priority: u.priority || 'medium',
        reason: 'User-identified unknown.',
      });
    });

    // General critical-thinking questions
    if (state.people && state.people.length > 0) {
      questions.push({
        text: 'What is directly observed versus what is inferred from observation?',
        priority: 'medium',
        reason: 'Core sceptical check.',
      });
    }
    if (state.events && state.events.length > 1) {
      questions.push({
        text: 'Could the timeline have gaps that change the sequence of events?',
        priority: 'medium',
        reason: 'Timeline completeness.',
      });
    }
    if (evaluated.length > 0) {
      questions.push({
        text: 'What fact, if discovered, would change the current leading explanation?',
        priority: 'high',
        reason: 'Falsification test.',
      });
    }
    if (state.ruledOut && state.ruledOut.length > 0) {
      questions.push({
        text: 'Were any ruled-out explanations dismissed too early? What would reopen them?',
        priority: 'medium',
        reason: 'Re-examination of dismissed options.',
      });
    }

    // User questions not yet answered
    (state.questions || []).filter((q) => !q.answered).forEach((q) => {
      questions.push({
        text: q.text,
        priority: q.priority || 'medium',
        reason: 'User-posed question.',
      });
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    questions.sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1));

    return questions;
  }

  // ─── What would change the conclusion ───
  function whatWouldChange(state) {
    const items = [];
    const evaluated = evaluateHypotheses(state);

    if (evaluated.length === 0) return ['Add at least two competing explanations to identify what would change the conclusion.'];

    const top = evaluated[0];
    const alternatives = evaluated.slice(1);

    // What evidence against the top hypothesis would weaken it
    if (top.evidenceAgainst.length === 0) {
      items.push(`No evidence currently contradicts "${top.text}". Finding any would significantly change the analysis.`);
    } else {
      items.push(`"${top.text}" already has ${top.evidenceAgainst.length} piece(s) of contradicting evidence. More would shift the balance.`);
    }

    // What would boost alternatives
    alternatives.slice(0, 2).forEach((alt) => {
      items.push(`If evidence emerged supporting "${alt.text}" (currently ${alt.confidence}%), it could overtake the leading explanation.`);
    });

    // Unverified claims
    const unverified = (state.events || []).filter((ev) => !ev.verified && (!text(ev.source) || /unknown|unspecified/i.test(ev.source)));
    if (unverified.length > 0) {
      items.push(`Verifying the ${unverified.length} unverified timeline event(s) could reshape the sequence.`);
    }

    // Unknowns
    (state.unknowns || []).slice(0, 2).forEach((u) => {
      items.push(`Resolving unknown: "${u.text || u}"`);
    });

    return items;
  }

  // ─── Next best actions ───
  function nextActions(state) {
    const actions = [];
    const evaluated = evaluateHypotheses(state);
    const contradictions = detectContradictions(state);
    const biases = detectBias(state);
    const classified = classifyInformation(state);

    // Resolve contradictions first
    if (contradictions.length > 0) {
      actions.push(`Resolve ${contradictions.length} contradiction(s) — these directly undermine the analysis.`);
    }

    // Verify weak evidence supporting the leading hypothesis
    if (evaluated.length > 0) {
      const weak = evaluated[0].evidenceFor.filter((e) => e.quality <= 2);
      if (weak.length > 0) {
        actions.push(`Independently verify the weakest support for the leading explanation: "${weak[0].text.split(':')[0]}".`);
      }
    }

    // Address high-priority unknowns
    const highUnknowns = classified.unknowns.filter((u) => u.priority === 'high');
    if (highUnknowns.length > 0) {
      actions.push(`Investigate the highest-priority unknown: "${highUnknowns[0].text}".`);
    }

    // Seek disconfirming evidence
    if (evaluated.length > 0 && evaluated[0].evidenceAgainst.length === 0) {
      actions.push(`Actively seek evidence that would disprove "${evaluated[0].text}" — none has been found yet.`);
    }

    // Add alternatives if only one hypothesis
    if (evaluated.length < 2) {
      actions.push('Add at least one alternative explanation to avoid fixation on a single theory.');
    }

    // Address biases
    const highBias = biases.filter((b) => b.severity === 'high');
    if (highBias.length > 0) {
      actions.push(`Address ${highBias.length} high-severity bias risk(s): ${highBias.map((b) => b.type).join(', ')}.`);
    }

    // Source gaps
    const unsourced = (state.events || []).filter((ev) => !text(ev.source) || /unknown|unspecified/i.test(ev.source));
    if (unsourced.length > 0) {
      actions.push(`Identify sources for ${unsourced.length} unsourced timeline event(s).`);
    }

    // Link unlinked evidence
    if (evaluated.length > 0) {
      const allLinked = new Set();
      (state.hypotheses || []).forEach((h) => {
        (h.supports || []).forEach((id) => allLinked.add(id));
        (h.contradicts || []).forEach((id) => allLinked.add(id));
      });
      const unlinked = (state.evidence || []).filter((e) => !allLinked.has(e.id));
      if (unlinked.length > 0) {
        actions.push(`Link ${unlinked.length} unlinked evidence item(s) to relevant hypotheses.`);
      }
    }

    if (actions.length === 0) {
      actions.push('Continue gathering evidence and refining hypotheses. The investigation is developing well.');
    }

    return actions;
  }

  // ─── Main analysis ───
  function analyze(state, mode) {
    mode = mode || 'professional';
    const safe = state || {};
    const classified = classifyInformation(safe);
    const contradictions = detectContradictions(safe);
    const evaluated = evaluateHypotheses(safe);
    const biases = detectBias(safe);
    const connections = findConnections(safe);
    const questions = generateQuestions(safe);
    const changeItems = whatWouldChange(safe);
    const actions = nextActions(safe);

    const mostLikely = evaluated.length > 0 ? evaluated[0] : null;
    const alternatives = evaluated.slice(1);

    const evidenceCount = (safe.evidence || []).length;
    const eventCount = (safe.events || []).length;
    const peopleCount = (safe.people || []).length;
    const hypothesisCount = evaluated.length;

    const evidenceQualityScore = evidenceCount > 0
      ? Math.round(((safe.evidence || []).reduce((s, e) => s + evidenceQuality(e), 0) / (evidenceCount * 4)) * 100)
      : 0;

    const sections = [
      { heading: '1. Confirmed Facts', items: classified.confirmedFacts.length ? classified.confirmedFacts.map((f) => f.text) : ['No independently verified facts yet. Mark evidence with strong sources or add known facts.'] },
      { heading: '2. User Observations', items: classified.observations.length ? classified.observations.map((o) => o.text) : ['No observations recorded yet.'] },
      { heading: '3. Assumptions', items: classified.assumptions.length ? classified.assumptions.map((a) => a.text) : ['No assumptions detected. This is good — keep claims sourced.'] },
      { heading: '4. Unknown Information', items: classified.unknowns.length ? classified.unknowns.map((u) => u.text) : ['No specific unknowns flagged. Consider what you don\'t know.'] },
      { heading: '5. Contradictions', items: contradictions.length ? contradictions.map((c) => c.text) : ['No contradictions detected. This does not mean none exist — keep checking.'] },
      { heading: '6. Possible Explanations', items: evaluated.length ? evaluated.map((h) => `${h.text} (${h.confidence}% confidence)`) : ['No hypotheses yet. Add at least two competing explanations.'] },
      { heading: '7. Evidence Supporting Each Explanation', items: evaluated.length ? evaluated.map((h) => `${h.text}: ${h.evidenceFor.length ? h.evidenceFor.map((e) => e.text).join('; ') : 'No supporting evidence yet.'}`) : ['Add hypotheses to evaluate supporting evidence.'] },
      { heading: '8. Evidence Against Each Explanation', items: evaluated.length ? evaluated.map((h) => `${h.text}: ${h.evidenceAgainst.length ? h.evidenceAgainst.map((e) => e.text).join('; ') : 'No contradicting evidence yet — actively seek some.'}`) : ['Add hypotheses to evaluate contradicting evidence.'] },
      { heading: '9. Most Likely Explanation', items: mostLikely ? [`${mostLikely.text} — ${mostLikely.confidence}% confidence. ${mostLikely.confidence < 60 ? 'This is tentative; the evidence is not yet decisive.' : mostLikely.confidence < 80 ? 'This is moderately supported but not conclusive.' : 'This is well-supported, but confidence is not proof.'}`] : ['Not enough hypotheses to determine a leading explanation.'] },
      { heading: '10. Alternative Explanations', items: alternatives.length ? alternatives.map((h) => `${h.text} (${h.confidence}%)`) : ['No alternative explanations recorded. Add at least one to avoid fixation.'] },
      { heading: '11. What Would Change the Conclusion', items: changeItems },
      { heading: '12. Next Best Actions', items: actions },
    ];

    return {
      headline: mode === 'kids' ? 'Gentle mystery guide' : 'Critical-thinking analysis',
      status: mode === 'kids' ? 'Calm, fair, and curious' : 'Sceptical, analytical, evidence-driven',
      disclaimer: mode === 'kids'
        ? 'We can be wrong even when we feel sure. Keep checking facts kindly.'
        : 'Confidence reflects evidence support, not proof. This engine cannot detect lies, diagnose people, or replace professional judgment. Treat all conclusions as provisional.',
      sections,
      classified,
      contradictions,
      evaluated,
      biases,
      connections,
      questions,
      mostLikely,
      alternatives,
      changeItems,
      actions,
      metrics: {
        evidenceQuality: evidenceQualityScore,
        gaps: contradictions.length + classified.unknowns.length,
        questions: questions.length,
        hypotheses: hypothesisCount,
        biases: biases.length,
        connections: connections.length,
        evidence: evidenceCount,
        events: eventCount,
        people: peopleCount,
      },
    };
  }

  const api = {
    analyze,
    classifyInformation,
    detectContradictions,
    evaluateHypotheses,
    detectBias,
    findConnections,
    generateQuestions,
    whatWouldChange,
    nextActions,
    evidenceQuality,
    keywords,
    overlap,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ClarityIntelligence = api;
}(typeof window !== 'undefined' ? window : globalThis));
