/*
  Civic Issues Tracker Dashboard
  --------------------------------
  This file keeps the app logic in plain browser JavaScript so it can run
  without a build step. The code is organized into three parts:
  1. Map setup and marker creation
  2. Issue filtering and card rendering
  3. Media modal lifecycle management
*/

document.addEventListener("DOMContentLoaded", async () => {
  let issues;

  try {
    const response = await fetch("./issues-data.json");
    if (!response.ok) {
      throw new Error(`Issue data request failed with status ${response.status}`);
    }

    const issueData = await response.json();
    if (!Array.isArray(issueData)) {
      throw new TypeError("Issue data must be an array");
    }

    issues = issueData.slice();
  } catch (error) {
    console.error("Unable to load issue data.", error);
    document.getElementById("results-meta").textContent = "Issue data could not be loaded.";
    document.getElementById("issue-list").textContent = "Refresh the page to try again.";
    return;
  }

  const state = {
    searchText: "",
    category: "All",
    status: "All",
    ward: "All",
    selectedIssueId: null,
    activeBounds: null,
    map: null,
    markersById: new Map(),
    modalIssueId: null,
    modalMediaIndex: 0
  };

  const elements = {
    searchInput: document.getElementById("search-input"),
    categoryFilter: document.getElementById("category-filter"),
    statusFilter: document.getElementById("status-filter"),
    wardFilter: document.getElementById("ward-filter"),
    issueList: document.getElementById("issue-list"),
    resultsMeta: document.getElementById("results-meta"),
    modal: document.getElementById("media-modal"),
    modalClose: document.getElementById("media-modal-close"),
    modalPrev: document.getElementById("media-modal-prev"),
    modalNext: document.getElementById("media-modal-next"),
    modalContent: document.getElementById("media-modal-content"),
    modalPosition: document.getElementById("media-modal-position"),
    modalCaption: document.getElementById("media-modal-caption")
  };

  const wardNumbers = [...new Set(
    issues
      .map((issue) => issue.ward_number)
      .filter((wardNumber) => Number.isInteger(wardNumber) && wardNumber >= 0)
  )].sort((a, b) => a - b);

  wardNumbers.forEach((wardNumber) => {
    const option = document.createElement("option");
    option.value = String(wardNumber);
    option.textContent = `Ward ${wardNumber}`;
    elements.wardFilter.appendChild(option);
  });

  const map = L.map("map", {
    zoomControl: true,
    preferCanvas: true
  }).setView([23.7965, 86.431], 13);

  state.map = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  function buildPopupMarkup(issue) {
    return `
      <div>
        <p class="popup-title">${escapeHtml(issue.title)}</p>
        <p class="popup-meta">${escapeHtml(issue.category)} · ${escapeHtml(issue.status)}</p>
      </div>
    `;
  }

  function getStatusPalette(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "unresolved") {
      return {
        fill: "#dc2626",
        stroke: "#991b1b",
        selectedFill: "#ef4444",
        selectedStroke: "#7f1d1d"
      };
    }
    if (normalized === "in progress") {
      return {
        fill: "#f97316",
        stroke: "#c2410c",
        selectedFill: "#fb923c",
        selectedStroke: "#9a3412"
      };
    }
    if (normalized === "completed") {
      return {
        fill: "#22c55e",
        stroke: "#15803d",
        selectedFill: "#4ade80",
        selectedStroke: "#166534"
      };
    }
    return {
      fill: "#6b7280",
      stroke: "#4b5563",
      selectedFill: "#9ca3af",
      selectedStroke: "#374151"
    };
  }

  function getMarkerStyleForStatus(status, isSelected, isVisibleOnMap) {
    const palette = getStatusPalette(status);
    return {
      radius: isSelected ? 11 : 9,
      color: isSelected ? palette.selectedStroke : palette.stroke,
      weight: isSelected ? 3 : 2,
      fillColor: isSelected ? palette.selectedFill : palette.fill,
      fillOpacity: isVisibleOnMap ? 0.9 : 0,
      opacity: isVisibleOnMap ? 1 : 0
    };
  }

  function getStatusChipClass(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "unresolved") {
      return "chip--status-unresolved";
    }
    if (normalized === "in progress") {
      return "chip--status-progress";
    }
    if (normalized === "completed") {
      return "chip--status-completed";
    }
    return "chip--muted";
  }

  function createMarkers() {
    issues.forEach((issue) => {
      const marker = L.circleMarker(
        [issue.latitude, issue.longitude],
        getMarkerStyleForStatus(issue.status, false, true)
      ).addTo(map);

      marker.bindPopup(buildPopupMarkup(issue), {
        closeButton: false,
        offset: L.point(0, -4)
      });

      marker.on("click", () => {
        focusIssue(issue.id, { fromMap: true });
      });

      state.markersById.set(issue.id, marker);
    });
  }

  function getVisibleIssues() {
    return issues.filter((issue) => {
      const matchesFilters = matchesPanelFilters(issue);

      const matchesBounds = !state.activeBounds || state.activeBounds.contains([issue.latitude, issue.longitude]);

      return matchesFilters && matchesBounds;
    });
  }

  function matchesPanelFilters(issue) {
    const searchText = state.searchText.trim().toLowerCase();
    const matchesText = !searchText || [issue.title, issue.description, issue.category, issue.status]
      .join(" ")
      .toLowerCase()
      .includes(searchText);
    const matchesCategory = state.category === "All" || issue.category === state.category;
    const matchesStatus = state.status === "All" || issue.status === state.status;
    const matchesWard = state.ward === "All" || String(issue.ward_number) === state.ward;
    return matchesText && matchesCategory && matchesStatus && matchesWard;
  }

  function renderIssueList() {
    const visibleIssues = getVisibleIssues();
    const selectedIssueId = state.selectedIssueId;
    const orderedIssues = visibleIssues.slice().sort((a, b) => {
      if (!selectedIssueId) {
        return 0;
      }
      if (a.id === selectedIssueId) {
        return -1;
      }
      if (b.id === selectedIssueId) {
        return 1;
      }
      return 0;
    });

    elements.issueList.innerHTML = "";

    if (orderedIssues.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = "No issues match the current filters and map viewport.";
      elements.issueList.appendChild(emptyState);
      updateMeta(orderedIssues.length);
      return;
    }

    const fragment = document.createDocumentFragment();

    orderedIssues.forEach((issue) => {
      fragment.appendChild(createIssueCard(issue));
    });

    elements.issueList.appendChild(fragment);
    updateMeta(orderedIssues.length);
  }

  function createIssueCard(issue) {
    const card = document.createElement("article");
    card.className = "issue-card";
    card.dataset.issueId = issue.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open issue: ${issue.title}`);

    if (issue.id === state.selectedIssueId) {
      card.classList.add("issue-card--selected");
    }

    const top = document.createElement("div");
    top.className = "issue-card__top";

    const titleRow = document.createElement("div");
    titleRow.className = "issue-card__title-row";

    const title = document.createElement("h2");
    title.textContent = issue.title;

    const chips = document.createElement("div");
    chips.className = "issue-card__chips";

    const categoryChip = createChip(issue.category);
    const statusChip = createChip(issue.status, getStatusChipClass(issue.status));
    chips.appendChild(categoryChip);
    if (issue.ward_number !== -1) {
      chips.appendChild(createChip(`Ward ${issue.ward_number}`));
    }
    chips.appendChild(statusChip);

    titleRow.append(title, chips);

    const description = document.createElement("p");
    description.className = "issue-card__description";
    description.textContent = issue.description;

    top.append(titleRow, description);

    const meta = document.createElement("div");
    meta.className = "issue-card__meta";
    meta.innerHTML = `
      <span>Lat ${issue.latitude.toFixed(4)}</span>
      <span>Lng ${issue.longitude.toFixed(4)}</span>
    `;

    const mediaRow = document.createElement("div");
    mediaRow.className = "issue-card__media";

    issue.media.forEach((mediaItem, index) => {
      mediaRow.appendChild(createMediaThumbnail(issue, mediaItem, index));
    });

    card.append(top, meta, mediaRow);

    const openIssue = () => {
      focusIssue(issue.id, { fromMap: false });
      openMediaModal(issue, 0);
    };
    card.addEventListener("click", openIssue);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openIssue();
      }
    });

    return card;
  }

  function createChip(label, extraClass = "") {
    const chip = document.createElement("span");
    chip.className = `chip ${extraClass}`.trim();
    chip.textContent = label;
    return chip;
  }

  function createMediaThumbnail(issue, mediaItem, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "media-thumb";
    button.setAttribute("aria-label", `Open ${mediaItem.type} media ${index + 1} for ${issue.title}`);

    const image = document.createElement("img");
    image.alt = mediaItem.alt || `${mediaItem.type} preview for ${issue.title}`;
    image.src = mediaItem.type === "video" && mediaItem.poster ? mediaItem.poster : mediaItem.url;
    image.loading = "lazy";
    button.appendChild(image);

    const badge = document.createElement("span");
    badge.className = "media-thumb__badge";
    badge.textContent = mediaItem.type;
    button.appendChild(badge);

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openMediaModal(issue, index);
    });

    return button;
  }

  function updateMeta(count) {
    const total = issues.length;
    if (total === 0) {
      elements.resultsMeta.textContent = "No mock issues loaded.";
      return;
    }

    elements.resultsMeta.textContent = `${count} issue${count === 1 ? "" : "s"} visible in the current viewport out of ${total} total.`;
  }

  function syncViewportBounds() {
    state.activeBounds = map.getBounds();
    renderIssueList();
    syncMarkerStyles();
  }

  function syncMarkerStyles() {
    const visibleMarkerIssueIds = new Set(
      issues.filter((issue) => matchesPanelFilters(issue)).map((issue) => issue.id)
    );

    state.markersById.forEach((marker, issueId) => {
      const issue = issues.find((entry) => entry.id === issueId);
      if (!issue) {
        return;
      }

      const isVisibleOnMap = visibleMarkerIssueIds.has(issueId);
      const isSelected = issueId === state.selectedIssueId;
      marker.setStyle(getMarkerStyleForStatus(issue.status, isSelected, isVisibleOnMap));

      if (isVisibleOnMap) {
        marker.addTo(map);
        marker.off("click");
        marker.on("click", () => {
          focusIssue(issue.id, { fromMap: true });
        });
      } else {
        marker.closePopup();
        marker.off("click");
      }
    });
  }

  function focusIssue(issueId, options = {}) {
    const issue = issues.find((entry) => entry.id === issueId);
    if (!issue) {
      return;
    }

    state.selectedIssueId = issueId;
    syncMarkerStyles();
    renderIssueList();

    const marker = state.markersById.get(issueId);
    if (marker) {
      marker.openPopup();
    }

    if (!options.fromMap) {
      map.flyTo([issue.latitude, issue.longitude], Math.max(map.getZoom(), 15), {
        duration: 0.9
      });
    }

    if (options.fromMap) {
      elements.issueList.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  }

  function getCurrentModalIssue() {
    return issues.find((entry) => entry.id === state.modalIssueId) || null;
  }

  function renderModalMedia(issue, mediaIndex) {
    clearMediaModal();

    if (!issue || !Array.isArray(issue.media) || issue.media.length === 0) {
      return;
    }

    const total = issue.media.length;
    const boundedIndex = ((mediaIndex % total) + total) % total;
    const mediaItem = issue.media[boundedIndex];

    state.modalIssueId = issue.id;
    state.modalMediaIndex = boundedIndex;

    const captionParts = [issue.title, mediaItem.type === "video" ? "Video" : "Image"];
    elements.modalCaption.textContent = `${captionParts.join(" · ")} — ${issue.category}`;
    elements.modalPosition.textContent = `${boundedIndex + 1} / ${total}`;

    let mediaNode;
    if (mediaItem.type === "video") {
      mediaNode = document.createElement("video");
      mediaNode.controls = true;
      mediaNode.autoplay = true;
      mediaNode.preload = "metadata";
      mediaNode.playsInline = true;
      if (mediaItem.poster) {
        mediaNode.poster = mediaItem.poster;
      }
      mediaNode.src = mediaItem.url;
    } else {
      mediaNode = document.createElement("img");
      mediaNode.alt = mediaItem.alt || issue.title;
      mediaNode.src = mediaItem.url;
    }

    elements.modalContent.appendChild(mediaNode);
    const hasMultipleMedia = total > 1;
    elements.modalPrev.hidden = !hasMultipleMedia;
    elements.modalNext.hidden = !hasMultipleMedia;

    elements.modal.hidden = false;
    elements.modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (mediaNode.tagName === "VIDEO") {
      mediaNode.play().catch(() => {
        // Browsers can block autoplay; controls still let the user play manually.
      });
    }
  }

  function openMediaModal(issue, startIndex = 0) {
    renderModalMedia(issue, startIndex);
  }

  function stepMedia(direction) {
    const issue = getCurrentModalIssue();
    if (!issue || !Array.isArray(issue.media) || issue.media.length < 2) {
      return;
    }

    renderModalMedia(issue, state.modalMediaIndex + direction);
  }

  function clearMediaModal() {
    const video = elements.modalContent.querySelector("video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    elements.modalContent.innerHTML = "";
    elements.modalPosition.textContent = "";
    elements.modalCaption.textContent = "";
  }

  function closeMediaModal() {
    clearMediaModal();
    elements.modal.hidden = true;
    elements.modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    state.modalIssueId = null;
    state.modalMediaIndex = 0;
  }

  function escapeHtml(value) {
    const span = document.createElement("span");
    span.textContent = value;
    return span.innerHTML;
  }

  elements.searchInput.addEventListener("input", (event) => {
    state.searchText = event.target.value;
    renderIssueList();
    syncMarkerStyles();
  });

  elements.categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    renderIssueList();
    syncMarkerStyles();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    renderIssueList();
    syncMarkerStyles();
  });

  elements.wardFilter.addEventListener("change", (event) => {
    state.ward = event.target.value;
    renderIssueList();
    syncMarkerStyles();
  });

  elements.modalClose.addEventListener("click", closeMediaModal);
  elements.modalPrev.addEventListener("click", (event) => {
    event.stopPropagation();
    stepMedia(-1);
  });
  elements.modalNext.addEventListener("click", (event) => {
    event.stopPropagation();
    stepMedia(1);
  });
  elements.modal.addEventListener("click", (event) => {
    if (!event.target.closest(".media-modal__frame")) {
      closeMediaModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.hidden) {
      closeMediaModal();
      return;
    }

    if (elements.modal.hidden) {
      return;
    }

    if (event.key === "ArrowLeft") {
      stepMedia(-1);
    } else if (event.key === "ArrowRight") {
      stepMedia(1);
    }
  });

  map.on("moveend zoomend", syncViewportBounds);

  createMarkers();
  syncViewportBounds();
});
