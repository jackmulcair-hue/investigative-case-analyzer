# Clarity — Development Notes

## Stack
- Static PWA: vanilla JS, no framework, no build step
- Vite dev server (dev only; provides live reload)
- All data in browser localStorage — no backend, no database

## Running
```bash
docker compose -f docker-compose.base44.yml up -d   # port 3000
docker compose -f docker-compose.base44.yml logs -f web
```
Or directly: `npm install && npm run dev` (port 5173)

## Testing
```bash
node --test intelligence.test.js   # 12 tests for the reasoning engine
```

## File loading order (index.html)
1. `intelligence.js` — ClarityIntelligence (reasoning engine, also CommonJS-exported for tests)
2. `storage.js` — ClarityStorage (persistence)
3. `workspace.js` — ClarityWorkspace (SVG graph)
4. `views.js` — view functions (reference state/esc from app.js; safe because functions are only called after app.js loads)
5. `app.js` — state, routing, modal system, entity CRUD, seed data; calls `app()` at end
6. `pwa.js` — install/share/service worker

## Key design decisions
- **No build step**: all JS is plain scripts loaded via `<script src>`. Vite serves them as-is with live reload.
- **Global scope**: functions are shared via global scope (window). No ES modules (avoids CORS issues with file://).
- `intelligence.js` and `storage.js` use `module.exports` for Node tests and `global.X = api` for browser.
- **Modal system**: entity add/edit uses a DOM-injected modal overlay (not prompt()). Modal state is separate from main render cycle.
- **Entity management**: generic `addEntity(type)` / `editEntity(type, id)` / `removeEntity(type, id)` driven by `ENTITY_CONFIG` table.
- **Analysis caching**: `state.analysis` is recomputed on every `app()` call via `ClarityIntelligence.analyze()`.

## Investigation data model
```
{ id, title, type, status, createdAt, updatedAt,
  whatHappened, whatWasExpected,
  people[], locations[], objects[], events[], evidence[],
  statements[], hypotheses[], knownFacts[], unknowns[],
  ruledOut[], checkedActions[], history[], questions[] }
```

## Seed data
On first load (empty localStorage), `seedIfEmpty()` creates "The Missing Float" demo investigation with people, evidence, events, hypotheses, etc.
