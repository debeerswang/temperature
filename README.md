
# Climate Comfort

An interactive tool for understanding how temperature, humidity, dew point, and feels-like temperature relate to each other — and what your body actually responds to.

**Live site:** https://debeerswang.github.io/temperature/

---

## Background — Chat History

This project grew out of a conversation about indoor air conditioning performance and what makes air feel comfortable or muggy.

### 1. AC Performance Check (74°F / 67% RH indoors, 86°F / 60% RH outdoors)

The 12°F temperature drop is normal for residential AC. But indoor RH (67%) was *higher* than outdoor RH (60%), which seems counterintuitive. The explanation is physics: cooling air raises its relative humidity even without adding moisture. The real comparison is **dew point**:

- Outdoor dew point: ~70°F (uncomfortable)
- Indoor dew point: ~62°F (borderline)

So the AC *is* removing moisture — just not enough. 67% RH at 74°F still feels sticky.

**Common causes of poor dehumidification:**

- Fan set to ON instead of AUTO — blows after compressor cycles off, re-evaporating condensate
- Oversized unit — cools quickly but short-cycles before dehumidifying
- Dirty or iced evaporator coil
- Thermostat set too high — unit doesn't run long enough to wring out moisture

### 2. Body Feels Dew Point, Not RH

The body responds to **dew point**, not relative humidity. RH is relative to air temperature, so 50% RH at 90°F feels completely different from 50% RH at 60°F. Dew point measures the actual amount of moisture in the air regardless of temperature.

**Dew point comfort scale:**

| Dew Point | Comfort Level |
|-----------|---------------|
| Below 50°F | Dry |
| 50–55°F | Comfortable |
| 55–60°F | Pleasant |
| 60–65°F | Starting to feel humid |
| 65–70°F | Sticky, uncomfortable |
| Above 70°F | Oppressive |

### 3. Ideal Indoor Dew Point

**50–55°F** is the sweet spot. That translates to roughly 45–50% RH at typical thermostat settings (72–75°F). Dry enough to feel crisp, humid enough to avoid dry skin, static, and cracked wood furniture.

- Below 40°F dew point → too dry (common in winter with forced-air heat)
- Above 60°F dew point → stickiness begins, mold risk climbs

### 4. Feels-Like Temperature (Heat Index)

"Feels like" temperature reflects what your body actually perceives, driven by how efficiently sweat evaporates. High dew point = saturated air = slow evaporation = body traps heat.

**Rough relationship at 85°F air temp:**

| Dew Point | Feels Like |
|-----------|------------|
| 50°F | ~84°F |
| 60°F | ~88°F |
| 65°F | ~93°F |
| 70°F | ~97°F |
| 75°F | ~105°F+ |

The effect is nonlinear — each additional degree of dew point above 65°F adds disproportionately more perceived heat. This is why 90°F in Phoenix (dew point ~40°F) feels manageable but 85°F in Houston (dew point ~73°F) feels brutal.

### 5. The Visualization

The conversation led to building an interactive tool with:

- **Sliders** for air temperature (60–100°F) and relative humidity (10–95%)
- **Gauges** showing computed dew point and feels-like (heat index) with comfort labels
- **Contextual insight** explaining what your body is experiencing at the current settings
- **Heatmap** showing dew points across a matrix of temperature × RH combinations

**Formulas used:**

- **Dew point:** Magnus-Tetens approximation — `γ = (a·Tc)/(b+Tc) + ln(RH/100)`, then `Td = (b·γ)/(a-γ)` where a=17.27, b=237.7
- **Heat index:** Rothfusz regression equation (NWS standard) with low-humidity and high-humidity adjustments

---

## Files

| File | Description |
|------|-------------|
| `climate-comfort.html` | Self-contained HTML version with PWA meta tags, works offline |
| `climate-comfort.tsx` | React/TypeScript source version |
| `docs/index.html` | Copy used for GitHub Pages publishing |

## Deployment

The site is served via GitHub Pages from the `gh-pages` branch.

### To update the site:

1. Edit `climate-comfort.html`
2. Update `docs/index.html`:
   ```bash
   cp climate-comfort.html docs/index.html
   git add docs/index.html
   git commit -m "Update climate-comfort"
   git push origin main
   ```
3. Update the `gh-pages` branch:
   ```bash
   git checkout --orphan gh-pages
   git rm -rf .
   cp docs/index.html index.html
   git add index.html
   git commit -m "Publish update"
   git push -u origin gh-pages --force
   git checkout main
   ```

## Add to iPhone Home Screen

1. Open Safari → go to `debeerswang.github.io/temperature`
2. Tap share (↑) → **Add to Home Screen**
3. Launches fullscreen like a native app


