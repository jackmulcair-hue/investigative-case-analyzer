# Clarity — Investigative Problem-Solving System

Clarity is a critical-thinking investigation engine for solving mysteries, missing items, unexplained situations, problems, inconsistencies, unanswered questions and real-world issues.

## What it does

Clarity helps you investigate systematically — like having an exceptionally good critical-thinking partner beside you. It is not primarily a crime-solving app; it works on everyday mysteries (finding a missing item, figuring out why something happened, reconstructing an event, resolving conflicting accounts, troubleshooting a problem) as well as complex investigations.

## Core features

### Investigation engine
- Enter a situation and provide any relevant information: what happened, what was expected, people, locations, dates, objects, events, statements, observations, possible explanations, known facts, unknowns, contradictions, ruled-out explanations, and what has already been checked
- The system breaks the problem down into variables and factors and reasons through them systematically
- Emulates critical, analytical, sceptical, evidence-driven thinking — it does not simply give the most obvious answer

### 12-category analysis
Every investigation clearly separates:
1. Confirmed facts
2. User observations
3. Assumptions
4. Unknown information
5. Contradictions
6. Possible explanations
7. Evidence supporting each explanation
8. Evidence against each explanation
9. Most likely explanation
10. Alternative explanations
11. What would change the conclusion
12. Next best actions

### Confidence assessment
Each hypothesis gets a confidence score based on available evidence. Confidence is explicitly **not proof** — the system never pretends certainty where the evidence does not support it.

### Evolving investigations
Investigations persist and evolve over time. New information is incorporated into the existing case rather than forcing you to start again. All investigations are stored locally in the browser.

### Visual investigation workspace
An interactive SVG graph shows the relationships between people, places, events, objects, evidence, hypotheses and unanswered questions.

### Evidence timeline
A chronological timeline of events with source verification indicators.

### Investigation history
A complete log of how the reasoning developed — every addition, edit, and removal is recorded.

### Intelligent questioning
The system identifies the most useful unanswered question and asks it when additional information could materially change the result.

### Active bias detection
The system actively looks for:
- Missing information
- Confirmation bias
- False assumptions
- Coincidences
- Inconsistencies
- Alternative explanations
- Unverified claims
- Evidence that has been overlooked
- Connections between apparently unrelated facts

### Modes
- **Professional mode** — full analytical interface (navy/blue)
- **Kids mode** — gentle, fair-play language for low-stakes disagreements (warm oranges/reds)

### PWA
Installable on iPhone and Android. Works offline after first visit. Service worker caches the app shell.

## Development

```bash
npm install      # install vite dev server
npm run dev      # start dev server at http://localhost:5173
npm test         # run intelligence engine tests
```

Or with Docker:
```bash
docker compose -f docker-compose.base44.yml up -d
# App served on port 3000
```

## Architecture

- `intelligence.js` — the critical-thinking engine (fact classification, contradiction detection, hypothesis evaluation, bias detection, connection finding, intelligent questioning)
- `storage.js` — investigation persistence (localStorage, multi-case support, import/export)
- `workspace.js` — visual relationship graph (SVG force-directed layout)
- `views.js` — all view rendering functions
- `app.js` — main application shell, state, routing, modal system, entity management
- `intelligence.test.js` — test suite for the reasoning engine

## Data storage

All investigation data is stored in the browser's localStorage. No server-side storage or sync. Use the Export JSON feature to back up or transfer investigations.

## Important

Clarity is a reasoning aid, not a source of truth. Confidence reflects evidence support, not proof. The system cannot detect lies, diagnose people, or replace professional judgment. Treat all conclusions as provisional.
