// Site settings. Edit here, no code changes needed.
window.HEARD_MAMA_CONFIG = {
  // Where the map opens before anyone searches.
  defaultCenter: [42.36, -71.10],
  defaultZoom: 10,

  // Map background. OpenStreetMap's public tile server is fine for a prototype
  // (light use, attribution required). Before real traffic, switch to a tile provider
  // with a free tier or host tiles yourself, then change tileUrl + attribution.
  // Set tileUrl to null for a map with no background at all.
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',

  // Listings older than this get an "may be out of date" label.
  staleAfterDays: 180,

  // If a visitor's location is farther than this from any ZIP we know, ask for a ZIP.
  maxZipMatchMiles: 40,
};
