# Clarity — Base44 dev notes

## What this is
A pure static PWA (no build step, no backend, no package manager, no secrets).
Source is plain HTML/JS/CSS served as-is: `index.html` + `app.js` + `intelligence.js` + `pwa.js` + `styles.css` + `pwa.css` + `sw.js` + `manifest.webmanifest` + `icons/`.

## Running it
`docker compose -f docker-compose.base44.yml up -d` serves the repo on host port 3000 via `nginx:alpine`.

## Non-obvious gotchas (the original "failed to start")
1. **Repo root is mode `drwx------` (700, root-only).** The default `nginx:alpine` worker runs as the non-root `nginx` user and cannot traverse a 700 directory, so every request returns **403 Forbidden**. Fix: `nginx.dev.conf` sets `user root;` so workers can read the bind-mounted source. This is mounted at `/etc/nginx/nginx.conf` in the compose. Do not remove it.
2. **Healthcheck must hit `127.0.0.1`, not `localhost`.** nginx listens on IPv4 only; `localhost` resolves to IPv6 `::1` first in alpine, so `wget http://localhost:80/` gets "connection refused" even when nginx is up.
3. There is no live-reload dev server (no framework/build). Edits to static files are served immediately by nginx; call `reload_preview` after changes so the user sees them. The service worker (`sw.js`) caches the shell, so a hard reload may be needed to pick up JS changes during dev.

## Verifying it works
- `curl -s -o /dev/null -w "%{http}\n" http://localhost:3000/` → 200 (not 403).
- `docker compose -f docker-compose.base44.yml ps` → `healthy`.
- Preview: the shell renders with a sidebar + 7 nav buttons; the Analysis view shows the disclaimer, 3 metric boxes, and 6 cards with no console errors.

## Tests
`intelligence.test.js` exists (Node-based). Run with `node intelligence.test.js` if needed — not part of the dev server.
