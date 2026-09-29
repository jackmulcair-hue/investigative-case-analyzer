# Base44 Dev Environment

## What this app is
Clarity is a static PWA (no backend, no build step). Plain HTML/CSS/JS served directly. Entry point is `index.html`, which loads `intelligence.js`, `app.js`, and `pwa.js`.

## Running it
- Served by `nginx:alpine` via `docker-compose.base44.yml`, bind-mounted read-only at `/usr/share/nginx/html`.
- Web entry point is host port 3000.
- No dependencies to install, no migrations, no seeds, no secrets needed.
- Edits to static files appear on `reload_preview` (nginx serves files live from the mount).

## Tests
- `intelligence.test.js` exists — a plain JS test file with no runner configured. Run manually if needed.
