"""Create browser-ready Dhanbad ward GeoJSON from the SBM GeoJSONL dump."""

import argparse
import json
from pathlib import Path


DHANBAD_ULB_CODE = "801775"
EXPECTED_WARDS = set(range(1, 56))
PLACEHOLDER_WARNING = (
    "Councillor names, phone numbers, and LGD ward codes are placeholders. "
    "Replace them with verified MHD data before launch."
)


def prepare_feature(feature: dict) -> dict:
    """Keep source geometry and expose the stable properties used by the site."""
    source = feature["properties"]
    ward_no = int(source["wardcode"])
    return {
        "type": "Feature",
        "geometry": feature["geometry"],
        "properties": {
            "ward_no": ward_no,
            "ward_name": source["wardname"],
            "councillor_name": "Data pending",
            "councillor_phone": "",
            "lgd_ward_code": "Data pending",
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
        "--output",
        type=Path,
        default=Path("wards.geojson"),
        help="output GeoJSON FeatureCollection",
    )
    args = parser.parse_args()

    features = []
    with args.input.open(encoding="utf-8") as source_file:
        for line_number, line in enumerate(source_file, start=1):
            try:
                feature = json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSON on line {line_number}") from error

            properties = feature.get("properties", {})
            if properties.get("ulbcode") == DHANBAD_ULB_CODE:
                features.append(prepare_feature(feature))

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