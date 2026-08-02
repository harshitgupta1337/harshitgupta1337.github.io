"use strict";

const DATA_URL = "wards.geojson";
const DEFAULT_STYLE = {
  color: "#2B6F76",
  weight: 2,
  fillColor: "#E8A33D",
  fillOpacity: 0.16,
};
const FADED_STYLE = {
  color: "#75695D",
  weight: 1,
  fillColor: "#FBF6EC",
  fillOpacity: 0.1,
};
const SELECTED_STYLE = {
  color: "#19545A",
  weight: 4,
  fillColor: "#2B6F76",
  fillOpacity: 0.42,
};

const elements = {
  locateButton: document.querySelector("#locate-button"),
  retryButton: document.querySelector("#retry-button"),
  statusPanel: document.querySelector("#status-panel"),
  statusMessage: document.querySelector("#status-message"),
  locationReadout: document.querySelector("#location-readout"),
  wardSelect: document.querySelector("#ward-select"),
  resultCard: document.querySelector("#result-card"),
  sealNumber: document.querySelector("#seal-number"),
  resultHeading: document.querySelector("#result-heading"),
  councillorName: document.querySelector("#councillor-name"),
  councillorNameEn: document.querySelector("#councillor-name-en"),
  councillorPhone: document.querySelector("#councillor-phone"),
  phonePending: document.querySelector("#phone-pending"),
  lgdCode: document.querySelector("#lgd-code"),
};

let map;
let wardData;
let wardLayer;
let wardLayers = new Map();
let mapResizeObserver;

function setStatus(message, state = "info", showRetry = false) {
  elements.statusMessage.textContent = message;
  elements.statusPanel.dataset.state = state;
  elements.retryButton.hidden = !showRetry;
}