# Temperature — Publish Notes

This repository contains files for the "Temperature" project and a published HTML report `climate-comfort.html`.

This README documents the actions taken and commands used during the session.

## Live site
- https://debeerswang.github.io/temperature/

## Current Logging Architecture

- Frontend portal emits visit events to the Render logger endpoint.
- Logger service runs from `logger/` and stores events in PostgreSQL when `DATABASE_URL` is configured.
- If `DATABASE_URL` is absent, logger falls back to local JSONL file storage.
- Admin endpoint for recent logs: `GET /admin/recent` (protected by `ADMIN_TOKEN`).
- Local dashboard instructions: [logs/README.md](logs/README.md)
- Local dashboard timestamps are displayed in `America/Chicago`.
- Event cards in the local dashboard expand every JSON field from each snapshot record.

## Self-hosting (replace Render)

If you prefer to run the logger on your own server instead of using Render, there's a lightweight Docker setup that runs the `logger` service with a local Postgres database.

Recommended flow (from the repository root):

```bash
# set an admin token first (use a long random string)
export ADMIN_TOKEN="replace-with-a-long-random-secret"
docker-compose up -d --build
```

Access the logger locally at `http://localhost:8787`. Health check: `http://localhost:8787/health`.

The dashboard workflow (see `logs/README.md`) can fetch events from `http://localhost:8787/admin/recent` using the `ADMIN_TOKEN`.

Data persistence details:
- PostgreSQL runs in Docker and stores data in a named volume `postgres_data`.
- Fallback JSON lines are written to `logger/data` on the host via a bind mount.

To stop and remove the services:

```bash
docker-compose down
```

If you want me to also add a small `systemd` or `launchd` unit to auto-start the stack on a server, tell me your target OS and I will scaffold it.

## Summary of actions performed

1. Located an unexpected Git repository at the workspace root (`/Users/debeerswang/Documents/Code/.git`). Backed it up:

   mv /Users/debeerswang/Documents/Code/.git /Users/debeerswang/Documents/Code/.git.backup

2. Initialized a new repository for the `Temperature` project at `Code/Temperature`, created an initial commit, and set remotes.

   cd /Users/debeerswang/Documents/Code/Temperature
   git init
   git add .
   git commit -m "Initial commit: Temperature project"

3. Fixed remote configuration and pushed `main` to the original remote:

   git remote add origin https://github.com/debeerswang/temperature.git
   git branch -M main
   git push -u origin main

4. To avoid overwriting the original remote initially, a temporary repo `temperature-new` was created, used, and then deleted. The temporary repo was removed from GitHub.

5. The `main` branch was force-pushed to `https://github.com/debeerswang/temperature.git` to ensure the repo root maps to `Code/Temperature` content.

   git push --force https://github.com/debeerswang/temperature.git main

6. Published `climate-comfort.html`:

   - Copied the HTML into `docs/index.html` and committed to `main`.
     mkdir -p docs && cp climate-comfort.html docs/index.html
     git add docs/index.html
     git commit -m "Publish climate-comfort to GitHub Pages (docs)"
     git push origin main

   - Created an orphan `gh-pages` branch containing `index.html` and force-pushed it so GitHub Pages can serve the site:

     git checkout --orphan gh-pages
     git rm -rf .
     cp docs/index.html index.html
     git add index.html
     git commit -m "Publish climate-comfort to gh-pages"
     git push -u origin gh-pages --force

7. Made the repository public (required for Pages on the current account plan) and verified the Pages build.

   gh repo edit debeerswang/temperature --visibility public --accept-visibility-change-consequences

Notes: Pages build was polled until the site returned HTTP 200.

## Files of interest
- `climate-comfort.html` — source HTML for the report
- `docs/index.html` — copy used for Pages publishing (committed to `main`)
- `gh-pages` branch — serves the site at the GitHub Pages URL

## Backup
- The original stray repository was moved to `/Users/debeerswang/Documents/Code/.git.backup`.

## How to update the site

1. Edit `climate-comfort.html` or the source `climate-comfort.tsx`.
2. Update `docs/index.html` (or re-generate it from the source):

   cp climate-comfort.html docs/index.html
   git add docs/index.html
   git commit -m "Update climate-comfort"
   git push origin main

3. (Optional) Update the `gh-pages` branch directly:

   git checkout --orphan gh-pages
   git rm -rf .
   cp docs/index.html index.html
   git add index.html
   git commit -m "Publish update"
   git push -u origin gh-pages --force
   git checkout main

## Next suggestions
- Add a `.gitignore` to exclude editor files and large assets.
- Protect `main` branch on GitHub if needed.

---
Generated by an automated session; if anything looks off, please ask me to adjust the README.
