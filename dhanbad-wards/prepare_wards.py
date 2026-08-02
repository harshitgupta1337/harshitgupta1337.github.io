"""Create browser-ready Dhanbad ward GeoJSON from the SBM GeoJSONL dump."""

import argparse
import csv
import json
from pathlib import Path
import re


DHANBAD_ULB_CODE = "801775"
EXPECTED_WARDS = set(range(1, 56))
PLACEHOLDER_WARNING = (
    "Councillor names and reservation details come from councillors_2026.csv. "
    "Phone numbers and LGD ward codes remain pending."
)


def load_councillors(path: Path) -> dict[int, dict]:
    """Load and validate one councillor record for every Dhanbad ward."""
    with path.open(encoding="utf-8-sig", newline="") as csv_file:
        rows = list(csv.DictReader(csv_file))

    councillors = {int(row["ward_no"]): row for row in rows}
    if len(rows) != len(councillors):
        raise ValueError("Councillor CSV contains duplicate ward numbers")
    if set(councillors) != EXPECTED_WARDS:
        raise ValueError("Councillor CSV must contain each ward from 1 through 55")
    if any(not row["councillor_name"].strip() for row in rows):
        raise ValueError("Every councillor must have a name")
    for row in rows:
        phones = [phone.strip() for phone in row["councillor_phone"].split(";")]
        if not phones or any(not re.fullmatch(r"\d{10}", phone) for phone in phones):
            raise ValueError(f"Ward {row['ward_no']} has an invalid phone number")
    return councillors


def prepare_feature(feature: dict, councillors: dict[int, dict]) -> dict:
    """Keep source geometry and expose the stable properties used by the site."""
    source = feature["properties"]
    ward_no = int(source["wardcode"])
    councillor = councillors[ward_no]
    return {
        "type": "Feature",
        "geometry": feature["geometry"],
        "properties": {
            "ward_no": ward_no,
            "ward_name": source["wardname"],
            "councillor_name": councillor["councillor_name"].strip(),
            "councillor_name_en": councillor["councillor_name_en"].strip(),
            "reservation_category": councillor["reservation_category"].strip(),
            "reservation_category_en": councillor["reservation_category_en"].strip(),
            "gender_category": councillor["gender_category"].strip(),
            "councillor_phone": councillor["councillor_phone"].strip(),
            "lgd_ward_code": councillor["lgd_ward_code"].strip() or "Data pending",
            "source_objectid": source.get("objectid"),
            "source_gisglobalid": source.get("gisglobalid"),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("dataset/SBM_Wards.geojsonl"),
        help="source newline-delimited GeoJSON",
    )
    parser.add_argument(
        "--councillors",
        type=Path,
        default=Path("councillors_2026.csv"),
        help="2026 councillor CSV keyed by ward_no",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("wards.geojson"),
        help="output GeoJSON FeatureCollection",
    )
    args = parser.parse_args()
    councillors = load_councillors(args.councillors)

    features = []
    with args.input.open(encoding="utf-8") as source_file:
        for line_number, line in enumerate(source_file, start=1):
            try:
                feature = json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSON on line {line_number}") from error

            properties = feature.get("properties", {})
            if properties.get("ulbcode") == DHANBAD_ULB_CODE:
                features.append(prepare_feature(feature, councillors))

    ward_numbers = [feature["properties"]["ward_no"] for feature in features]
    if len(ward_numbers) != len(set(ward_numbers)):
        raise ValueError("Source contains more than one feature for a ward")
    if set(ward_numbers) != EXPECTED_WARDS:
        raise ValueError("Source must contain each Dhanbad ward from 1 through 55")

    features.sort(key=lambda feature: feature["properties"]["ward_no"])
    output = {
        "type": "FeatureCollection",
        "_placeholder_warning": PLACEHOLDER_WARNING,
        "features": features,
    }
    args.output.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Created {args.output} with {len(features)} wards")


if __name__ == "__main__":
    main()