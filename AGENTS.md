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

`nginx.dev.conf` is kept as an optional static-file server (see gotchas below); the Base44 dev stack uses the Vite service in `docker-compose.base44.yml`.

## Testing
```bash
node --test intelligence.test.js   # 12 tests for the reasoning engine
```

## File loading order (index.html)
1. `intelligence.js` — ClarityIntelligence (reasoning engine, also CommonJS-exported for tests)
2. `storage.js` — ClarityStorage (persistence)
3. `workspace.js` — ClarityWorkspace (SVG relationship graph)
4. `board.js` — ClarityBoard (draggable evidence board, also an IIFE)
5. `views.js` — view functions (reference state/esc from app.js; safe because functions are only called after app.js loads)
6. `app.js` — state, routing, modal system, entity CRUD, seed data; calls `app()` at end
7. `pwa.js` — install/share/service worker

## Key design decisions
- **No build step**: all JS is plain scripts loaded via `<script src>`. Vite serves them as-is with live reload.
- **Global scope**: functions are shared via global scope (window). No ES modules (avoids CORS issues with file://).
- `intelligence.js`, `storage.js` and `board.js` expose `module.exports`/`window.*` so Node tests and the browser can share them.
- **Modal system**: entity add/edit uses a DOM-injected modal overlay (not prompt()). Modal state is separate from main render cycle.
- **Entity management**: generic `addEntity(type)` / `editEntity(type, id)` / `removeEntity(type, id)` driven by `ENTITY_CONFIG` table.
- **Analysis caching**: `state.analysis` is recomputed on every `app()` call via `ClarityIntelligence.analyze()`.
- **Evidence board**: `ClarityBoard.init(root, investigation, persist)` reads the current investigation and stores card positions/links on `investigation.board`, so they travel with export/import.

## Investigation data model
```
{ id, title, type, status, createdAt, updatedAt,
  whatHappened, whatWasExpected,
  people[], locations[], objects[], events[], evidence[],
  statements[], hypotheses[], knownFacts[], unknowns[],
  ruledOut[], checkedActions[], history[], questions[],
  board: { positions: {}, links: [] } }
```

## Seed data
On first load (empty localStorage), `seedIfEmpty()` creates "The Missing Float" demo investigation with people, evidence, events, hypotheses, etc.

## Verifying it works
- `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/` → 200.
- `docker compose -f docker-compose.base44.yml ps` → `healthy`.
- Preview: case list renders, a case opens, Analysis shows 12 cards, Workspace renders the graph, Board allows dragging and linking, Kids mode switches theme and copy.

## Static nginx alternative — non-obvious gotchas
1. **Repo root may be mode `drwx------` (700, root-only).** The default `nginx:alpine` worker runs as the non-root `nginx` user and cannot traverse a 700 directory, so every request returns **403 Forbidden**. `nginx.dev.conf` sets `user root;` so workers can read the bind-mounted source.
2. **Healthcheck must hit `127.0.0.1`, not `localhost`.** nginx listens on IPv4 only; `localhost` resolves to IPv6 `::1` first in alpine, so `wget http://localhost:80/` gets "connection refused" even when nginx is up.
3. With a static server there is no live reload; call `reload_preview` after changes. The service worker (`sw.js`) caches the shell, so a hard reload may be needed to pick up JS changes during dev.
