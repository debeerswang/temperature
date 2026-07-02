# Temperature Tech Stack

This document describes the current technology stack used by the Temperature project.

## 1. Frontend

- Markup/UI: HTML5 + CSS3 + vanilla JavaScript
- Main published page: [docs/index.html](docs/index.html)
- Alternate/local source page: [climate-comfort.html](climate-comfort.html)
- Optional source variant: [climate-comfort.tsx](climate-comfort.tsx)

### Frontend capabilities

- Interactive sliders for temperature and humidity
- Derived comfort metrics (dew point, heat index / feels-like)
- Dynamic guidance cards and heatmap rendering
- Language toggle (English / Simplified Chinese)
- Unit toggle (Fahrenheit / Celsius)
- Visit logging script integration

## 2. Visit Logging Client

- Runtime: browser JavaScript
- Script files:
  - [docs/visit-logger.js](docs/visit-logger.js)
  - [docs/visit-logger-mobile.js](docs/visit-logger-mobile.js)
- Endpoint source: `<meta name="visit-log-endpoint" ...>` in page HTML

### Logging transport

- Desktop path: `sendBeacon` / `fetch` POST
- Mobile fallback: image-ping GET fallback

## 3. Backend Logger Service

- Language/runtime: Node.js
- Framework: Express 4 ([logger/package.json](logger/package.json))
- Database client: pg ([logger/package.json](logger/package.json))
- Service entrypoint: [logger/server.js](logger/server.js)
- Primary data storage: PostgreSQL table `visit_events`
- Fallback data storage (when `DATABASE_URL` is missing): JSONL file in [logger/data](logger/data)

### API endpoints

- `GET /health`
- `POST /api/log-visit`
- `GET /api/log-visit` (mobile fallback path)
- `GET /admin/recent` (requires admin token)

## 4. Hosting and Deployment

### Static frontend hosting

- Platform: GitHub Pages
- Public URL: `https://debeerswang.github.io/temperature/`
- Publish target: `gh-pages` branch (`index.html` at branch root)

### Logger service hosting

- Platform: Render Web Service
- Blueprint file: [render.yaml](render.yaml)
- Logger root dir on deploy: `logger`
- Render runtime: Node
- Start command: `npm start`
- Build command: `npm install`

## 5. Configuration and Environment

- CORS allowlist: `ALLOWED_ORIGINS`
- Service port: `PORT` (default `8787`)
- Admin access protection: `ADMIN_TOKEN`
- Database connection: `DATABASE_URL`
- Local examples: [logger/.env.example](logger/.env.example)

## 6. Tooling

- Version control: Git + GitHub
- HTTP testing: curl
- QR utility script: [generate_qr.py](generate_qr.py)

## 7. Reference Docs

- Main project notes: [README.md](README.md)
- Render operations guide: [RENDER_README.md](RENDER_README.md)
- Logger service guide: [logger/README.md](logger/README.md)
