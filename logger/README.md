# Temperature Visit Logger

This service records page views for the published Temperature page and captures the client IP address on the server side.

## What it does

- Accepts `POST /api/log-visit`
- Determines the visitor IP from `X-Forwarded-For` or the socket remote address
- Appends each visit as one JSON line to `logger/data/visits.jsonl`

## Start locally

```bash
cd /Users/debeerswang/Documents/Code/Temperature/logger
npm install
npm start
```

The published page is configured to post to `http://localhost:8787/api/log-visit` by default.

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

After Render gives you the public URL, update the `visit-log-endpoint` meta tag in both page files to:

```text
https://your-render-service.onrender.com/api/log-visit
```

## CORS

Allowed origins are controlled by `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS="https://debeerswang.github.io,http://localhost:3000" npm start
```

## Privacy note

IP addresses are personal data in many jurisdictions. If you enable this logger publicly, you should add an appropriate privacy notice and make sure your data retention policy is intentional.