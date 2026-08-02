"""Compare GPS ward ground truth with ward polygons from a GeoJSON file."""

import argparse
from collections import Counter
from decimal import Decimal, InvalidOperation
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point


RESULT_COLUMNS = (
    "calculated_ward_no",
    "matched_geojson_wards",
    "comparison_status",
    "is_incorrect",
)


def canonical_ward(value: object) -> str | None:
    """Normalize equivalent ward values such as 7, 7.0, and '7'."""
    if pd.isna(value):
        return None

    text = str(value).strip()
    if not text:
        return None
    try:
        number = Decimal(text)
        if number == number.to_integral_value():
            return str(int(number))
    except InvalidOperation:
        pass
    return text.casefold()


def load_wards(path: Path, ward_column: str) -> gpd.GeoDataFrame:
    wards = gpd.read_file(path)
    if ward_column not in wards.columns:
        raise ValueError(
            f"GeoJSON has no {ward_column!r} property; available properties: "
            f"{', '.join(column for column in wards.columns if column != 'geometry')}"
        )
    if wards.crs is None:
        raise ValueError("GeoJSON has no CRS; GPS comparison requires a defined CRS")
    if wards.empty:
        raise ValueError("GeoJSON contains no ward features")
    if wards.geometry.isna().any() or wards.geometry.is_empty.any():
        raise ValueError("GeoJSON contains missing or empty geometry")
    if not wards.geometry.is_valid.all():
        raise ValueError("GeoJSON contains invalid geometry")

    wards = wards.to_crs("EPSG:4326").copy()
    wards["_canonical_ward"] = wards[ward_column].map(canonical_ward)
    if wards["_canonical_ward"].isna().any():
        raise ValueError(f"GeoJSON contains a blank {ward_column!r} value")
    return wards


def compare_rows(
    rows: pd.DataFrame,
    wards: gpd.GeoDataFrame,
    latitude_column: str,
    longitude_column: str,
    ground_truth_column: str,
    geojson_ward_column: str,
) -> pd.DataFrame:
    required = {latitude_column, longitude_column, ground_truth_column}
    missing = required - set(rows.columns)
    if missing:
        raise ValueError(f"Input CSV is missing columns: {', '.join(sorted(missing))}")
    conflicts = set(RESULT_COLUMNS) & set(rows.columns)
    if conflicts:
        raise ValueError(
            f"Input CSV already uses output columns: {', '.join(sorted(conflicts))}"
        )

    latitudes = pd.to_numeric(rows[latitude_column], errors="coerce")
    longitudes = pd.to_numeric(rows[longitude_column], errors="coerce")
    ground_truth = rows[ground_truth_column].map(canonical_ward)
    spatial_index = wards.sindex
    results: list[dict[str, object]] = []

    for row_index in range(len(rows)):
        latitude = latitudes.iloc[row_index]
        longitude = longitudes.iloc[row_index]
        expected_ward = ground_truth.iloc[row_index]

        if (
            pd.isna(latitude)
            or pd.isna(longitude)
            or not -90 <= latitude <= 90
            or not -180 <= longitude <= 180
            or expected_ward is None
        ):
            results.append(
                {
                    "calculated_ward_no": "",
                    "matched_geojson_wards": "",
                    "comparison_status": "invalid_input",
                    "is_incorrect": True,
                }
            )
            continue

        point = Point(longitude, latitude)
        candidate_indexes = spatial_index.query(point)
        matches = wards.iloc[candidate_indexes]
        matches = matches[matches.geometry.map(lambda geometry: geometry.covers(point))]

        matched_by_key = {
            ward["_canonical_ward"]: str(ward[geojson_ward_column])
            for _, ward in matches.iterrows()
        }
        matched_wards = [matched_by_key[key] for key in sorted(matched_by_key)]

        if not matched_wards:
            calculated_ward = ""
            status = "outside_all_wards"
        elif len(matched_wards) > 1:
            calculated_ward = ""
            status = "ambiguous_boundary"
        else:
            calculated_ward = matched_wards[0]
            status = (
                "match"
                if canonical_ward(calculated_ward) == expected_ward
                else "mismatch"
            )

        results.append(
            {
                "calculated_ward_no": calculated_ward,
                "matched_geojson_wards": ";".join(matched_wards),
                "comparison_status": status,
                "is_incorrect": status != "match",
            }
        )

    return pd.concat([rows.reset_index(drop=True), pd.DataFrame(results)], axis=1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_csv", type=Path, help="CSV containing GPS and ward data")
    parser.add_argument(
        "--geojson",
        type=Path,
        default=Path("wards.geojson"),
        help="ward boundary GeoJSON (default: wards.geojson)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ward_comparison.csv"),
        help="audit CSV to create (default: ward_comparison.csv)",
    )
    parser.add_argument("--latitude-column", default="latitude")
    parser.add_argument("--longitude-column", default="longitude")
    parser.add_argument("--ground-truth-column", default="ward_no")
    parser.add_argument("--geojson-ward-column", default="ward_no")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = pd.read_csv(args.input_csv, dtype=object, encoding="utf-8-sig")
    wards = load_wards(args.geojson, args.geojson_ward_column)
    comparison = compare_rows(
        rows,
        wards,
        args.latitude_column,
        args.longitude_column,
        args.ground_truth_column,
        args.geojson_ward_column,
    )
    comparison.to_csv(args.output, index=False, encoding="utf-8")

    counts = Counter(comparison["comparison_status"])
    summary = ", ".join(f"{status}: {count}" for status, count in sorted(counts.items()))
    print(f"Compared {len(comparison)} rows ({summary})")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()