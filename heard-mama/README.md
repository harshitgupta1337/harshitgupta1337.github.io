# Heard Mama

A free, static map of services for pregnant and postpartum mothers and their families.
Visitors enter a ZIP code (or share their location), pick the services they need, and see
matching providers in a list that follows the map. No accounts, no backend, no data collection.

## Run it locally

```bash
npm install            # only needed for the data build step
npm run build:data     # validates providers + regenerates data/providers.json and data/zips.json
npm run serve          # http://localhost:8080
```

Opening `index.html` directly from disk won't work: the page loads its data with `fetch`, which needs http.

## Host it

It's plain files. Publish the folder (without `node_modules/`, `tools/`, `package*.json`) on any static host:
GitHub Pages, Cloudflare Pages, Netlify, S3. The site loads nothing from third parties except the map
background tiles (see "Map tiles").

## Add or change providers

1. Edit `data/providers.src.json` (one object per provider; see fields below).
2. Run `npm run build:data`. It validates every record (unknown services, missing coordinates, non-https
   websites, bad dates) and expands `homeVisit.radiusMiles` into the list of ZIPs the provider serves.
3. Commit and deploy.

| Field | Notes |
|---|---|
| `id`, `name`, `blurb` | `id` must be unique and stable. |
| `services` | One or more ids from `data/services.json`. |
| `modes` | Any of `in_person`, `home_visit`, `virtual`. |
| `lat`, `lng`, `area` | Required for `in_person` and `home_visit`. `area` is shown on the card ("Newton, MA"); there is no street address on purpose. |
| `homeVisit` | `{ "radiusMiles": 10 }` or `{ "zips": ["02472", ...] }`. Only providers whose ZIP list contains the visitor's ZIP appear under "Comes to you". |
| `virtual` | `{}` = available everywhere, or `{ "states": ["MA","NH"] }` to restrict by state. |
| `insurance`, `cost`, `credentials`, `languages` | Shown on the card; `insurance` and `languages` drive the filters. |
| `phone`, `website` | `website` must start with `https://`. |
| `lastVerified` | `YYYY-MM-DD`. Older than `staleAfterDays` (config) shows "May be out of date". |
| `sample` | `true` shows a "Sample" tag. Remove it for real providers. |

To change services, categories or the stage bundles ("Expecting", "Newborn", ...), edit `data/services.json`.

## Map tiles (privacy and cost)

`js/config.js` points at OpenStreetMap's public tile server, which is fine for a prototype. Tile requests
reveal the visitor's IP address and the area they're viewing to the tile host. Before real traffic, move to a
provider with a free tier or host tiles yourself, then change `tileUrl` and `attribution`.

Everything else is self-hosted: Leaflet, the fonts (Jost, Cormorant Garamond), and the ZIP-to-coordinates table
(`data/zips.json`, built from the `zipcodes` npm package), so a ZIP is never sent to a geocoding service.
"Use my location" uses the browser's own geolocation; the coordinates stay in the page.

**Known limitation:** `data/zips.json` comes from a general ZIP list, which includes PO-box-only and unique ZIPs.
"Use my location" picks the nearest ZIP centroid, so it can land on one of those (for example 02239 in Boston).
For production, swap in Census ZCTA centroids (which exclude PO-box-only ZIPs) using the same
`{ "ZIP": [lat, lng, "ST"] }` shape.

## Theme

Colors and type follow viksityoga.com: deep forest greens, warm cream, terracotta accents, Cormorant Garamond
headings and Jost body text. Buttons use the darker terracotta (#A35A3C) so cream text meets contrast guidelines.

## Layout of the repo

```
index.html          page
css/styles.css      theme + layout
js/app.js           all behaviour
js/config.js        map start view, tile provider, staleness window
js/vendor/          Leaflet 1.9.4 (BSD-2)
fonts/              Jost + Cormorant Garamond (OFL), self-hosted
data/               services.json, providers.src.json (you edit), providers.json + zips.json (generated)
tools/              build-data.mjs (validate + build), seed-sample-data.mjs (one-off sample data)
```
