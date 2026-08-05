# Civic Issues Tracker Dashboard Code Flow

This document explains how the static MVP works from page load to interaction.

## 1. Page load

The browser loads `index.html`, which pulls in two pieces in this order:

1. Leaflet CSS and JavaScript from a CDN.
2. `app.js`, which fetches the mock issue records from `issues-data.json`, then wires up the map, filters, list, and modal.

That order matters because Leaflet must be available before the app starts rendering.

## 2. Layout

The page has a top toolbar above two main workspace regions:

- The top toolbar holds the dashboard title, search field, category filter, status filter, and ward filter.
- The left sidebar holds the results summary and issue cards for the current map view.
- The right panel holds the Leaflet map.

On smaller screens the layout stacks vertically, but the same logic still applies.

## 3. Application state

`app.js` keeps the live UI state in one object:

- `searchText` stores the current text search.
- `category` stores the selected issue category.
- `status` stores the selected issue status.
- `ward` stores the selected ward number.
- `selectedIssueId` tracks which issue is currently focused.
- `activeBounds` stores the current Leaflet viewport bounds.
- `markersById` maps each issue id to its Leaflet marker.

Centralizing these values makes it easy to re-run the same filter logic whenever any input changes.

## 4. Map initialization

When the DOM is ready, the script creates a Leaflet map centered on Dhanbad.

Then it adds an OpenStreetMap tile layer, renders the ward polygons from `wards.geojson`, and creates a circle marker for every issue in the mock dataset. Ward boundaries appear below issue markers and show their ward number on hover.

Each marker:

- Opens a popup with the issue title, category, and status.
- Calls the same `focusIssue()` function used by the sidebar cards.

That shared path keeps map clicks and list clicks consistent.

## 5. Filtering logic

The sidebar list is rebuilt whenever one of these changes:

- the search input changes,
- the category changes,
- the user pans or zooms the map.

The filter checks three conditions for every issue:

- The issue text must match the search query.
- The issue category must match the selected category, unless the dropdown is set to `All`.
- The issue status must match the selected status, unless the dropdown is set to `All`.
- The issue ward number must match the selected ward, unless the dropdown is set to `All`.
- The issue coordinates must fall inside `map.getBounds()`.

Only issues that pass all three checks are rendered into the list.

## 6. Viewport sync

Leaflet emits `moveend` and `zoomend` when the visible map area changes.

`app.js` listens for both events, refreshes `activeBounds` from `map.getBounds()`, and then re-runs the sidebar filter.

This is the core behavior that keeps the list aligned with the visible map viewport.

## 7. Issue focus behavior

When the user clicks an issue card:

- The app stores that issue id as the selected issue.
- The matching marker is highlighted.
- The map pans and zooms toward the issue.
- The marker popup opens.

When the user clicks a marker on the map, the app runs the same selection path, so the sidebar and map stay in sync.

## 8. Media modal

Clicking a thumbnail opens the modal overlay.

The app checks the media metadata:

- `type: "image"` renders an `<img>` element.
- `type: "video"` renders an HTML5 `<video>` element with controls and autoplay.

The modal closes when:

- the user clicks the `×` button,
- the user clicks the dark backdrop outside the media frame,
- the user presses Escape.

Before the modal closes, the script pauses any video and clears the modal content so playback cannot continue in the background.

## 9. Why this structure works well for MVP work

This setup stays simple because it avoids a backend and avoids framework overhead.

It is still expressive enough to demonstrate the important product behavior:

- local data loading,
- map-driven list filtering,
- bidirectional map/list interaction,
- and a full-screen media viewer.

That makes it a good proof-of-work prototype for partner demos.
