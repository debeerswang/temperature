const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 8787);
const dataDir = path.join(__dirname, 'data');
const logFile = path.join(dataDir, 'visits.jsonl');
const adminToken = process.env.ADMIN_TOKEN || '';
const databaseUrl = process.env.DATABASE_URL || '';
const usePostgres = Boolean(databaseUrl);

let pool;

function isLocalDatabaseUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'postgres';
  } catch {
    return /localhost|127\.0\.0\.1|postgres/.test(url);
  }
}

if (usePostgres) {
  const isLocalDb = isLocalDatabaseUrl(databaseUrl);
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: isLocalDb ? false : { rejectUnauthorized: false },
  });
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://debeerswang.github.io,https://debeerswang.github.io/temperature/')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isLocalOrigin(origin) {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function isOriginAllowed(origin) {
  if (!origin) {
    return false;
  }
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return true;
  }
  // Allow local dev dashboards (any localhost/127.0.0.1 port) without exposing wildcard internet origins.
  return isLocalOrigin(origin);
}

fs.mkdirSync(dataDir, { recursive: true });

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
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

function readRecentEventsFromFile(limit) {
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

async function initStorage() {
  if (!usePostgres) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS visit_events (
      id BIGSERIAL PRIMARY KEY,
      ip TEXT,
      received_at TIMESTAMPTZ NOT NULL,
      transport TEXT,
      page TEXT,
      title TEXT,
      referrer TEXT,
      user_agent TEXT,
      language TEXT,
      screen TEXT,
      viewport TEXT,
      timezone TEXT,
      visited_at TIMESTAMPTZ
    )
  `);
}

async function appendVisitToPostgres(event) {
  await pool.query(
    `
      INSERT INTO visit_events (
        ip,
        received_at,
        transport,
        page,
        title,
        referrer,
        user_agent,
        language,
        screen,
        viewport,
        timezone,
        visited_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12
      )
    `,
    [
      event.ip,
      event.receivedAt,
      event.transport,
      event.page,
      event.title,
      event.referrer,
      event.userAgent,
      event.language,
      event.screen,
      event.viewport,
      event.timezone,
      event.visitedAt,
    ],
  );
}

async function readRecentEventsFromPostgres(limit) {
  const result = await pool.query(
    `
      SELECT
        ip,
        received_at,
        transport,
        page,
        title,
        referrer,
        user_agent,
        language,
        screen,
        viewport,
        timezone,
        visited_at
      FROM visit_events
      ORDER BY received_at DESC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map((row) => ({
    ip: row.ip,
    receivedAt: row.received_at,
    transport: row.transport,
    page: row.page,
    title: row.title,
    referrer: row.referrer,
    userAgent: row.user_agent,
    language: row.language,
    screen: row.screen,
    viewport: row.viewport,
    timezone: row.timezone,
    visitedAt: row.visited_at,
  }));
}

async function readRecentEvents(limit) {
  if (usePostgres) {
    return readRecentEventsFromPostgres(limit);
  }
  return readRecentEventsFromFile(limit);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

function buildVisitEvent(req, transport) {
  return {
    ip: getClientIp(req),
    receivedAt: new Date().toISOString(),
    transport,
    page: req.body?.page || req.query?.page || null,
    title: req.body?.title || req.query?.title || null,
    referrer: req.body?.referrer || req.query?.referrer || null,
    userAgent: req.body?.userAgent || req.query?.userAgent || req.headers['user-agent'] || null,
    language: req.body?.language || req.query?.language || null,
    screen: req.body?.screen || req.query?.screen || null,
    viewport: req.body?.viewport || req.query?.viewport || null,
    timezone: req.body?.timezone || req.query?.timezone || null,
    visitedAt: req.body?.visitedAt || req.query?.visitedAt || null,
  };
}

async function appendVisit(req, transport) {
  const event = buildVisitEvent(req, transport);

  if (usePostgres) {
    await appendVisitToPostgres(event);
    return;
  }

  fs.appendFileSync(logFile, JSON.stringify(event) + '\n', 'utf8');
}

app.post('/api/log-visit', async (req, res) => {
  try {
    await appendVisit(req, 'post');
    res.status(202).json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: 'Failed to store visit event' });
  }
});

app.get('/api/log-visit', async (req, res) => {
  try {
    await appendVisit(req, 'get');
    res.status(204).end();
  } catch {
    res.status(500).json({ ok: false, error: 'Failed to store visit event' });
  }
});

app.get('/admin/recent', async (req, res) => {
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

  try {
    const events = await readRecentEvents(limit);
    res.json({ ok: true, count: events.length, events });
  } catch {
    res.status(500).json({ ok: false, error: 'Failed to read visit events' });
  }
});

initStorage().then(() => {
  app.listen(port, () => {
    console.log(`Visit logger listening on http://localhost:${port}`);
    if (usePostgres) {
      console.log('Storage backend: PostgreSQL');
      return;
    }
    console.log(`Storage backend: file (${logFile})`);
  });
}).catch((error) => {
  console.error('Failed to initialize storage', error);
  process.exit(1);
});