# Render Deployment Guide (Temperature Visit Logger)

This guide documents how to deploy and operate the `temperature-visit-logger` service on Render.

## Scope

- Service: Node.js web service in `logger/`
- Purpose: Receive visit events from the Temperature portal and expose admin log viewing
- Blueprint file: `render.yaml`

## Current Blueprint

`render.yaml` is configured as:

- `type`: `web`
- `name`: `temperature-visit-logger`
- `runtime`: `node`
- `rootDir`: `logger`
- `plan`: `free`
- `buildCommand`: `npm install`
- `startCommand`: `npm start`
- `PORT`: `8787`
- `ALLOWED_ORIGINS`: `https://debeerswang.github.io,https://debeerswang.github.io/temperature/`

## 1. Deploy on Render

1. Push latest code to GitHub:

```bash
cd /Users/debeerswang/Documents/Code/Temperature
git push origin main
```

2. In Render:

- New + -> Blueprint
- Select repository `debeerswang/temperature`
- Confirm service settings from `render.yaml`
- Deploy

3. Confirm health endpoint:

```bash
curl -i https://temperature-visit-logger.onrender.com/health
```

Expected response includes `200` and JSON `{"ok":true}`.

## 2. Required Environment Variables

Set these in Render service settings.

### `ADMIN_TOKEN` (required for admin logs)

Use a long random secret. Example generation:

```bash
openssl rand -hex 24
```

Set it in Render dashboard as:

- Key: `ADMIN_TOKEN`
- Value: `<your-random-secret>`

### `ALLOWED_ORIGINS`

Comma-separated allowed browser origins.

Recommended value:

```text
https://debeerswang.github.io,https://debeerswang.github.io/temperature/
```

## 3. Portal Endpoint Wiring

The portal sends visits to the endpoint defined in HTML meta:

```html
<meta name="visit-log-endpoint" content="https://temperature-visit-logger.onrender.com/api/log-visit">
```

If your Render URL changes, update this meta value in:

- `docs/index.html`
- `climate-comfort.html`

Then republish GitHub Pages.

## 4. Smoke Tests

### Browser-style POST test

```bash
curl -i -X POST https://temperature-visit-logger.onrender.com/api/log-visit \
  -H 'Origin: https://debeerswang.github.io' \
  -H 'Content-Type: application/x-www-form-urlencoded;charset=UTF-8' \
  --data 'page=%2Ftemperature%2F&title=Outdoor+Comfort+Index&userAgent=desktop-test&language=en-US&screen=1440x900&viewport=1200x800&timezone=America%2FChicago&visitedAt=2026-07-02T03%3A10%3A00.000Z'
```

Expected status: `202 Accepted`.

### Mobile-style GET test (image/pixel fallback)

```bash
curl -i 'https://temperature-visit-logger.onrender.com/api/log-visit?page=%2Ftemperature%2F&title=Outdoor+Comfort+Index&userAgent=mobile-test&language=en-US&screen=390x844&viewport=390x780&timezone=America%2FChicago&visitedAt=2026-07-02T03%3A10%3A00.000Z&transport=image'
```

Expected status: `204 No Content`.

## 5. View Recent Logs

### With Authorization header (recommended)

```bash
ADMIN_TOKEN='f0d6b7f737136fabbbd56c2d14395e0a'
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://temperature-visit-logger.onrender.com/admin/recent?"
```

### With query token

```bash
curl "https://temperature-visit-logger.onrender.com/admin/recent?token=<your-admin-token>&limit=20"
```

## 6. Troubleshooting

### A) `admin/recent` returns `503 ADMIN_TOKEN is not configured`

- Add `ADMIN_TOKEN` in Render env vars
- Redeploy or restart service

### B) Browser requests fail with CORS errors

- Verify `ALLOWED_ORIGINS` includes the exact site origin
- Confirm request `Origin` header matches one of the allowed values

### C) Laptop logs work, mobile logs missing

- Verify portal uses latest logger script on GitHub Pages
- Confirm GET fallback path works via curl (section 4)
- Check `/admin/recent` for events where `transport` is `get` or `post`

### D) GitHub Pages shows stale HTML/JS

- Hard refresh browser (`Cmd+Shift+R`)
- Add cache-busting query when testing, e.g. `?v=check1`
- Wait for Pages CDN propagation

## 7. Operational Notes

- Render free plan can sleep on inactivity (cold starts)
- File-based logs in container storage are not durable across all restarts/redeploys
- If durable analytics is required, move logs to managed storage (DB/object store)

## 8. Quick Command Checklist

```bash
# Deploy latest code
git push origin main

# Health
curl -i https://temperature-visit-logger.onrender.com/health

# Mobile fallback test
curl -i 'https://temperature-visit-logger.onrender.com/api/log-visit?page=%2Ftemperature%2F&title=Outdoor+Comfort+Index&userAgent=mobile-test'

# Admin log read
ADMIN_TOKEN='<your-admin-token>'
curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://temperature-visit-logger.onrender.com/admin/recent?limit=20"
```
