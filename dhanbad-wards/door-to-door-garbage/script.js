"use strict";

const STATS_URL = "ward-garbage-collection-stats.json";

const elements = {
  surveyDate: document.querySelector("#survey-date"),
  mapDownload: document.querySelector("#map-download"),
  mapLink: document.querySelector("#map-link"),
  wardMap: document.querySelector("#ward-map"),
  noCollectionCount: document.querySelector("#status-none-count"),
  irregularCount: document.querySelector("#status-irregular-count"),
  regularCount: document.querySelector("#status-regular-count"),
  noDataCount: document.querySelector("#status-missing-count"),
  responseCount: document.querySelector("#response-count"),
  wardCoverage: document.querySelector("#ward-coverage"),
  dataStatus: document.querySelector("#data-status"),
};

function requireNumber(stats, key) {
  if (!Number.isInteger(stats[key]) || stats[key] < 0) {
    throw new Error(`Invalid statistic: ${key}`);
  }
  return stats[key];
}

function displayDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid survey snapshot date");
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function showStats(stats) {
  const statusCounts = stats.status_ward_counts;
  if (!statusCounts || !["0", "1", "2"].every((key) => Number.isInteger(statusCounts[key]))) {
    throw new Error("Invalid status ward counts");
  }

  const responseCount = requireNumber(stats, "response_count");
  const wardsCovered = requireNumber(stats, "wards_covered");
  const totalWards = requireNumber(stats, "total_wards");
  const noDataCount = requireNumber(stats, "no_data_ward_count");
  if (typeof stats.map_file !== "string") {
    throw new Error("Invalid generated map file name");
  }

  elements.surveyDate.textContent = displayDate(stats.survey_snapshot);
  elements.noCollectionCount.textContent = statusCounts["0"];
  elements.irregularCount.textContent = statusCounts["1"];
  elements.regularCount.textContent = statusCounts["2"];
  elements.noDataCount.textContent = noDataCount;
  elements.responseCount.textContent = responseCount;
  elements.wardCoverage.textContent = `${wardsCovered} of ${totalWards}`;

  const mapUrl = `${stats.map_file}?v=${encodeURIComponent(stats.generated_at)}`;
  elements.wardMap.src = mapUrl;
  elements.mapLink.href = stats.map_file;
  elements.mapDownload.href = stats.map_file;
  elements.dataStatus.textContent = `Showing ${responseCount} responses from ${wardsCovered} wards.`;
  elements.dataStatus.dataset.state = "ready";
}

async function loadStats() {
  try {
    const response = await fetch(STATS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Statistics request failed: ${response.status}`);
    showStats(await response.json());
  } catch (error) {
    console.error(error);
    elements.surveyDate.textContent = "Unavailable";
    elements.dataStatus.textContent = "Current survey statistics could not be loaded.";
    elements.dataStatus.dataset.state = "error";
  }
}

loadStats();