#!/usr/bin/env python3
"""Build a local dashboard from JSON log snapshots in ./logs.

Outputs:
  - logs/combined_dedup.json
  - logs/dashboard.html
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parent
LOG_DIR = ROOT_DIR / "logs"
OUTPUT_JSON = LOG_DIR / "combined_dedup.json"
OUTPUT_HTML = LOG_DIR / "dashboard.html"
CHICAGO_TZ = ZoneInfo("America/Chicago")


def parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def to_chicago(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(CHICAGO_TZ)


def load_events_from_file(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if isinstance(payload, dict) and isinstance(payload.get("events"), list):
        return [event for event in payload["events"] if isinstance(event, dict)]

    if isinstance(payload, list):
        return [event for event in payload if isinstance(event, dict)]

    return []


def deduplicate_events(events: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    duplicates = 0

    for event in events:
        signature = json.dumps(event, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        if signature in seen:
            duplicates += 1
            continue
        seen.add(signature)
        unique.append(event)

    return unique, duplicates


def classify_device(user_agent: str | None) -> str:
    ua = (user_agent or "").lower()
    if any(token in ua for token in ["iphone", "android", "mobile", "wechat", "micromessenger"]):
        return "mobile"
    if any(token in ua for token in ["ipad", "tablet"]):
        return "tablet"
    if ua:
        return "desktop"
    return "unknown"


def top_items(counter: Counter[str], limit: int = 10) -> list[dict[str, Any]]:
    return [{"label": key, "count": value} for key, value in counter.most_common(limit)]


def compute_insights(files: list[str], raw_events: list[dict[str, Any]], unique_events: list[dict[str, Any]], duplicates: int) -> dict[str, Any]:
    ip_counter: Counter[str] = Counter()
    page_counter: Counter[str] = Counter()
    lang_counter: Counter[str] = Counter()
    tz_counter: Counter[str] = Counter()
    transport_counter: Counter[str] = Counter()
    device_counter: Counter[str] = Counter()
    hourly_counter: Counter[str] = Counter()
    daily_counter: Counter[str] = Counter()

    parsed_times: list[datetime] = []

    for event in unique_events:
        ip_counter[event.get("ip") or "unknown"] += 1
        page_counter[event.get("page") or "unknown"] += 1
        lang_counter[event.get("language") or "unknown"] += 1
        tz_counter[event.get("timezone") or "unknown"] += 1
        transport_counter[event.get("transport") or "unknown"] += 1
        device_counter[classify_device(event.get("userAgent"))] += 1

        ts = to_chicago(parse_iso(event.get("receivedAt")))
        if ts:
            parsed_times.append(ts)
            hourly_counter[f"{ts.hour:02d}:00 America/Chicago"] += 1
            daily_counter[ts.date().isoformat()] += 1

    earliest = min(parsed_times).isoformat() if parsed_times else None
    latest = max(parsed_times).isoformat() if parsed_times else None

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "filesProcessed": files,
        "rawEventCount": len(raw_events),
        "uniqueEventCount": len(unique_events),
        "duplicatesRemoved": duplicates,
        "timeRange": {
            "earliestReceivedAt": earliest,
            "latestReceivedAt": latest,
        },
        "topIPs": top_items(ip_counter),
        "topPages": top_items(page_counter),
        "topLanguages": top_items(lang_counter),
        "topTimezones": top_items(tz_counter),
        "transportBreakdown": top_items(transport_counter),
        "deviceBreakdown": top_items(device_counter),
        "hourlyBreakdown": top_items(hourly_counter, limit=24),
        "dailyBreakdown": top_items(daily_counter, limit=30),
    }


def build_dashboard_html(summary: dict[str, Any], events: list[dict[str, Any]]) -> str:
    payload = json.dumps({"summary": summary, "events": events}, ensure_ascii=False)
    payload = payload.replace("</", "<\\/")

    template = """<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>Temperature Logs Dashboard</title>
  <style>
    :root {
      --bg: #f4f7fb;
      --panel: #ffffff;
      --ink: #0f172a;
      --muted: #475569;
      --accent: #0f766e;
      --accent-soft: #ccfbf1;
      --border: #dbe4ee;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: radial-gradient(circle at top right, #dff7f3, var(--bg) 45%); }
    .wrap { max-width: 1160px; margin: 0 auto; padding: 24px; }
    .hero { background: linear-gradient(120deg, #0f766e, #0ea5a3); color: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(15,118,110,0.25); }
    .hero h1 { margin: 0 0 8px; font-size: 1.6rem; }
    .hero p { margin: 0; opacity: 0.95; }
    .controls { margin-top: 14px; background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 12px; }
    .control-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; }
    .control label { display: block; font-size: 0.82rem; color: var(--muted); margin-bottom: 4px; }
    .control input { width: 100%; padding: 9px 10px; border: 1px solid var(--border); border-radius: 9px; }
    .control-actions { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
    button { border: 1px solid transparent; border-radius: 10px; padding: 9px 12px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0f766e; color: #fff; }
    button.secondary { background: #fff; color: var(--ink); border-color: var(--border); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { margin-top: 8px; font-size: 0.86rem; color: var(--muted); min-height: 1.2em; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 18px 0; }
    .card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 14px; }
    .card .label { color: var(--muted); font-size: 0.85rem; }
    .card .value { margin-top: 4px; font-size: 1.35rem; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
    .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 14px; }
    .panel h2 { margin: 0 0 10px; font-size: 1.05rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #edf2f7; }
    th { color: var(--muted); font-weight: 600; }
    .bar { height: 8px; border-radius: 999px; background: var(--accent-soft); overflow: hidden; }
    .bar > i { display: block; height: 8px; background: var(--accent); }
    .event-list { max-height: 480px; overflow: auto; }
    .event { border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin-bottom: 8px; background: #fff; }
    .event .meta { color: var(--muted); font-size: 0.82rem; margin-bottom: 4px; }
    .event code { font-size: 0.78rem; }
  </style>
</head>
<body>
  <div class=\"wrap\">
    <section class=\"hero\">
      <h1>Temperature Visit Logs Dashboard</h1>
      <p>Combined and deduplicated insights from all JSON snapshots in the logs folder.</p>
    </section>

    <section class=\"controls\">
      <div class=\"control-grid\">
        <div class=\"control\">
          <label for=\"endpoint\">Admin endpoint</label>
          <input id=\"endpoint\" value=\"https://temperature-visit-logger.onrender.com/admin/recent\" />
        </div>
        <div class=\"control\">
          <label for=\"token\">ADMIN_TOKEN (for refresh)</label>
          <input id=\"token\" type=\"password\" placeholder=\"Enter token\" />
        </div>
        <div class=\"control\">
          <label for=\"limit\">Limit</label>
          <input id=\"limit\" type=\"number\" min=\"1\" max=\"1000\" value=\"200\" />
        </div>
      </div>
      <div class=\"control-actions\">
        <button id=\"refreshBtn\" class=\"primary\">Refresh From Server</button>
        <button id=\"downloadBtn\" class=\"secondary\">Download Snapshot JSON</button>
        <button id=\"saveBtn\" class=\"secondary\">Save Snapshot To Folder</button>
      </div>
      <div id=\"status\" class=\"status\"></div>
    </section>

    <section id=\"cards\" class=\"cards\"></section>

    <section class=\"grid\">
      <article class=\"panel\">
        <h2>Top IPs</h2>
        <div id=\"topIPs\"></div>
      </article>
      <article class=\"panel\">
        <h2>Top Pages</h2>
        <div id=\"topPages\"></div>
      </article>
      <article class=\"panel\">
        <h2>Transport Breakdown</h2>
        <div id=\"transportBreakdown\"></div>
      </article>
      <article class=\"panel\">
        <h2>Device Breakdown</h2>
        <div id=\"deviceBreakdown\"></div>
      </article>
      <article class=\"panel\">
        <h2>Top Languages</h2>
        <div id=\"topLanguages\"></div>
      </article>
      <article class=\"panel\">
        <h2>Top Timezones</h2>
        <div id=\"topTimezones\"></div>
      </article>
      <article class=\"panel\">
        <h2>Daily Breakdown</h2>
        <div id=\"dailyBreakdown\"></div>
      </article>
      <article class=\"panel\">
        <h2>Hourly Breakdown (America/Chicago)</h2>
        <div id=\"hourlyBreakdown\"></div>
      </article>
    </section>

    <section class=\"panel\" style=\"margin-top:14px\">
      <h2>Recent Deduplicated Events</h2>
      <div id=\"events\" class=\"event-list\"></div>
    </section>
  </div>

  <script id=\"dashboard-data\" type=\"application/json\">__DASHBOARD_PAYLOAD__</script>
  <script>
    const payload = JSON.parse(document.getElementById('dashboard-data').textContent);
    const state = {
      events: payload.events || [],
      rawEventCount: payload.summary?.rawEventCount || (payload.events || []).length,
      filesProcessed: payload.summary?.filesProcessed || [],
      latestSnapshot: null,
    };

    function canonicalize(value) {
      if (Array.isArray(value)) {
        return value.map(canonicalize);
      }
      if (value && typeof value === 'object') {
        const sorted = {};
        Object.keys(value).sort().forEach((key) => {
          sorted[key] = canonicalize(value[key]);
        });
        return sorted;
      }
      return value;
    }

    function dedupeEvents(events) {
      const seen = new Set();
      const unique = [];
      let duplicates = 0;

      for (const event of events) {
        const key = JSON.stringify(canonicalize(event));
        if (seen.has(key)) {
          duplicates += 1;
          continue;
        }
        seen.add(key);
        unique.push(event);
      }
      return { unique, duplicates };
    }

    function classifyDevice(userAgent) {
      const ua = (userAgent || '').toLowerCase();
      if (['iphone', 'android', 'mobile', 'wechat', 'micromessenger'].some((t) => ua.includes(t))) return 'mobile';
      if (['ipad', 'tablet'].some((t) => ua.includes(t))) return 'tablet';
      if (ua) return 'desktop';
      return 'unknown';
    }

    function topItems(counter, limit = 10) {
      return Array.from(counter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, count]) => ({ label, count }));
    }

    function parseTime(ts) {
      if (!ts) return null;
      const t = new Date(ts);
      return Number.isNaN(t.getTime()) ? null : t;
    }

    function formatChicago(ts) {
      const t = parseTime(ts);
      if (!t) return 'N/A';
      return t.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
      });
    }

    function chicagoDateKey(ts) {
      const t = parseTime(ts);
      if (!t) return null;
      return t.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    }

    function chicagoHourLabel(ts) {
      const t = parseTime(ts);
      if (!t) return null;
      const hour = t.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit',
        hour12: false
      });
      return `${hour}:00 America/Chicago`;
    }

    function sortEventsByReceivedAtDesc(events) {
      return [...events].sort((left, right) => {
        const leftTime = parseTime(left.receivedAt)?.getTime() || 0;
        const rightTime = parseTime(right.receivedAt)?.getTime() || 0;
        return rightTime - leftTime;
      });
    }

    function computeSummary(files, rawEvents, uniqueEvents, duplicatesRemoved) {
      const ip = new Map();
      const page = new Map();
      const lang = new Map();
      const tz = new Map();
      const transport = new Map();
      const device = new Map();
      const hourly = new Map();
      const daily = new Map();
      const times = [];

      for (const event of uniqueEvents) {
        const add = (map, key) => map.set(key, (map.get(key) || 0) + 1);
        add(ip, event.ip || 'unknown');
        add(page, event.page || 'unknown');
        add(lang, event.language || 'unknown');
        add(tz, event.timezone || 'unknown');
        add(transport, event.transport || 'unknown');
        add(device, classifyDevice(event.userAgent));

        const t = parseTime(event.receivedAt);
        if (t) {
          times.push(t);
          const hourLabel = chicagoHourLabel(event.receivedAt);
          const dayLabel = chicagoDateKey(event.receivedAt);
          if (hourLabel) add(hourly, hourLabel);
          if (dayLabel) add(daily, dayLabel);
        }
      }

      times.sort((a, b) => a - b);

      return {
        filesProcessed: files,
        rawEventCount: rawEvents.length,
        uniqueEventCount: uniqueEvents.length,
        duplicatesRemoved,
        timeRange: {
          earliestReceivedAt: times[0] ? times[0].toISOString() : null,
          latestReceivedAt: times[times.length - 1] ? times[times.length - 1].toISOString() : null,
        },
        topIPs: topItems(ip),
        topPages: topItems(page),
        topLanguages: topItems(lang),
        topTimezones: topItems(tz),
        transportBreakdown: topItems(transport),
        deviceBreakdown: topItems(device),
        hourlyBreakdown: topItems(hourly, 24),
        dailyBreakdown: topItems(daily, 30),
      };
    }

    function renderTable(targetId, rows) {
      const target = document.getElementById(targetId);
      target.innerHTML = '';
      const max = Math.max(1, ...rows.map(r => r.count));
      const table = document.createElement('table');
      table.innerHTML = '<thead><tr><th>Label</th><th>Count</th><th>Share</th></tr></thead>';
      const tbody = document.createElement('tbody');
      rows.forEach((row) => {
        const tr = document.createElement('tr');
        const pct = Math.round((row.count / max) * 100);
        tr.innerHTML = `<td>${row.label}</td><td>${row.count}</td><td><div class=\"bar\"><i style=\"width:${pct}%\"></i></div></td>`;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      target.appendChild(table);
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function formatValue(value) {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (value instanceof Date) return value.toISOString();
      if (Array.isArray(value)) return `[${value.map((item) => formatValue(item)).join(', ')}]`;
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    }

    function renderAllFields(event) {
      const entries = Object.entries(event || {});
      if (!entries.length) {
        return '<div class="meta">No event fields available.</div>';
      }

      const rows = entries.map(([key, value]) => {
        const rendered = formatValue(value);
        const isMultiline = rendered.includes('\\n');
        return `
          <tr>
            <th>${escapeHtml(key)}</th>
            <td>${isMultiline ? `<pre>${escapeHtml(rendered)}</pre>` : escapeHtml(rendered)}</td>
          </tr>
        `;
      }).join('');

      return `<table class="event-detail-table"><tbody>${rows}</tbody></table>`;
    }

    function renderDashboard(summary, events) {
      const sortedEvents = sortEventsByReceivedAtDesc(events);
      const cardData = [
        ['Files', summary.filesProcessed.length],
        ['Raw Events', summary.rawEventCount],
        ['Unique Events', summary.uniqueEventCount],
        ['Duplicates Removed', summary.duplicatesRemoved],
        ['Earliest (Chicago)', formatChicago(summary.timeRange.earliestReceivedAt)],
        ['Latest (Chicago)', formatChicago(summary.timeRange.latestReceivedAt)]
      ];

      const cards = document.getElementById('cards');
      cards.innerHTML = '';
      cardData.forEach(([label, value]) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.innerHTML = `<div class=\"label\">${label}</div><div class=\"value\">${value}</div>`;
        cards.appendChild(card);
      });

      ['topIPs', 'topPages', 'topLanguages', 'topTimezones', 'transportBreakdown', 'deviceBreakdown', 'dailyBreakdown', 'hourlyBreakdown']
        .forEach((key) => renderTable(key, summary[key] || []));

      const eventsWrap = document.getElementById('events');
      eventsWrap.innerHTML = '';
      sortedEvents.forEach((event) => {
        const item = document.createElement('div');
        item.className = 'event';
        item.innerHTML = `
          <div class=\"meta\">${formatChicago(event.receivedAt)} | ${event.ip || 'unknown ip'} | ${event.transport || 'unknown transport'}</div>
          <div><strong>${escapeHtml(event.title || '(no title)')}</strong> on <code>${escapeHtml(event.page || 'unknown page')}</code></div>
          <div class="meta">lang=${escapeHtml(event.language || 'n/a')} timezone=${escapeHtml(event.timezone || 'n/a')}</div>
          ${renderAllFields(event)}
        `;
        eventsWrap.appendChild(item);
      });
    }

    function timestampName() {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      return `recent_${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}.json`;
    }

    function setStatus(text, isError = false) {
      const el = document.getElementById('status');
      el.textContent = text;
      el.style.color = isError ? '#b91c1c' : 'var(--muted)';
    }

    function downloadSnapshot(snapshot, fileName) {
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    async function saveSnapshotToFolder(snapshot, fileName) {
      if (!window.showDirectoryPicker) {
        throw new Error('Folder save is not supported in this browser. Use Download Snapshot JSON.');
      }
      const dir = await window.showDirectoryPicker();
      const handle = await dir.getFileHandle(fileName, { create: true });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(snapshot, null, 2));
      await writable.close();
    }

    async function refreshFromServer() {
      const endpoint = document.getElementById('endpoint').value.trim();
      const token = document.getElementById('token').value.trim();
      const limit = document.getElementById('limit').value.trim() || '200';
      const btn = document.getElementById('refreshBtn');

      if (!endpoint || !token) {
        setStatus('Endpoint and ADMIN_TOKEN are required to refresh.', true);
        return;
      }

      btn.disabled = true;
      setStatus('Refreshing from server...');
      try {
        const url = `${endpoint}?limit=${encodeURIComponent(limit)}`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) {
          const body = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${body.slice(0, 180)}`);
        }
        const data = await resp.json();
        const serverEvents = Array.isArray(data.events) ? data.events : [];
        const merged = [...state.events, ...serverEvents];
        const deduped = dedupeEvents(merged);
        const sortedUnique = sortEventsByReceivedAtDesc(deduped.unique);

        state.events = sortedUnique;
        state.rawEventCount = merged.length;
        state.latestSnapshot = {
          ok: true,
          count: serverEvents.length,
          events: sortEventsByReceivedAtDesc(serverEvents),
        };

        const summary = computeSummary(
          [...state.filesProcessed, '(manual refresh)'],
          merged,
          sortedUnique,
          deduped.duplicates
        );
        renderDashboard(summary, sortedUnique);
        setStatus(`Refresh complete. Pulled ${serverEvents.length} events and deduplicated to ${sortedUnique.length}.`);
      } catch (err) {
        setStatus(`Refresh failed: ${err.message}`, true);
      } finally {
        btn.disabled = false;
      }
    }

    document.getElementById('refreshBtn').addEventListener('click', refreshFromServer);
    document.getElementById('downloadBtn').addEventListener('click', () => {
      const snapshot = state.latestSnapshot || { ok: true, count: state.events.length, events: state.events };
      const name = timestampName();
      downloadSnapshot(snapshot, name);
      setStatus(`Downloaded ${name}. Move it into logs folder if needed.`);
    });
    document.getElementById('saveBtn').addEventListener('click', async () => {
      const snapshot = state.latestSnapshot || { ok: true, count: state.events.length, events: state.events };
      const name = timestampName();
      try {
        await saveSnapshotToFolder(snapshot, name);
        setStatus(`Saved ${name} to selected folder.`);
      } catch (err) {
        setStatus(`Save failed: ${err.message}`, true);
      }
    });

    renderDashboard(payload.summary, state.events);
    setStatus('Loaded local snapshots. Use Refresh From Server to repopulate JSON snapshots manually.');
  </script>
</body>
</html>
"""

    return template.replace("__DASHBOARD_PAYLOAD__", payload)


def main() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    log_files = sorted(
        path for path in LOG_DIR.glob("*.json") if path.name != OUTPUT_JSON.name
    )

    all_events: list[dict[str, Any]] = []
    loaded_files: list[str] = []

    for file_path in log_files:
        try:
            file_events = load_events_from_file(file_path)
        except (json.JSONDecodeError, OSError):
            continue

        if not file_events:
            continue

        loaded_files.append(file_path.name)
        all_events.extend(file_events)

    unique_events, duplicates = deduplicate_events(all_events)
    unique_events.sort(
        key=lambda event: parse_iso(event.get("receivedAt")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    summary = compute_insights(loaded_files, all_events, unique_events, duplicates)
    OUTPUT_JSON.write_text(
        json.dumps({"summary": summary, "events": unique_events}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    OUTPUT_HTML.write_text(build_dashboard_html(summary, unique_events), encoding="utf-8")

    print(f"Processed files: {len(loaded_files)}")
    print(f"Raw events: {len(all_events)}")
    print(f"Unique events: {len(unique_events)}")
    print(f"Duplicates removed: {duplicates}")
    print(f"Wrote: {OUTPUT_JSON}")
    print(f"Wrote: {OUTPUT_HTML}")


if __name__ == "__main__":
    main()
