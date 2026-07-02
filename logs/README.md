# Local Logs Dashboard

This folder holds timestamped JSON snapshots exported from the Temperature visit logger, plus a generated dashboard that combines them into one deduplicated view.

## Files

- `recent_YYYYMMDD_HHMMSS.json` - timestamped exports from `/admin/recent`
- `combined_dedup.json` - combined and deduplicated dataset used by the dashboard
- `dashboard.html` - local portal for summaries, charts, and the full unique event list

## Build the dashboard

Run the generator from the repository root whenever you add new snapshot files:

```bash
cd /Users/debeerswang/Documents/Code/Temperature
python3 build_logs_dashboard.py
```

The script scans all JSON files in this folder, removes duplicate records, and regenerates both `combined_dedup.json` and `dashboard.html`.

## Open the dashboard locally

Serve the repository root with any static server, then open the dashboard file:

```bash
cd /Users/debeerswang/Documents/Code/Temperature
python3 -m http.server 8081
```

Open:

```text
http://localhost:8081/logs/dashboard.html
```

## Manual refresh workflow

Use the portal controls to fetch the latest server events, then save or download a new timestamped JSON snapshot:

1. Enter the admin token.
2. Click `Refresh From Server`.
3. Click `Download Snapshot JSON` or `Save Snapshot To Folder`.
4. Re-run `python3 build_logs_dashboard.py` to merge the new file into the dashboard.

## Notes

- The bottom event list is sorted by `receivedAt` descending.
- Duplicate records are removed before rendering the combined view.
- If the browser blocks the refresh call, make sure the logger service has been redeployed after the latest CORS update.