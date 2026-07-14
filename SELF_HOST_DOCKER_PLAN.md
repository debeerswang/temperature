# Self-hosting Temperature Logger — Docker Plan

This document describes the plan and exact commands to replace the Render deployment with a self-hosted Docker-based setup running the `logger` service plus a local PostgreSQL instance.

## Purpose

- Provide reproducible local hosting for the `logger/` service used by the Temperature portal.
- Allow easy testing and debugging of visits and the local dashboard without Render.

## Files added

- `logger/Dockerfile` — container image for the logger service.
- `docker-compose.yml` — brings up `logger` and `postgres` for local use.

These files are already added to the repository. See [Temperature/logger/Dockerfile](logger/Dockerfile) and [Temperature/docker-compose.yml](docker-compose.yml).

## Prerequisites

- Docker & Docker Compose installed on the host machine.
- A shell to export environment variables (bash/zsh).
- Optionally: Python 3 to regenerate the local dashboard (`build_logs_dashboard.py`).

## Environment variables used

- `ADMIN_TOKEN` — required for calling the admin endpoint (`/admin/recent`). Use a long random value.
- `ALLOWED_ORIGINS` — comma-separated allowed origins for CORS.
- `DATABASE_URL` — internal compose overrides are set, but you may set a custom DB URL.

The docker-compose file sets sensible defaults; override via environment or an `.env` file.

## Quick start (recommended)

1. From repository root, export an admin token and start:

```bash
cd ~/Documents/Code/Temperature
export ADMIN_TOKEN="$(openssl rand -hex 24)"
docker-compose up -d --build
```

2. Verify the logger service:

```bash
curl http://localhost:8787/health
# -> {"ok":true}
```

3. Fetch recent events (admin token required):

```bash
curl "http://localhost:8787/admin/recent?token=${ADMIN_TOKEN}&limit=50"
```

4. Build and view the local dashboard (optional):

```bash
python3 build_logs_dashboard.py
python3 -m http.server 8081
# open http://localhost:8081/logs/dashboard.html
```

## Verification checklist

- [ ] `http://localhost:8787/health` returns `{"ok":true}`
- [ ] `curl /admin/recent` returns `ok: true` and `events` JSON when using `ADMIN_TOKEN`
- [ ] `logger/data/visits.jsonl` receives fallback writes if `DATABASE_URL` is unset
- [ ] `postgres` container is running and healthy (`docker ps` / `docker-compose ps`)

## Persisting & backups

- Postgres data is stored in a named Docker volume `postgres_data`. Back it up with `docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar czf /backup/postgres_data.tgz ."` or use pg_dump.
- The logger writes fallback JSON to `logger/data` (bind-mounted to the host). Periodically archive or rotate these files.

## Stopping and cleanup

```bash
docker-compose down
# remove volumes if desired (data loss):
docker-compose down -v
```

## Security & privacy notes

- Keep `ADMIN_TOKEN` secret; do not check it into source control.
- IP addresses are recorded by the logger; consider redaction or removing `ip` storage if you need to reduce PII risk.
- If exposing the service publicly, configure TLS (reverse proxy like Caddy/Nginx) and restrict `ALLOWED_ORIGINS`.

## Optional: Auto-start on boot

If you want the stack to auto-start on a server, I can scaffold:

- a `systemd` unit that runs `docker-compose up -d` (Linux), or
- a `launchd` plist to run the stack on macOS.

Tell me your target OS and I will add the unit file.

## Rollback

- To revert to the previous Render deployment, update the portal's `visit-log-endpoint` meta tag back to the Render URL and re-deploy the portal site.

## Next steps (optional tasks I can do for you)

- Run `docker-compose up -d --build` here and verify the endpoints for you.
- Add a `systemd` or `launchd` unit to auto-start the stack on boot.
- Add a small `Makefile` with `start`, `stop`, `logs`, and `backup` targets.

---

File: [Temperature/docker-compose.yml](docker-compose.yml)
