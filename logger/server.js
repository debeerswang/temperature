const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 8787);
const dataDir = path.join(__dirname, 'data');
const logFile = path.join(dataDir, 'visits.jsonl');
const adminToken = process.env.ADMIN_TOKEN || '';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://debeerswang.github.io,https://debeerswang.github.io/temperature/')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

fs.mkdirSync(dataDir, { recursive: true });

app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

function getProvidedAdminToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const queryToken = req.query.token;
  return typeof queryToken === 'string' ? queryToken.trim() : '';
}

function readRecentEvents(limit) {
  if (!fs.existsSync(logFile)) {
    return [];
  }
  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
  const slice = lines.slice(-limit);
  const parsed = [];
  for (const line of slice) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      // Skip malformed lines and continue.
    }
  }
  return parsed.reverse();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/log-visit', (req, res) => {
  const event = {
    ip: getClientIp(req),
    receivedAt: new Date().toISOString(),
    page: req.body?.page || null,
    title: req.body?.title || null,
    referrer: req.body?.referrer || null,
    userAgent: req.body?.userAgent || req.headers['user-agent'] || null,
    language: req.body?.language || null,
    screen: req.body?.screen || null,
    viewport: req.body?.viewport || null,
    timezone: req.body?.timezone || null,
    visitedAt: req.body?.visitedAt || null,
  };

  fs.appendFileSync(logFile, JSON.stringify(event) + '\n', 'utf8');
  res.status(202).json({ ok: true });
});

app.get('/admin/recent', (req, res) => {
  if (!adminToken) {
    return res.status(503).json({ ok: false, error: 'ADMIN_TOKEN is not configured on server' });
  }

  const providedToken = getProvidedAdminToken(req);
  if (!providedToken || providedToken !== adminToken) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const requestedLimit = Number.parseInt(String(req.query.limit || '50'), 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 500)
    : 50;

  const events = readRecentEvents(limit);
  res.json({ ok: true, count: events.length, events });
});

app.listen(port, () => {
  console.log(`Visit logger listening on http://localhost:${port}`);
  console.log(`Writing logs to ${logFile}`);
});