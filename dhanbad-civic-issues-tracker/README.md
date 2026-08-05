# civic-issues-tracker

## Populate ward numbers

Set up the local Python environment:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Populate missing `ward_number` values in `issues-data.json` from `wards.geojson`:

```bash
.venv/bin/python scripts/populate_ward_numbers.py
```

Existing non-empty ward numbers are preserved. Issues outside every ward polygon are assigned `-1`.