function initializeMap() {
  if (map) return;

  map = L.map("map", { scrollWheelZoom: false }).setView([23.7644, 86.4131], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  if ("ResizeObserver" in window) {
    mapResizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    mapResizeObserver.observe(document.querySelector("#map"));
  }
  window.addEventListener("load", () => map.invalidateSize({ pan: false }), { once: true });
}

function fitMapBounds(bounds, options) {
  window.requestAnimationFrame(() => {
    map.invalidateSize({ pan: false });
    map.fitBounds(bounds, options);
  });
}

function addWardLayer() {
  if (wardLayer) wardLayer.remove();
  wardLayers = new Map();
  wardLayer = L.geoJSON(wardData, {
    style: DEFAULT_STYLE,
    onEachFeature(feature, layer) {
      const properties = feature.properties;
      wardLayers.set(String(properties.ward_no), layer);
      layer.bindTooltip(`${properties.ward_name} / Ward ${properties.ward_no}`);
    },
  }).addTo(map);
  fitMapBounds(wardLayer.getBounds(), { padding: [18, 18] });
}

function populateWardSelect() {
  const options = wardData.features
    .map((feature) => feature.properties)
    .sort((first, second) => first.ward_no - second.ward_no);

  elements.wardSelect.replaceChildren(
    new Option("वार्ड चुनें / Select a ward", ""),
    ...options.map((ward) => new Option(`Ward ${ward.ward_no} — ${ward.ward_name}`, ward.ward_no)),
  );
}

function validateWardData(data) {
  const required = ["ward_no", "ward_name", "councillor_name", "councillor_name_en", "councillor_phone", "lgd_ward_code"];
  if (data.type !== "FeatureCollection" || !Array.isArray(data.features) || !data.features.length) {
    throw new Error("Invalid GeoJSON FeatureCollection");
  }
  if (data.features.some((feature) => required.some((key) => !(key in feature.properties)))) {
    throw new Error("Ward data is missing required properties");
  }
}

async function loadWardData() {
  elements.locateButton.disabled = true;
  elements.wardSelect.disabled = true;
  setStatus("वार्ड मानचित्र लोड हो रहा है… / Loading ward map…");

  try {
    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Ward data request failed: ${response.status}`);
    const data = await response.json();
    validateWardData(data);
    wardData = data;
    initializeMap();
    addWardLayer();
    populateWardSelect();
    elements.locateButton.disabled = false;
    elements.wardSelect.disabled = false;
    setStatus("मानचित्र तैयार है। GPS या सूची से खोजें। / Map ready. Use GPS or choose from the list.", "success");
  } catch (error) {
    console.error(error);
    setStatus(
      "वार्ड डेटा लोड नहीं हो सका। अपना इंटरनेट कनेक्शन जाँचकर फिर कोशिश करें। / Ward data could not load. Check your connection and retry.",
      "error",
      true,
    );
  }
}

function findWard(longitude, latitude) {
  const point = turf.point([longitude, latitude]);
  return wardData.features.find((feature) => turf.booleanPointInPolygon(point, feature));
}

function highlightWard(wardNumber) {
  wardLayers.forEach((layer, number) => {
    layer.setStyle(number === String(wardNumber) ? SELECTED_STYLE : FADED_STYLE);
  });
  const selectedLayer = wardLayers.get(String(wardNumber));
  selectedLayer.bringToFront();
  fitMapBounds(selectedLayer.getBounds(), { padding: [28, 28], maxZoom: 14 });
}

function showWard(feature, source) {
  const ward = feature.properties;
  highlightWard(ward.ward_no);
  elements.wardSelect.value = String(ward.ward_no);
  elements.sealNumber.textContent = ward.ward_no;
  elements.resultHeading.textContent = ward.ward_name;
  elements.councillorName.textContent = ward.councillor_name;
  elements.councillorNameEn.textContent = ward.councillor_name_en.trim() || "\u00A0";
  elements.lgdCode.textContent = ward.lgd_ward_code;

  if (ward.councillor_phone) {
    const phoneLinks = ward.councillor_phone.split(";").map((value) => {
      const phone = value.trim();
      const link = document.createElement("a");
      link.textContent = phone;
      link.href = `tel:${phone}`;
      return link;
    });
    elements.councillorPhone.replaceChildren(...phoneLinks);
    elements.councillorPhone.hidden = false;
    elements.phonePending.hidden = true;
  } else {
    elements.councillorPhone.replaceChildren();
    elements.councillorPhone.hidden = true;
    elements.phonePending.hidden = false;
    elements.phonePending.textContent = "Data pending";
  }

  elements.resultCard.hidden = false;
  setStatus(
    source === "gps"
      ? `आपका स्थान ${ward.ward_name} में है। / Your location is in ${ward.ward_name}.`
      : `${ward.ward_name} चुना गया। / ${ward.ward_name} selected.`,
    "success",
  );
}

function resetResult() {
  elements.resultCard.hidden = true;
  if (wardLayer) {
    wardLayer.setStyle(DEFAULT_STYLE);
    fitMapBounds(wardLayer.getBounds(), { padding: [18, 18] });
  }
}

function handlePosition(position) {
  const { longitude, latitude, accuracy } = position.coords;
  elements.locationReadout.textContent = `Detected location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)} m)`;
  elements.locationReadout.hidden = false;
  const match = findWard(longitude, latitude);
  elements.locateButton.disabled = false;

  if (match) {
    showWard(match, "gps");
    return;
  }

  resetResult();
  setStatus(
    "यह स्थान उपलब्ध वार्ड सीमाओं के बाहर है या सीमा के बहुत पास है। नीचे सूची से वार्ड चुनें। / This point is outside the available boundaries or near an edge. Choose a ward below.",
    "error",
  );
}

function handlePositionError(error) {
  elements.locateButton.disabled = false;
  const messages = {
    1: "स्थान की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें, या नीचे सूची से चुनें। / Location permission was denied. Allow it in browser settings, or choose below.",
    2: "डिवाइस की Location Services चालू करें और फिर कोशिश करें। / Turn on your device's Location Services and try again.",
    3: "स्थान खोजने में बहुत समय लगा। फिर कोशिश करें या सूची से चुनें। / Location timed out. Retry or choose from the list.",
  };
  setStatus(messages[error.code] || messages[2], "error");
}

function locateUser() {
  resetResult();
  elements.locationReadout.hidden = true;
  if (!window.isSecureContext) {
    setStatus(
      "GPS के लिए इस पेज को HTTPS या localhost पर खोलें। / Location requires HTTPS or localhost.",
      "error",
    );
    return;
  }
  if (!("geolocation" in navigator)) {
    setStatus(
      "यह ब्राउज़र GPS स्थान साझा नहीं कर सकता। नीचे सूची से वार्ड चुनें। / This browser does not support location. Choose a ward below.",
      "error",
    );
    return;
  }

  elements.locateButton.disabled = true;
  setStatus("Location Services चालू रखें और ब्राउज़र की अनुमति दें। स्थान खोज रहे हैं… / Turn on Location Services and allow the browser prompt. Finding your location…");
  navigator.geolocation.getCurrentPosition(handlePosition, handlePositionError, {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0,
  });
}

elements.locateButton.addEventListener("click", locateUser);
elements.retryButton.addEventListener("click", loadWardData);
elements.wardSelect.addEventListener("change", () => {
  if (!elements.wardSelect.value) {
    resetResult();
    setStatus("GPS या सूची से खोजें। / Use GPS or choose from the list.");
    return;
  }
  const match = wardData.features.find(
    (feature) => String(feature.properties.ward_no) === elements.wardSelect.value,
  );
  showWard(match, "manual");
});

loadWardData();