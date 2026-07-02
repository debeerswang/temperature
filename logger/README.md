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

## Privacy note

IP addresses are personal data in many jurisdictions. If you enable this logger publicly, you should add an appropriate privacy notice and make sure your data retention policy is intentional.