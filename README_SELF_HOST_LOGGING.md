# Self-Hosted Logging Guide

This document explains how to run and operate the Temperature user activity logging stack locally or on your own server, without any Render dependency.

## What this includes

- Logger API service (Node.js/Express)
- PostgreSQL database (Docker)
- Local dashboard for viewing and exporting recent events

## Architecture

1. Frontend page loads a visit logger script.
2. Script sends visit activity to `/api/log-visit`.
3. Logger stores events in PostgreSQL when `DATABASE_URL` is configured.
4. If database is unavailable, logger can fall back to `logger/data/visits.jsonl`.
5. Dashboard reads recent events through protected endpoint `/admin/recent`.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Bash or zsh shell
- Optional: Python 3 for rebuilding local dashboard snapshots

## Start self-host stack

From repository root:

```bash
cd ~/Documents/Code/Temperature
export ADMIN_TOKEN="$(openssl rand -hex 24)"
docker-compose up -d --build
```

Verify:

```bash
curl http://localhost:8787/health
```

Expected response:

```json
{"ok":true}
```

## Endpoints

- Health: `GET /health`
- Write event: `POST /api/log-visit`
- Write event (image/get fallback): `GET /api/log-visit`
- Read recent events (admin): `GET /admin/recent`

### Admin auth

`/admin/recent` requires `ADMIN_TOKEN`, provided either as:

- Bearer token header:
  - `Authorization: Bearer <ADMIN_TOKEN>`
- Query parameter:
  - `?token=<ADMIN_TOKEN>`

Example:

```bash
curl "http://localhost:8787/admin/recent?token=${ADMIN_TOKEN}&limit=50"
```

## Dashboard workflow (self-hosted)

1. Launch dashboard server:

```bash
cd ~/Documents/Code/Temperature
python3 -m http.server 8081
```

2. Open:

- `http://localhost:8081/logs/dashboard.html`

3. In dashboard controls:

- Click **Use Local Logger**
- Enter `ADMIN_TOKEN`
- Click **Refresh From Server**

4. Export data as needed:

- **Download Snapshot JSON** for manual archive
- **Save Snapshot To Folder** if browser supports File System Access API

5. Rebuild aggregated dashboard after adding snapshots:

```bash
cd ~/Documents/Code/Temperature
python3 build_logs_dashboard.py
```

## Storage and persistence

- PostgreSQL data is stored in Docker volume `postgres_data`.
- File fallback writes to `logger/data/visits.jsonl`.

## Backup options

Volume archive:

```bash
docker run --rm -v postgres_data:/data -v "$(pwd)":/backup alpine sh -c "cd /data && tar czf /backup/postgres_data.tgz ."
```

Or use `pg_dump` if you prefer logical backups.

## Update frontend endpoint for fully local capture

The page logger endpoint is configured via the HTML meta tag:

- `meta name="visit-log-endpoint"`

For local-only capture, point it to:

- `http://localhost:8787/api/log-visit`

## Stop services

```bash
cd ~/Documents/Code/Temperature
docker-compose down
```

Remove data volumes (destructive):

```bash
cd ~/Documents/Code/Temperature
docker-compose down -v
```

## Troubleshooting

### Logger starts then exits with SSL error

Symptom:

- `The server does not support SSL connections`

Fix:

- Ensure `DATABASE_URL` points to local compose host (`postgres`) and logger treats local DB as non-SSL.

### Unauthorized on `/admin/recent`

- Confirm `ADMIN_TOKEN` is set in logger container environment.
- Ensure dashboard token matches exactly.

### No events appear

- Check logger endpoint in frontend meta tag.
- Check logger logs:

```bash
cd ~/Documents/Code/Temperature
docker-compose logs --tail=200 logger
```

### CORS errors in dashboard refresh

- Ensure `ALLOWED_ORIGINS` includes your dashboard origin.
- Localhost origins are supported for development.

## Security notes

- Treat `ADMIN_TOKEN` as a secret.
- Do not commit tokens into source control.
- IP addresses are logged. If needed, reduce or redact IP collection in logger service.

## Secret management (recommended)

Use a local `.env` file for real secrets and commit only `.env.example`.

1. Copy template:

```bash
cd ~/Documents/Code/Temperature
cp .env.example .env
```

2. Edit `.env` and set real values, especially `ADMIN_TOKEN` and `POSTGRES_PASSWORD`.

3. Start stack:

```bash
cd ~/Documents/Code/Temperature
docker-compose up -d --build
```

This repository ignores `.env` via `.gitignore`, so tokens stay local and out of Git history.
