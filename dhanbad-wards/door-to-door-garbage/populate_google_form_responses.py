"""Populate derived ward number and collection status CSV columns."""

import argparse
import csv
import json
from pathlib import Path


MAPPING_FILE = Path(__file__).parent / "collection-status-mapping.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("responses_csv", type=Path)
    args = parser.parse_args()

    with MAPPING_FILE.open(encoding="utf-8") as mapping_file:
        status_mapping = json.load(mapping_file)
    status_by_text = {
        text: status
        for status, accepted_texts in status_mapping.items()
        for text in accepted_texts
    }

    with args.responses_csv.open(newline="", encoding="utf-8") as csv_file:
        rows = list(csv.reader(csv_file))

    for row_number, row in enumerate(rows[1:], start=2):
        if not row[-2]:
            row[-2] = row[1]
        if not row[-1]:
            try:
                row[-1] = status_by_text[row[2]]
            except KeyError as error:
                raise ValueError(
                    f"Unknown collection status text on row {row_number}: {row[2]!r}"
                ) from error

    with args.responses_csv.open("w", newline="", encoding="utf-8") as csv_file:
        csv.writer(csv_file).writerows(rows)

    print(f"Updated {args.responses_csv}")


if __name__ == "__main__":
    main()