"use strict";

const DATA_URL = "wards.geojson";

// Replace pending values only after checking them against an official source.
const COMMON_CONTACTS = [
  {
    role: "नगर निगम / Municipal Corporation",
    name: "",
    phone: "+913262301925",
  },
  {
    role: "आपातकालीन सेवा / Emergency",
    name: "एकीकृत आपातकालीन हेल्पलाइन / National emergency helpline",
    phone: "112",
  },
];

const elements = {
  status: document.querySelector("#location-status"),
  statusTitle: document.querySelector("#status-title"),
  statusMessage: document.querySelector("#status-message"),
  retryButton: document.querySelector("#retry-button"),
  councillorCard: document.querySelector("#councillor-card"),
  wardNumber: document.querySelector("#ward-number"),
  wardHeading: document.querySelector("#ward-heading"),
  councillorName: document.querySelector("#councillor-name"),
  councillorNameEn: document.querySelector("#councillor-name-en"),
  phoneActions: document.querySelector("#phone-actions"),
  boundaryNote: document.querySelector("#boundary-note"),
  commonContactList: document.querySelector("#common-contact-list"),
};

let wardData;

function setStatus(title, message, state, canRetry = false) {
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
  elements.status.dataset.state = state;
  elements.retryButton.hidden = !canRetry;
}

function createPhoneLink(phone, label = phone) {
  const link = document.createElement("a");
  link.className = "phone-link";
  link.href = `tel:${phone}`;
  link.textContent = label;
  return link;
}

function renderCommonContacts() {
  const cards = COMMON_CONTACTS.map((contact) => {
    const card = document.createElement("article");
    const role = document.createElement("h3");
    const name = document.createElement("p");
    role.textContent = contact.role;
    name.textContent = contact.name;
    card.append(role, name);
    if (contact.phone) card.append(createPhoneLink(contact.phone, `कॉल करें / Call ${contact.phone}`));
    return card;
  });
  elements.commonContactList.replaceChildren(...cards);
}

function showCouncillor(feature) {
  const ward = feature.properties;
  elements.wardNumber.textContent = ward.ward_no;
  elements.wardHeading.textContent = ward.ward_name;
  elements.councillorName.textContent = ward.councillor_name;
  elements.councillorNameEn.textContent = ward.councillor_name_en;
  elements.councillorNameEn.hidden = !ward.councillor_name_en.trim();

  const phones = ward.councillor_phone
    .split(";")
    .map((phone) => phone.trim())
    .filter(Boolean);
  elements.phoneActions.replaceChildren(
    ...(phones.length
      ? phones.map((phone) => createPhoneLink(phone, `☎ कॉल करें / Call ${phone}`))
      : [document.createTextNode("फ़ोन जानकारी लंबित / Phone details pending")]),
  );

  elements.councillorCard.hidden = false;
  elements.boundaryNote.hidden = false;
  setStatus(
    `${ward.ward_name} मिला / ${ward.ward_name} found`,
    "नीचे आपके पार्षद की संपर्क जानकारी है। / Your councillor's contact information is below.",
    "success",
  );
  window.requestAnimationFrame(() => elements.councillorCard.scrollIntoView({ behavior: "smooth", block: "center" }));
}

function handlePosition(position) {
  const { longitude, latitude } = position.coords;
  const point = turf.point([longitude, latitude]);
  const ward = wardData.features.find((feature) => turf.booleanPointInPolygon(point, feature));

  if (ward) {
    showCouncillor(ward);
    return;
  }

  setStatus(
    "वार्ड नहीं मिला / Ward not found",
    "यह स्थान उपलब्ध धनबाद वार्ड सीमाओं के बाहर या किसी सीमा के पास है। मैन्युअल खोज खोलें। / This location is outside the available Dhanbad boundaries or near an edge. Open manual search.",
    "error",
    true,
  );
}

function handlePositionError(error) {
  const messages = {
    1: "स्थान की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति देकर फिर कोशिश करें। / Location permission was denied. Allow it in browser settings and retry.",
    2: "डिवाइस की Location Services चालू करें और फिर कोशिश करें। / Turn on Location Services and retry.",
    3: "स्थान खोजने में बहुत समय लगा। फिर कोशिश करें। / Location lookup timed out. Please retry.",
  };
  setStatus("स्थान नहीं मिला / Location unavailable", messages[error.code] || messages[2], "error", true);
}

function requestLocation() {
  elements.councillorCard.hidden = true;
  elements.boundaryNote.hidden = true;
  if (!window.isSecureContext) {
    setStatus("HTTPS आवश्यक है / HTTPS required", "GPS के लिए यह पेज HTTPS या localhost पर खोलें। / Open this page over HTTPS or localhost to use GPS.", "error");
    return;
  }
  if (!("geolocation" in navigator)) {
    setStatus("GPS उपलब्ध नहीं है / GPS unavailable", "यह ब्राउज़र स्थान साझा नहीं कर सकता। मैन्युअल खोज का उपयोग करें। / This browser cannot share location. Use manual search.", "error");
    return;
  }

  setStatus("आपका स्थान खोज रहे हैं / Finding your location", "ब्राउज़र में स्थान की अनुमति दें। / Please allow location access in your browser.", "loading");
  navigator.geolocation.getCurrentPosition(handlePosition, handlePositionError, {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0,
  });
}

async function initialize() {
  renderCommonContacts();
  try {
    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Ward data request failed: ${response.status}`);
    wardData = await response.json();
    if (wardData.type !== "FeatureCollection" || !wardData.features?.length) throw new Error("Invalid ward data");
    requestLocation();
  } catch (error) {
    console.error(error);
    setStatus("वार्ड डेटा उपलब्ध नहीं है / Ward data unavailable", "डेटा लोड नहीं हो सका। इंटरनेट कनेक्शन जाँचकर फिर कोशिश करें। / Data could not load. Check your connection and retry.", "error", true);
  }
}

elements.retryButton.addEventListener("click", () => {
  if (wardData) requestLocation();
  else initialize();
});

initialize();