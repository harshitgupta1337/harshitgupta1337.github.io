// Validates data/providers.src.json and writes the files the site loads:
//   data/providers.json  (home-visit radius expanded into a list of ZIPs)
//   data/zips.json       (ZIP -> [lat, lng, state], so no geocoding API is needed)
// Usage: npm install && npm run build:data
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import zipcodes from 'zipcodes';

const root = new URL('../', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, root), 'utf8'));

// --- ZIP table -------------------------------------------------------------
const zips = {};
for (const [zip, r] of Object.entries(zipcodes.codes)) {
  // Skip military mail ZIPs (AA/AE/AP): the dataset places them overseas, which breaks "nearest ZIP" matching.
  if (['AA', 'AE', 'AP'].includes(r.state)) continue;
  if (r.latitude && r.longitude) zips[zip] = [+r.latitude.toFixed(3), +r.longitude.toFixed(3), r.state];
}
writeFileSync(new URL('data/zips.json', root), JSON.stringify(zips));

// --- Providers ---------------------------------------------------------------
const services = new Set(read('data/services.json').services.map((s) => s.id));
const MODES = new Set(['in_person', 'home_visit', 'virtual']);
const src = read('data/providers.src.json');
const errors = [];
const seen = new Set();

const miles = (a, b) => {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const providers = src.map((p) => {
  const where = `${p.id || '?'} (${p.name || 'no name'})`;
  const err = (m) => errors.push(`${where}: ${m}`);
  if (!p.id || seen.has(p.id)) err('missing or duplicate id'); seen.add(p.id);
  if (!p.name) err('name required');
  if (!Array.isArray(p.services) || !p.services.length) err('services required');
  for (const s of p.services || []) if (!services.has(s)) err(`unknown service "${s}"`);
  if (!Array.isArray(p.modes) || !p.modes.length) err('modes required');
  for (const m of p.modes || []) if (!MODES.has(m)) err(`unknown mode "${m}"`);
  const needsPlace = (p.modes || []).some((m) => m === 'in_person' || m === 'home_visit');
  if (needsPlace && !(Number.isFinite(p.lat) && Number.isFinite(p.lng))) err('lat/lng required for in_person or home_visit');
  if (p.website && !/^https:\/\//.test(p.website)) err('website must start with https://');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.lastVerified || '')) err('lastVerified must be YYYY-MM-DD');

  const rec = { ...p };
  if (p.homeVisit) {
    // Either list ZIPs yourself (homeVisit.zips) or give radiusMiles and we expand it.
    let list = p.homeVisit.zips;
    if (!list && p.homeVisit.radiusMiles && needsPlace) {
      list = Object.keys(zips).filter((z) => miles([p.lat, p.lng], zips[z]) <= p.homeVisit.radiusMiles);
    }
    if (!list || !list.length) err('homeVisit needs zips or radiusMiles');
    rec.homeZips = list || [];
    for (const z of rec.homeZips) if (!zips[z]) err(`unknown ZIP ${z}`);
    delete rec.homeVisit;
  }
  return rec;
});

if (errors.length) {
  console.error('Data problems:\n - ' + errors.join('\n - '));
  process.exit(1);
}
providers.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(
  new URL('data/providers.json', root),
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), providers })
);
console.log(`ok: ${providers.length} providers, ${Object.keys(zips).length} ZIPs`);
