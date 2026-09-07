# Door-to-Door Garbage Collection Map

This directory contains the crowd-sourced ward map and its static webpage.

## Download the Google Sheet

Share the sheet with the service account email address, then run:

```bash
./venv/bin/python door-to-door-garbage/fetch_google_sheet.py \
  SHEET_ID path/to/service-account-key.json
```

The first worksheet is saved as `latest-google-form-responses.csv` in this directory.

## Populate the derived columns

Fill missing `Ward Number` and `Collection Status` values in place:

```bash
./venv/bin/python door-to-door-garbage/populate_google_form_responses.py \
  door-to-door-garbage/latest-google-form-responses.csv
```

Collection statuses are derived from `collection-status-mapping.json`.

## Run with GitHub Actions

The `Update garbage collection map` workflow runs daily at 00:15 UTC and can
also be started manually from the repository's **Actions** tab.

Configure these under **Settings > Secrets and variables > Actions**:

- Variable `GOOGLE_SHEET_ID`: the Google Sheet ID.
- Secret `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`: the complete contents of the
  service-account key JSON file.

The workflow downloads the sheet, populates the derived columns, regenerates
the map and statistics, and commits changed generated files to the repository.

## Regenerate the map and statistics

From the repository root, pass the latest Google Forms responses CSV to the plotter:

```bash
./venv/bin/python door-to-door-garbage/plot_ward_garbage_collection.py \
  door-to-door-garbage/latest-google-form-responses.csv
```

The CSV must contain `Timestamp`, `Ward Number`, and `Collection Status`. Status `0` means no collection, `1` means irregular collection, and `2` means regular collection.

The command always replaces these generated files in this directory:

- `ward-garbage-collection.png`: annotated ward map used by the webpage.
- `ward-garbage-collection-stats.json`: snapshot date, response totals, ward coverage, and final ward statuses.

## Data flow

The plotter reads the response CSV and joins it to ward boundaries from `../wards.geojson`. For wards with multiple responses, the most reported status wins; a tie is resolved in favor of the higher status. It then generates the PNG and stats JSON.

`index.html` displays the PNG. `script.js` loads the stats JSON and fills in the survey date, status counts, response count, and ward coverage. Serve the files over HTTP because browsers generally block JSON requests from a directly opened local HTML file.