# README_CLAUDE.md — Project Context for Claude

This file documents the Temperature / Outdoor Comfort Index project for AI-assisted work sessions.

---

## What this project is

A single-page web app that lets users interactively explore how temperature, humidity, dew point, and heat index interact, with training guidance for outdoor athletes. Deployed on GitHub Pages. Bilingual (English / Simplified Chinese).

Live site: https://debeerswang.github.io/temperature/

---

## File map

| Path | Role |
|------|------|
| `docs/index.html` | **Canonical source.** The deployed page. Edit this. |
| `docs/visit-logger.js` | Client-side visit logger (fires on load, BFCache, pagehide). Loaded by index.html. |
| `docs/visit-logger-mobile.js` | Identical copy of visit-logger.js. Never referenced. Dead file. |
| `climate-comfort.html` | **Stale older version** of the UI — do not treat as source of truth. Has `localhost:8787` as the log endpoint. |
| `climate-comfort.tsx` | React/TypeScript scratch version. No build pipeline exists. Not used. |
| `logger/server.js` | Express backend for visit logging. Deployed on Render. |
| `logger/package.json` | Dependencies: express ^4.21.2, pg ^8.12.0. |
| `logger/.env.example` | Lists required env vars. |
| `render.yaml` | Render deployment config (web service + free Postgres DB). |
| `logs/` | Local dashboard and snapshot JSON exports. |
| `build_logs_dashboard.py` | Python script that builds the local logs dashboard. |
| `generate_qr.py` | One-off QR code generator. |

---

## Architecture

```
Browser (GitHub Pages)
  docs/index.html          ← all logic inline; no build step
  docs/visit-logger.js     ← fires async on page load
       │
       │  POST /api/log-visit  (or GET via image pixel on mobile)
       ▼
Render web service  (temperature-visit-logger.onrender.com)
  logger/server.js
       │
       ├── DATABASE_URL set  →  PostgreSQL (Render managed DB)
       └── DATABASE_URL unset →  logger/data/visits.jsonl  (fallback)
```

Admin read access: `GET /admin/recent` with `Authorization: Bearer <ADMIN_TOKEN>`.

---

## Deployment

### Update the live site

Edit `docs/index.html`, then:

```bash
git add docs/index.html
git commit -m "Update ..."
git push origin main
```

GitHub Pages serves from the `gh-pages` branch. If you need to republish from main:

```bash
# From the Temperature repo root:
git checkout --orphan gh-pages
git rm -rf .
cp docs/index.html index.html
git add index.html
git commit -m "Publish update"
git push -u origin gh-pages --force
git checkout main
```

### Update the logger service

Render auto-deploys from main when `logger/` changes. No manual step needed.

---

## Environment variables (logger service)

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | No | Defaults to 8787. Render sets it automatically. |
| `DATABASE_URL` | No | If unset, falls back to JSONL file. Render wires this from the managed DB. |
| `ADMIN_TOKEN` | Yes (for /admin/recent) | Must be set manually in Render dashboard. Not in render.yaml. |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS allowlist. Defaults include localhost and GitHub Pages origin. |

---

## Known issues (do not accidentally "fix" these without context)

1. **`docs/visit-logger-mobile.js` is dead.** It is byte-for-byte identical to `visit-logger.js` and nothing loads it. Safe to delete.

2. **`climate-comfort.html` is stale.** It's a prior version of the UI with `localhost:8787` as the log endpoint and an older design. `docs/index.html` is the actual deployed page and is more current. The README's "edit climate-comfort.html then copy" workflow is wrong — edit `docs/index.html` directly.

3. **Admin token via `?token=` query param is a security risk.** `getProvidedAdminToken` in `server.js` accepts the token as a URL query parameter, which shows up in server logs and browser history. The Authorization header path already exists and is the safe route.

4. **No rate limiting on `/api/log-visit`.** The endpoint accepts unlimited requests. `express-rate-limit` is not installed.

5. **`pageshow` fires on initial load** in addition to the explicit `sendVisit()` call at the bottom of `visit-logger.js`. The `sent` flag deduplicates correctly so no double-send occurs, but the pageshow listener should check `event.persisted` to only catch BFCache restores.

---

## Formulas

**Dew point** — Magnus-Tetens approximation (all internal values in °F, converted to °C for the formula):

```
Tc = (T_F - 32) * 5/9
γ  = (17.27 * Tc) / (237.7 + Tc) + ln(RH/100)
Td_C = (237.7 * γ) / (17.27 - γ)
Td_F = Td_C * 9/5 + 32
```

**Heat index** — Rothfusz regression (NWS standard), only applied when T ≥ 80°F. Includes low-RH correction (RH < 13, 80 ≤ T ≤ 112) and high-RH correction (RH > 85, 80 ≤ T ≤ 87). Below 80°F, heat index returns T unchanged.

**Slider internals always use °F.** Celsius display is a cosmetic conversion only; all calculations operate in Fahrenheit.

---

## Bilingual copy

All UI strings are defined in the `copy` object in `docs/index.html` under keys `en` and `zh`. Language preference is persisted to `localStorage` under key `temperature-ui-language`. Unit preference (F/C) persists under `temperature-ui-unit`.

To add a language: add a new key to `copy`, add handling in `setLanguage`, and add a toggle button.

---

## Local dev (logger)

```bash
cd logger
cp .env.example .env   # fill in values
npm install
node server.js
```

Without `DATABASE_URL`, events go to `logger/data/visits.jsonl`.

Admin endpoint test:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8787/admin/recent
```
