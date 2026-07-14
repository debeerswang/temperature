# Temperature Visit Logger

This service records page views for the published Temperature page and captures the client IP address on the server side.

Primary storage is PostgreSQL (`DATABASE_URL`).
If `DATABASE_URL` is not set, the service falls back to local JSONL file logging.

## What it does

- Accepts `POST /api/log-visit`
- Determines the visitor IP from `X-Forwarded-For` or the socket remote address
- Persists each visit event to PostgreSQL when `DATABASE_URL` is configured
- Falls back to appending JSON lines to `logger/data/visits.jsonl` for local-only usage
- Exposes `GET /admin/recent` for viewing recent activity (requires `ADMIN_TOKEN`)
- Exposes `GET /dashboard/recent` for dashboard refresh without browser token entry

## Start locally

```bash
cd /Users/debeerswang/Documents/Code/Temperature/logger
npm install
npm start
```

The published page is configured to post to `http://localhost:8787/api/log-visit` by default.

For local Postgres usage, set `DATABASE_URL` before starting:

```bash
DATABASE_URL="postgres://user:password@localhost:5432/temperature_logger" npm start
```

## Docker / docker-compose (self-host)

You can run the logger and a local Postgres instance using `docker-compose` from the repository root. This is a convenient self-hosting alternative to Render.

1. From the repository root, build and start the services:

```bash
cd /Users/debeerswang/Documents/Code/Temperature
# Optionally set an admin token in your shell or export it into an .env file
export ADMIN_TOKEN="replace-with-a-long-random-secret"
docker-compose up -d --build
```

2. Verify the logger is healthy and listening:

```bash
curl http://localhost:8787/health
# expected: {"ok":true}
```

3. Fetch recent events for the dashboard endpoint (no browser token required):

```bash
curl "http://localhost:8787/dashboard/recent?limit=50"
```

4. Fetch recent events using the admin endpoint (token required):

```bash
curl "http://localhost:8787/admin/recent?token=${ADMIN_TOKEN}&limit=50"
```

5. Data persistence:

- Postgres data is stored in a Docker volume named `postgres_data` (created by `docker-compose`).
- The logger also writes JSONL fallback files to `logger/data` on the host via a bind mount.

To stop and remove containers:

```bash
docker-compose down
```

If you prefer to run the logger without Postgres, unset `DATABASE_URL` and the service will fall back to `logger/data/visits.jsonl` as described above.


## Change the endpoint for production

Update the `visit-log-endpoint` meta tag in `docs/index.html` to point at your deployed logger service.

## Render deployment

This repo includes a Render blueprint at `/Users/debeerswang/Documents/Code/Temperature/render.yaml`.

Typical flow:

```bash
cd /Users/debeerswang/Documents/Code/Temperature
git push origin main
```

Then create a new Blueprint service in Render from this repository. Render will deploy the `logger` directory as a web service on port `8787`.

The Blueprint also provisions a PostgreSQL database and injects `DATABASE_URL` into the web service.

After Render gives you the public URL, update the `visit-log-endpoint` meta tag in both page files to:

```text
https://your-render-service.onrender.com/api/log-visit
```

## CORS

Allowed origins are controlled by `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS="https://debeerswang.github.io,http://localhost:3000" npm start
```

The server also allows local development origins on `localhost` and `127.0.0.1` (any port), so the local dashboard refresh button can call `/dashboard/recent` from `http://localhost:8080` or `http://localhost:8081`.
For LAN access, add your dashboard origin to `ALLOWED_ORIGINS`, for example `http://10.0.0.74:8081`.

## View recent activity logs

Set an admin token in your environment and restart the service:

```bash
ADMIN_TOKEN="replace-with-a-long-random-secret" npm start
```

Then fetch recent events (latest first):

```bash
curl "http://localhost:8787/admin/recent?token=replace-with-a-long-random-secret&limit=50"
```

For the deployed Render service:

```bash
curl "https://temperature-visit-logger.onrender.com/admin/recent?token=replace-with-a-long-random-secret&limit=50"
```

You can also pass the token with an Authorization header:

```bash
curl -H "Authorization: Bearer replace-with-a-long-random-secret" "https://temperature-visit-logger.onrender.com/admin/recent?limit=50"
```

To export recent logs to a local timestamped JSON file:

```bash
ADMIN_TOKEN='replace-with-a-long-random-secret'
TS=$(date +"%Y%m%d_%H%M%S")
OUT="logs/recent_${TS}.json"
mkdir -p logs
curl -sS --fail-with-body -H "Authorization: Bearer $ADMIN_TOKEN" \
	"https://temperature-visit-logger.onrender.com/admin/recent?limit=200" > "$OUT"
echo "$OUT"
```

## Privacy note

IP addresses are personal data in many jurisdictions. If you enable this logger publicly, you should add an appropriate privacy notice and make sure your data retention policy is intentional.