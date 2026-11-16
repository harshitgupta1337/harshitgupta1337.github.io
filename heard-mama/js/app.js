/* Heard Mama — static prototype.
   Everything runs in the browser: ZIP lookup, location, filtering and the map.
   Nothing the visitor types or shares is sent anywhere. */
(() => {
  'use strict';

  const CFG = window.HEARD_MAMA_CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const RAD = Math.PI / 180;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- tiny helpers ---------- */
  function h(tag, props, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'style') n.style.cssText = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      n.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return n;
  }
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const miles = (a, b) => {
    const dLat = (b[0] - a[0]) * RAD, dLng = (b[1] - a[1]) * RAD;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLng / 2) ** 2;
    return 2 * 3958.8 * Math.asin(Math.sqrt(x));
  };
  const fmtMiles = (d) => (d < 0.1 ? '<0.1' : d.toFixed(1)) + ' mi';
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* ---------- state ---------- */
  const S = {
    categories: [], services: [], stages: [], providers: [], zips: {},
    svcById: {}, catById: {},
    selected: new Set(), stage: null,
    anchor: null,            // [lat, lng] the visitor searched from
    zip: null, state: null,  // ZIP + US state of that point
    insurance: false, language: '',
    tab: 'map', activeId: null,
  };
  const markers = {};        // provider id -> Leaflet marker
  let map, pins, youMarker;

  /* ---------- load ---------- */
  async function load() {
    const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
    try {
      const [sv, pv, zp] = await Promise.all([get('data/services.json'), get('data/providers.json'), get('data/zips.json')]);
      S.categories = sv.categories; S.services = sv.services; S.stages = sv.stages;
      S.providers = pv.providers; S.zips = zp;
      S.categories.forEach((c) => (S.catById[c.id] = c));
      S.services.forEach((s) => (S.svcById[s.id] = s));
    } catch (e) {
      $('#results').replaceChildren(h('div', { class: 'notice warn' }, h('p', {},
        'We couldn’t load the listings. If you opened this file straight from your computer, serve the folder over http instead (for example: npm run serve).')));
      return;
    }
    initMap();
    buildPicker();
    buildLegend();
    buildLanguages();
    wire();
    refresh();
  }

  /* ---------- map ---------- */
  function initMap() {
    map = L.map('map', { zoomControl: false, worldCopyJump: false }).setView(CFG.defaultCenter, CFG.defaultZoom);
    L.control.zoom({ position: 'topright' }).addTo(map);
    map.attributionControl.setPrefix(false);
    if (CFG.tileUrl) {
      const tiles = L.tileLayer(CFG.tileUrl, { attribution: CFG.attribution, maxZoom: 19, detectRetina: true });
      let failed = 0;
      tiles.on('tileerror', () => {
        if (++failed >= 2) { $('.map-wrap').classList.add('no-tiles'); $('#map-note').hidden = false; }
      });
      tiles.on('tileload', () => { failed = 0; $('.map-wrap').classList.remove('no-tiles'); $('#map-note').hidden = true; });
      tiles.addTo(map);
    } else {
      $('.map-wrap').classList.add('no-tiles');
    }
    pins = L.layerGroup().addTo(map);
    map.on('moveend', debounce(updateLists, 150));

    for (const p of S.providers) {
      if (!p.modes.includes('in_person')) continue;
      const color = S.catById[S.svcById[p.services[0]].category].color;
      const m = L.marker([p.lat, p.lng], {
        title: p.name, keyboard: true, riseOnHover: true,
        icon: L.divIcon({ className: 'pin-wrap', html: `<span class="pin" style="--c:${color}"></span>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] }),
      });
      m.bindPopup(() => popupFor(p), { closeButton: true, autoPanPadding: [30, 30] });
      m.on('click', () => { setActive(p.id, { fromMap: true }); });
      markers[p.id] = m;
    }
  }

  function popupFor(p) {
    const labels = p.services.map((s) => S.svcById[s].label).join(' · ');
    return h('div', {},
      h('p', { class: 'pop-name' }, p.website ? h('a', { href: p.website, target: '_blank', rel: 'noopener noreferrer' }, p.name) : p.name),
      h('p', { class: 'pop-svc' }, labels),
      h('p', { class: 'pop-links' },
        h('a', { href: mapsUrl(p), target: '_blank', rel: 'noopener noreferrer' }, 'Google Maps'),
        p.phone ? h('a', { href: 'tel:' + p.phone.replace(/[^\d+]/g, '') }, 'Call') : null));
  }
  const mapsUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;

  function buildLegend() {
    $('#legend').replaceChildren(...S.categories.map((c) => h('div', {}, h('span', { class: 'dot', style: `--c:${c.color}` }), c.label)));
  }

  function setYouMarker() {
    if (!S.anchor) return;
    if (!youMarker) {
      youMarker = L.marker(S.anchor, {
        interactive: false, keyboard: false, zIndexOffset: -100,
        icon: L.divIcon({ className: 'you-wrap', html: '<span class="you"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      }).addTo(map);
    } else youMarker.setLatLng(S.anchor);
  }

  /* ---------- picker (journey + services + filters) ---------- */
  function buildPicker() {
    $('#stages').replaceChildren(...S.stages.map((st) =>
      h('button', { type: 'button', class: 'stage', 'aria-pressed': 'false', 'data-stage': st.id, onclick: () => toggleStage(st.id) },
        h('b', {}, st.label), h('span', {}, st.hint))));

    $('#services').replaceChildren(...S.categories.map((c) =>
      h('div', { class: 'cat' },
        h('p', { class: 'cat-title' }, h('span', { class: 'dot', style: `--c:${c.color}` }), c.label),
        h('div', { class: 'chips' }, S.services.filter((s) => s.category === c.id).map((s) =>
          h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', 'data-svc': s.id, onclick: () => toggleService(s.id) }, s.label))))));
  }

  function buildLanguages() {
    const langs = [...new Set(S.providers.flatMap((p) => p.languages || []))].sort((a, b) =>
      a === 'English' ? -1 : b === 'English' ? 1 : a.localeCompare(b));
    const sel = $('#f-language');
    langs.forEach((l) => sel.append(h('option', { value: l }, l)));
  }

  function toggleService(id) {
    S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id);
    // A stage stays highlighted only while the selection still matches it exactly.
    const st = S.stages.find((x) => x.id === S.stage);
    if (st && !(st.services.length === S.selected.size && st.services.every((s) => S.selected.has(s)))) S.stage = null;
    syncPicker(); refresh();
  }
  function toggleStage(id) {
    if (S.stage === id) { S.stage = null; S.selected.clear(); }
    else { S.stage = id; S.selected = new Set(S.stages.find((x) => x.id === id).services); }
    syncPicker(); refresh();
  }
  function syncPicker() {
    document.querySelectorAll('[data-svc]').forEach((b) => b.setAttribute('aria-pressed', S.selected.has(b.dataset.svc)));
    document.querySelectorAll('[data-stage]').forEach((b) => b.setAttribute('aria-pressed', S.stage === b.dataset.stage));
    const n = S.selected.size, badge = $('#picker-count');
    badge.hidden = n === 0; badge.textContent = `${n} selected`;
    $('#clear-services').hidden = n === 0;
    $('#f-insurance').setAttribute('aria-pressed', S.insurance);
  }

  /* ---------- search ---------- */
  function say(text, kind = '') { const m = $('#loc-msg'); m.textContent = text; m.className = 'msg ' + kind; }

  function setLocation(latlng, zip, state, text) {
    S.anchor = latlng; S.zip = zip; S.state = state;
    setYouMarker();
    map.setView(latlng, 12, { animate: !reduceMotion });
    say(text, 'ok');
    $('#zip').removeAttribute('aria-invalid');
    refresh();
  }

  function nearestZip(ll) {
    let best = null, bd = Infinity;
    for (const z in S.zips) {
      const c = S.zips[z], d = (c[0] - ll[0]) ** 2 + ((c[1] - ll[1]) * Math.cos(ll[0] * RAD)) ** 2;
      if (d < bd) { bd = d; best = z; }
    }
    return best ? { zip: best, state: S.zips[best][2], dist: miles(ll, S.zips[best]) } : null;
  }

  function onSearch(e) {
    e.preventDefault();
    const input = $('#zip'), v = input.value.trim();
    const bad = (m) => { input.setAttribute('aria-invalid', 'true'); say(m, 'error'); };
    if (!/^\d{5}$/.test(v)) return bad('Please enter a 5-digit ZIP code.');
    const z = S.zips[v];
    if (!z) return bad('We couldn’t find that ZIP code. Please check it and try again.');
    setLocation([z[0], z[1]], v, z[2], `Showing care near ${v}. Your ZIP stays in your browser.`);
    // Move to the results on small screens so the search feels like it did something.
    $('#tabs').scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function onGeo() {
    if (!navigator.geolocation) return say('Your browser can’t share a location. Please type your ZIP code instead.', 'error');
    say('Finding your location…');
    navigator.geolocation.getCurrentPosition((pos) => {
      const ll = [pos.coords.latitude, pos.coords.longitude], nz = nearestZip(ll);
      if (!nz || nz.dist > CFG.maxZipMatchMiles) return say('We couldn’t match your location to a US ZIP code. Please type your ZIP instead.', 'error');
      $('#zip').value = nz.zip;
      setLocation(ll, nz.zip, nz.state, `Using your device’s location (near ZIP ${nz.zip}). It stays in your browser.`);
    }, () => say('Location is turned off or unavailable. Type your ZIP code instead. It works just as well.', 'error'),
    { timeout: 10000, maximumAge: 600000 });
  }

  /* ---------- filtering ---------- */
  const passes = (p) =>
    (S.selected.size === 0 || p.services.some((s) => S.selected.has(s))) &&
    (!S.insurance || p.insurance) &&
    (!S.language || (p.languages || []).includes(S.language));

  function refresh() { updatePins(); updateLists(); }

  function updatePins() {
    pins.clearLayers();
    for (const p of S.providers) if (markers[p.id] && passes(p)) pins.addLayer(markers[p.id]);
    paintActive();
  }

  function computeLists() {
    const ok = S.providers.filter(passes);
    const c = map.getCenter(), anchor = S.anchor || [c.lat, c.lng], b = map.getBounds();

    const nearby = ok.filter((p) => p.modes.includes('in_person') && b.contains([p.lat, p.lng]))
      .map((p) => ({ p, d: miles(anchor, [p.lat, p.lng]) })).sort((x, y) => x.d - y.d);

    const home = S.zip
      ? ok.filter((p) => p.homeZips && p.homeZips.includes(S.zip))
          .map((p) => ({ p, d: miles(S.anchor, [p.lat, p.lng]) })).sort((x, y) => x.d - y.d)
      : null;

    const virt = ok.filter((p) => p.modes.includes('virtual'));
    const online = virt.filter((p) => !p.virtual.states || !S.state || p.virtual.states.includes(S.state))
      .map((p) => ({ p })).sort((x, y) => x.p.name.localeCompare(y.p.name));

    const anyNearAnchor = !S.anchor || ok.some((p) => p.modes.includes('in_person') && miles(S.anchor, [p.lat, p.lng]) <= 40);
    return { nearby, home, online, hiddenOnline: virt.length - online.length, anyNearAnchor };
  }

  let LISTS = null;
  function updateLists() {
    if (!map) return;
    LISTS = computeLists();
    $('#count-map').textContent = LISTS.nearby.length;
    $('#count-home').textContent = LISTS.home ? LISTS.home.length : '–';
    $('#count-online').textContent = LISTS.online.length;
    renderTab();
    const n = { map: LISTS.nearby.length, home: LISTS.home ? LISTS.home.length : 0, online: LISTS.online.length }[S.tab];
    $('#live').textContent = `${plural(n, 'result', 'results')} in this tab.`;
  }

  /* ---------- rendering ---------- */
  const HELP = {
    map: 'In-person care inside the part of the map you’re looking at. Move or zoom the map to change the list.',
    home: 'Providers who travel to your home. Based on your ZIP code, not on the map.',
    online: 'Telehealth and online programs. Not tied to the map.',
  };

  function renderTab() {
    document.querySelectorAll('.tabs [role=tab]').forEach((t) => {
      const on = t.dataset.tab === S.tab;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    });
    $('#results').setAttribute('aria-labelledby', 'tab-' + S.tab);
    $('#tab-help').textContent = HELP[S.tab];
    const box = $('#results'), L_ = LISTS, out = [];

    if (S.tab === 'map') {
      if (!L_.anyNearAnchor) out.push(h('div', { class: 'notice warn' }, h('p', {}, 'This prototype only has sample listings around Greater Boston. Real listings will be added area by area.')));
      if (!L_.nearby.length) {
        out.push(h('div', { class: 'notice' },
          h('p', {}, 'Nothing in this part of the map yet. Zoom out or move the map, or look at the “Comes to you” and “Online” tabs.'),
          h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => map.zoomOut() }, 'Zoom out')));
      }
      L_.nearby.forEach(({ p, d }) => out.push(card(p, { dist: d })));
    }

    if (S.tab === 'home') {
      if (!L_.home) out.push(h('div', { class: 'notice' }, h('p', {}, 'Enter your ZIP code above to see providers who come to your home.')));
      else if (!L_.home.length) out.push(h('div', { class: 'notice' }, h('p', {}, `No home-visit providers listed for ${S.zip} yet. Online providers may still be able to help.`),
        h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => setTab('online') }, 'See online options')));
      else L_.home.forEach(({ p, d }) => out.push(card(p, { home: true, dist: d })));
    }

    if (S.tab === 'online') {
      if (!S.state) out.push(h('div', { class: 'notice' }, h('p', {}, 'Some online providers only serve certain states. Enter your ZIP code and we’ll hide the ones that can’t see you.')));
      if (!L_.online.length) out.push(h('div', { class: 'notice' }, h('p', {}, 'No online providers match these choices. Try clearing a filter.')));
      L_.online.forEach(({ p }) => out.push(card(p, { online: true })));
      if (S.state && L_.hiddenOnline > 0) out.push(h('p', { class: 'tab-help' }, `${plural(L_.hiddenOnline, 'online provider is', 'online providers are')} hidden because they don’t serve ${S.state}.`));
    }
    box.replaceChildren(...out);
    paintActive();
  }

  function card(p, ctx) {
    const sample = p.sample ? h('span', { class: 'sample-tag' }, 'Sample') : null;
    const title = p.website
      ? h('a', { href: p.website, target: '_blank', rel: 'noopener noreferrer' }, p.name)
      : p.name;

    const svcs = [...p.services].sort((a, b) => S.selected.has(b) - S.selected.has(a));
    const shown = svcs.slice(0, 3);
    const tags = h('ul', { class: 'tags' },
      shown.map((s) => h('li', { class: 'tag' + (S.selected.has(s) ? ' match' : '') },
        h('span', { class: 'dot', style: `--c:${S.catById[S.svcById[s].category].color}` }), S.svcById[s].label)),
      svcs.length > 3 ? h('li', { class: 'tag' }, `+${svcs.length - 3} more`) : null);

    let meta;
    if (ctx.online) {
      const where = p.virtual && p.virtual.states ? `For people in ${p.virtual.states.join(', ')}` : 'Available anywhere';
      meta = h('p', { class: 'meta' }, h('strong', {}, 'Online'), ' · ', where);
    } else if (ctx.home) {
      meta = h('p', { class: 'meta' }, h('strong', {}, 'Comes to ' + S.zip), ' · based in ', p.area, ` (${fmtMiles(ctx.dist)} away)`);
    } else {
      const extra = [p.modes.includes('home_visit') && 'home visits', p.modes.includes('virtual') && 'online'].filter(Boolean);
      meta = h('p', { class: 'meta' }, h('strong', {}, fmtMiles(ctx.dist)), ' · ', p.area, extra.length ? ` · also ${extra.join(' & ')}` : '');
    }

    const bits = [
      p.insurance ? h('span', { class: 'yes' }, 'Takes insurance') : null,
      p.cost || null,
      p.credentials || null,
      p.languages && p.languages.length ? p.languages.join(', ') : null,
    ].filter(Boolean);
    const facts = h('p', { class: 'facts' }, bits.flatMap((b, i) => (i ? [h('span', { class: 'sep', 'aria-hidden': 'true' }, '·'), b] : [b])));

    const d = new Date(p.lastVerified + 'T00:00:00Z');
    const stale = (Date.now() - d.getTime()) / 864e5 > CFG.staleAfterDays;
    const when = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    const verified = h('p', { class: 'verified' + (stale ? ' stale' : '') }, stale ? `Last verified ${when}. May be out of date.` : `Verified ${when}`);

    const actions = h('div', { class: 'actions' },
      p.website ? h('a', { href: p.website, target: '_blank', rel: 'noopener noreferrer' }, 'Website ↗') : null,
      p.modes.includes('in_person') ? h('a', { href: mapsUrl(p), target: '_blank', rel: 'noopener noreferrer' }, 'Google Maps ↗') : null,
      p.phone ? h('a', { href: 'tel:' + p.phone.replace(/[^\d+]/g, '') }, 'Call ' + p.phone) : null,
      ctx.dist != null && !ctx.online && !ctx.home && markers[p.id]
        ? h('button', { type: 'button', onclick: (e) => { e.stopPropagation(); focusOnMap(p.id); } }, 'Show on map') : null);

    const el = h('article', { class: 'card', 'data-id': p.id },
      sample, h('h3', {}, title), tags, meta, p.blurb ? h('p', { class: 'blurb' }, p.blurb) : null, facts, verified, actions);

    if (markers[p.id] && !ctx.online && !ctx.home) {
      el.addEventListener('click', (e) => { if (!e.target.closest('a,button')) focusOnMap(p.id); });
      el.addEventListener('mouseenter', () => hoverPin(p.id, true));
      el.addEventListener('mouseleave', () => hoverPin(p.id, false));
    }
    return el;
  }

  /* ---------- list <-> map sync ---------- */
  function pinEl(id) { return markers[id] && markers[id].getElement && markers[id].getElement(); }
  function hoverPin(id, on) { const e = pinEl(id); if (e) e.classList.toggle('is-hover', on); }
  function paintActive() {
    for (const id in markers) { const e = pinEl(id); if (e) e.classList.toggle('is-active', id === S.activeId); }
    document.querySelectorAll('.card').forEach((c) => c.classList.toggle('is-active', c.dataset.id === S.activeId));
  }
  function setActive(id, { fromMap = false } = {}) {
    S.activeId = id;
    if (fromMap && S.tab !== 'map') setTab('map');
    paintActive();
    if (fromMap) {
      const c = document.querySelector(`.card[data-id="${id}"]`);
      if (c) c.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  function focusOnMap(id) {
    const m = markers[id]; if (!m) return;
    S.activeId = id;
    document.body.classList.add('show-map'); syncToggle();
    map.invalidateSize();
    if (!pins.hasLayer(m)) pins.addLayer(m);
    map.panTo(m.getLatLng(), { animate: !reduceMotion });
    m.openPopup();
    paintActive();
  }

  /* ---------- tabs + mobile toggle ---------- */
  function setTab(t) { S.tab = t; renderTab(); }
  function syncToggle() {
    const showMap = document.body.classList.contains('show-map');
    const b = $('#view-toggle'); b.textContent = showMap ? 'Show list' : 'Show map'; b.setAttribute('aria-pressed', showMap);
  }

  function wire() {
    $('#search').addEventListener('submit', onSearch);
    $('#geo').addEventListener('click', onGeo);
    $('#clear-services').addEventListener('click', () => { S.selected.clear(); S.stage = null; syncPicker(); refresh(); });
    $('#f-insurance').addEventListener('click', () => { S.insurance = !S.insurance; syncPicker(); refresh(); });
    $('#f-language').addEventListener('change', (e) => { S.language = e.target.value; refresh(); });
    $('#see-results').addEventListener('click', () => {
      $('#picker').open = false;
      $('#tabs').scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    $('#view-toggle').addEventListener('click', () => {
      document.body.classList.toggle('show-map'); syncToggle(); map.invalidateSize();
    });

    const tabs = [...document.querySelectorAll('.tabs [role=tab]')];
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => setTab(t.dataset.tab));
      t.addEventListener('keydown', (e) => {
        const j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : -1;
        if (j < 0) return;
        e.preventDefault(); setTab(tabs[j].dataset.tab); tabs[j].focus();
      });
    });
    window.addEventListener('resize', debounce(() => map.invalidateSize(), 150));
    syncPicker(); syncToggle();
  }

  load();
})();
