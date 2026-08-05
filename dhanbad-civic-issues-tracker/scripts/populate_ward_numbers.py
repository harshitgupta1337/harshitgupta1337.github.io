#!/usr/bin/env python3

import argparse
import json
import os
import tempfile
from pathlib import Path

from shapely.geometry import Point, shape


PROJECT_DIRECTORY = Path(__file__).resolve().parent.parent
DEFAULT_ISSUES_PATH = PROJECT_DIRECTORY / "issues-data.json"
DEFAULT_WARDS_PATH = PROJECT_DIRECTORY / "wards.geojson"


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Populate missing ward_number values in an issues JSON file."
    )
    parser.add_argument("--issues", type=Path, default=DEFAULT_ISSUES_PATH)
    parser.add_argument("--wards", type=Path, default=DEFAULT_WARDS_PATH)
    return parser.parse_args()


def read_json(file_path):
    with file_path.open(encoding="utf-8") as file:
        return json.load(file)


def has_ward_number(issue):
    value = issue.get("ward_number")
    return value is not None and not (isinstance(value, str) and not value.strip())


def load_wards(file_path):
    ward_data = read_json(file_path)
    if ward_data.get("type") != "FeatureCollection":
        raise ValueError("wards.geojson must contain a GeoJSON FeatureCollection")

    wards = []
    for feature in ward_data.get("features", []):
        ward_number = feature.get("properties", {}).get("ward_no")
        if not isinstance(ward_number, int):
            raise ValueError("Every ward feature must have an integer ward_no")
        wards.append((ward_number, shape(feature["geometry"])))

    return wards


def find_ward_number(issue, wards):
    latitude = issue.get("latitude")
    longitude = issue.get("longitude")
    if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        raise ValueError(f"Issue {issue.get('id', '<unknown>')} has invalid coordinates")

    issue_point = Point(longitude, latitude)
    for ward_number, ward_polygon in wards:
        if ward_polygon.covers(issue_point):
            return ward_number

    return -1


def write_json_atomically(file_path, data):
    file_path = file_path.resolve()
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=file_path.parent,
            prefix=f".{file_path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            json.dump(data, temporary_file, ensure_ascii=False, indent=2)
            temporary_file.write("\n")
            temporary_path = Path(temporary_file.name)

        os.replace(temporary_path, file_path)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()


def main():
    arguments = parse_arguments()
    issues = read_json(arguments.issues)
    if not isinstance(issues, list):
        raise ValueError("issues-data.json must contain an array")

    wards = load_wards(arguments.wards)
    updated_count = 0
    preserved_count = 0
    outside_count = 0

    for issue in issues:
        if has_ward_number(issue):
            preserved_count += 1
            continue

        issue["ward_number"] = find_ward_number(issue, wards)
        updated_count += 1
        if issue["ward_number"] == -1:
            outside_count += 1

    write_json_atomically(arguments.issues, issues)
    print(
        f"Ward enrichment complete: {updated_count} updated, "
        f"{preserved_count} preserved, {outside_count} outside all wards."
    )


if __name__ == "__main__":
    main()