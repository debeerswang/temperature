# Temperature Project Context for ChatGPT

This file is a compact handoff for future ChatGPT/Codex sessions working on this repository.

## Project Summary

Temperature is an outdoor comfort web tool published at:

https://debeerswang.github.io/temperature/

The app helps runners, cyclists, hikers, and race-day planners understand how air temperature and relative humidity translate into dew point, heat index, and practical training comfort.

Core user experience:

- Adjust air temperature and relative humidity with sliders.
- See computed dew point and feels-like temperature.
- Get contextual training guidance for pace, hydration, and exposure.
- View a temperature-by-humidity dew point heatmap.
- Toggle English / Simplified Chinese.
- Toggle Fahrenheit / Celsius.

## Repository Shape

Important files:

- `docs/index.html` - main GitHub Pages page currently used for publishing.
- `docs/visit-logger.js` - browser visit logging script used by the published page.
- `docs/visit-logger-mobile.js` - duplicate/mobile logging script kept for older page wiring.
- `climate-comfort.html` - older/local self-contained HTML source variant.
- `climate-comfort.tsx` - React/TypeScript source variant, not currently wired into a build pipeline.
- `logger/server.js` - Express visit logger service.
- `logger/package.json` - Node dependencies and start script for logger.
- `render.yaml` - Render blueprint for the logger service and PostgreSQL database.
- `build_logs_dashboard.py` - combines exported log snapshots and generates `logs/dashboard.html`.
- `logs/` - local exported snapshots and generated dashboard artifacts.
- `README.md` - project story, deployment notes, and publish history.
- `TECH_STACK_README.md` - stack overview.
- `RENDER_README.md` - Render setup and operations notes.

## Frontend Notes

The published page is mostly static HTML, CSS, and vanilla JavaScript in `docs/index.html`.

Weather calculations:

- Dew point uses the Magnus-Tetens approximation.
- Heat index uses the Rothfusz regression with low- and high-humidity adjustments.

The page reads the visit logger endpoint from:

```html
<meta name="visit-log-endpoint" content="...">
```

The published version should point to the Render logger endpoint:

```text
https://temperature-visit-logger.onrender.com/api/log-visit
```

Be careful when copying from `climate-comfort.html` to `docs/index.html`: the older local HTML may contain localhost logging settings or script paths that are not valid on GitHub Pages.

## Logger Service

The logger is a small Node/Express app in `logger/server.js`.

Endpoints:

- `GET /health`
- `POST /api/log-visit`
- `GET /api/log-visit` for image-pixel/mobile fallback
- `GET /admin/recent` protected by `ADMIN_TOKEN`

Storage:

- PostgreSQL when `DATABASE_URL` is present.
- Local JSONL file at `logger/data/visits.jsonl` when `DATABASE_URL` is absent.

Important environment variables:

- `PORT` - defaults to `8787`
- `DATABASE_URL` - enables PostgreSQL storage
- `ADMIN_TOKEN` - required for `/admin/recent`
- `ALLOWED_ORIGINS` - CORS allowlist

## Deployment

Frontend:

- Hosted on GitHub Pages.
- Public URL: `https://debeerswang.github.io/temperature/`
- Current published page source in this repo: `docs/index.html`
- Historical notes mention a `gh-pages` branch with root `index.html`.

Backend logger:

- Hosted on Render.
- Blueprint: `render.yaml`
- Service root: `logger`
- Build command: `npm install`
- Start command: `npm start`
- Database: Render PostgreSQL via `DATABASE_URL`

## Local Workflows

Start logger locally:

```bash
cd logger
npm install
npm start
```

Regenerate log dashboard:

```bash
python3 build_logs_dashboard.py
```

Check repo state:

```bash
git status --short
```

## Review Caveats

Known areas to handle carefully:

- Do not commit real admin tokens or secrets. Use placeholders in docs.
- `build_logs_dashboard.py` renders visitor-controlled data; escape any values inserted through `innerHTML`.
- The public log endpoint is intentionally unauthenticated, but should have rate limiting and input validation if abuse becomes a concern.
- `X-Forwarded-For` can be spoofed unless proxy trust is configured carefully.
- Keep `docs/index.html`, `climate-comfort.html`, and logger script paths in sync if editing the published experience.

## Suggested Future Improvements

- Make `docs/index.html` the clear source of truth, or add a real build step from `climate-comfort.tsx`.
- Deduplicate `docs/visit-logger.js` and `docs/visit-logger-mobile.js`.
- Add basic tests for dew point, heat index, and logger request handling.
- Add dashboard escaping fixes before sharing exported dashboards widely.
- Add rate limiting and schema validation to the logger service.
