# Know Your Ward — Mai Hoon Dhanbad

A static, bilingual ward finder for Dhanbad Municipal Corporation. It runs entirely in the visitor's browser using Leaflet, Turf.js, and OpenStreetMap. There is no backend, database, build step, or location-tracking service.

## Important: verify data before launch

`wards.geojson` contains real ward geometry from the local SBM ward dump and 2026 councillor names from `councillors_2026.csv`. **Phone numbers and LGD ward codes are still pending** and must be replaced with verified official data when available.

The geometry source contains all 55 Dhanbad Municipal Corporation wards as WGS84 Polygons. Councillor and reservation details are joined by ward number from the CSV.

## Prepare the ward data

The source file is newline-delimited GeoJSON (GeoJSONL): each line is one `Feature`, rather than the complete `FeatureCollection` browsers expect. `prepare_wards.py` streams the large file, selects records whose string-valued `ulbcode` is `801775`, joins `councillors_2026.csv`, validates both sources contain wards 1–55 exactly once, and writes a compact `wards.geojson`.

From the repository root, run:

```bash
./venv/bin/python prepare_wards.py
```

Custom paths are also supported:

```bash
./venv/bin/python prepare_wards.py \
  --input path/to/source.geojsonl \
  --councillors path/to/councillors.csv \
  --output wards.geojson
```

Each output feature must retain this property schema:

```json
{
  "ward_no": 54,
  "ward_name": "Ward 54",
  "councillor_name": "नीरज कुमार सिंह",
  "councillor_name_en": "",
  "reservation_category": "अनारक्षित",
  "reservation_category_en": "Unreserved/General",
  "gender_category": "अन्य(Other)",
  "councillor_phone": "+91 98765 43210",
  "lgd_ward_code": "Verified LGD code"
}
```

Geometry must be valid GeoJSON `Polygon` or `MultiPolygon` in WGS84/EPSG:4326 coordinates: `[longitude, latitude]`. Additional properties are safe to retain. Keep `ward_no`, `ward_name`, `councillor_name`, `councillor_name_en`, `councillor_phone`, and `lgd_ward_code` unchanged so the website needs no code changes. The result reserves a line for `councillor_name_en`: it stays blank when empty and displays automatically when a verified English name is supplied.

Update `councillors_2026.csv` and rerun the preprocessor whenever councillor information changes. Do not edit generated names directly in `wards.geojson`, because regeneration overwrites them.

## Run locally

The page fetches `wards.geojson`, so opening `index.html` through a `file://` URL will not work in most browsers. Serve the directory over HTTP:

```bash
./venv/bin/python -m http.server 8000
```

Open `http://localhost:8000/`. Browser geolocation normally requires HTTPS, but browsers treat `localhost` as a secure development origin.

Leaflet, Turf.js, Google Fonts, and OpenStreetMap tiles load from the internet. Ward lookup and point-in-polygon matching happen locally; the code does not send GPS coordinates to MHD or any API.

## Deploy

### GitHub Pages

1. Push `index.html`, `style.css`, `script.js`, and `wards.geojson` to the published branch.
2. In repository **Settings → Pages**, choose **Deploy from a branch**.
3. Select the branch and root directory, then save.
4. Test GPS on the resulting HTTPS URL.

### Netlify

Drag this repository directory into Netlify Drop, or connect the Git repository. Set the publish directory to the repository root. Leave the build command empty.

Do not deploy the large `dataset/`, master-plan images, PDFs, or Python virtual environment with the public site. A clean deployment needs only the four web files above; `README.md` may also be published.

## Embed on the GoDaddy site

Replace the example URL with the deployed HTTPS address:

```html
<style>
  .mhd-ward-tool {
    width: 100%;
    height: 1250px;
    border: 0;
  }

  @media (max-width: 640px) {
    .mhd-ward-tool {
      height: 1650px;
    }
  }
</style>

<iframe
  class="mhd-ward-tool"
  src="https://example.netlify.app/"
  title="Know Your Ward — Mai Hoon Dhanbad"
  loading="lazy"
  allow="geolocation"
></iframe>
```

The `allow="geolocation"` attribute is required for GPS access inside a cross-origin iframe. The embedded page does not navigate or resize its parent. If GoDaddy applies a restrictive Permissions Policy, geolocation may still be unavailable; the manual ward selector always remains usable.

## Launch checklist

- Replace all placeholder councillor, phone, and LGD values.
- Confirm the boundaries against MHD's approved digitized ward file.
- Test several known addresses, especially near ward boundaries.
- Test both GPS permission approval and denial on Android and iPhone.
- Confirm the deployed host allows OpenStreetMap, Leaflet, Turf.js, and Google Fonts.
- Keep OpenStreetMap attribution visible on the map.