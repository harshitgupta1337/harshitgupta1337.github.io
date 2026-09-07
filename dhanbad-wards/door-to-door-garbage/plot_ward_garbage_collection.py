"""Plot ward-wise door-to-door garbage collection status in Dhanbad."""

import argparse
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import contextily as cx
import geopandas as gpd
import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.patches import Patch


HERE = Path(__file__).parent
WARD_FILE = HERE.parent / "wards.geojson"
DEFAULT_SURVEY_FILE = HERE / "google-form-responses-06Sep2026.csv"
OUTPUT_FILE = HERE / "ward-garbage-collection.png"
STATS_FILE = HERE / "ward-garbage-collection-stats.json"

STATUS_COLORS = {
    0: "#D73027",
    1: "#F9D423",
    2: "#2878B5",
}
NO_DATA_COLOR = "#C8C8C8"
INDIA_TIME_ZONE = ZoneInfo("Asia/Kolkata")


def calculate_final_statuses(responses):
    """Return each ward's most reported status, preferring higher ties."""
    counts = (
        responses.groupby(["Ward Number", "Collection Status"])
        .size()
        .rename("response_count")
        .reset_index()
    )
    return (
        counts.sort_values(
            ["Ward Number", "response_count", "Collection Status"],
            ascending=[True, False, False],
        )
        .drop_duplicates("Ward Number")
        .set_index("Ward Number")["Collection Status"]
    )


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate the ward collection map and webpage statistics."
    )
    parser.add_argument(
        "responses_csv",
        nargs="?",
        type=Path,
        default=DEFAULT_SURVEY_FILE,
        help="Google Forms responses CSV (defaults to the current survey CSV)",
    )
    return parser.parse_args()


def write_stats(responses, wards, final_statuses, survey_file):
    timestamps = pd.to_datetime(
        responses["Timestamp"], format="%m/%d/%Y %H:%M:%S", errors="coerce"
    )
    if timestamps.isna().all():
        raise ValueError("Timestamp column contains no valid dates")

    status_counts = final_statuses.value_counts().reindex(STATUS_COLORS, fill_value=0)
    stats = {
        "generated_at": datetime.now(INDIA_TIME_ZONE).isoformat(),
        "survey_snapshot": timestamps.max().date().isoformat(),
        "source_csv": survey_file.name,
        "map_file": OUTPUT_FILE.name,
        "response_count": int(len(responses)),
        "wards_covered": int(len(final_statuses)),
        "total_wards": int(len(wards)),
        "status_ward_counts": {
            str(status): int(count) for status, count in status_counts.items()
        },
        "no_data_ward_count": int(len(wards) - len(final_statuses)),
        "final_status_by_ward": {
            str(ward): int(status)
            for ward, status in final_statuses.sort_index().items()
        },
    }
    STATS_FILE.write_text(
        json.dumps(stats, ensure_ascii=True, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Saved webpage statistics to {STATS_FILE}")


def main():
    args = parse_args()
    survey_file = args.responses_csv.resolve()
    if not survey_file.is_file():
        raise FileNotFoundError(f"Response CSV not found: {survey_file}")

    wards = gpd.read_file(WARD_FILE)
    responses = pd.read_csv(survey_file)
    required_columns = {"Timestamp", "Ward Number", "Collection Status"}
    missing_columns = required_columns - set(responses.columns)
    if missing_columns:
        raise ValueError(f"Response CSV is missing columns: {sorted(missing_columns)}")

    responses["Ward Number"] = pd.to_numeric(
        responses["Ward Number"], errors="raise"
    ).astype(int)
    responses["Collection Status"] = pd.to_numeric(
        responses["Collection Status"], errors="raise"
    ).astype(int)

    invalid_statuses = sorted(set(responses["Collection Status"]) - set(STATUS_COLORS))
    if invalid_statuses:
        raise ValueError(f"Unexpected collection statuses: {invalid_statuses}")

    unknown_wards = sorted(set(responses["Ward Number"]) - set(wards["ward_no"]))
    if unknown_wards:
        raise ValueError(
            f"Survey contains ward numbers missing from GeoJSON: {unknown_wards}"
        )

    final_statuses = calculate_final_statuses(responses)
    wards["final_status"] = wards["ward_no"].map(final_statuses)
    wards["fill_color"] = (
        wards["final_status"].map(STATUS_COLORS).fillna(NO_DATA_COLOR)
    )

    print(
        f"{len(wards)} wards found; "
        f"{wards['final_status'].notna().sum()} have survey data"
    )
    print(final_statuses.sort_index().to_string())

    wards = wards.to_crs(epsg=3857)
    figure, ax = plt.subplots(figsize=(11, 11))
    wards.plot(
        ax=ax,
        color=wards["fill_color"],
        edgecolor="#242424",
        linewidth=0.8,
        alpha=0.72,
        zorder=1,
    )
    cx.add_basemap(ax, source=cx.providers.Esri.WorldStreetMap)

    for _, ward in wards.iterrows():
        label_point = ward.geometry.representative_point()
        ax.text(
            label_point.x,
            label_point.y,
            str(ward["ward_no"]),
            ha="center",
            va="center",
            fontsize=8,
            fontweight="bold",
            color="#111111",
            zorder=2,
        )

    legend_items = [
        Patch(facecolor=STATUS_COLORS[0], edgecolor="#242424", label="No collection"),
        Patch(
            facecolor=STATUS_COLORS[1],
            edgecolor="#242424",
            label="Irregular collection",
        ),
        Patch(
            facecolor=STATUS_COLORS[2],
            edgecolor="#242424",
            label="Regular collection",
        ),
        Patch(facecolor=NO_DATA_COLOR, edgecolor="#242424", label="No survey data"),
    ]
    ax.legend(
        handles=legend_items,
        title="Collection status",
        loc="lower left",
        framealpha=0.95,
        fontsize=16,
        title_fontsize=16, 
    )
    ax.set_title(
        "Door-to-Door Garbage Collection by Ward\n"
        "Dhanbad Municipal Corporation",
        fontsize=16,
        fontweight="bold",
        pad=14,
    )
    ax.set_axis_off()
    figure.tight_layout()
    figure.savefig(OUTPUT_FILE, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(figure)
    print(f"Saved map to {OUTPUT_FILE}")
    write_stats(responses, wards, final_statuses, survey_file)


if __name__ == "__main__":
    main()