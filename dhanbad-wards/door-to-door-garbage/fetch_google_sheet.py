"""Download the first worksheet of a Google Sheet as CSV."""

import argparse
import csv
from pathlib import Path

import gspread


OUTPUT_FILE = Path(__file__).parent / "latest-google-form-responses.csv"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("sheet_id")
    parser.add_argument("service_account_key", type=Path)
    args = parser.parse_args()

    client = gspread.service_account(filename=str(args.service_account_key))
    rows = client.open_by_key(args.sheet_id).sheet1.get_all_values()

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as csv_file:
        csv.writer(csv_file).writerows(rows)

    print(f"Saved {OUTPUT_FILE}")


if __name__ == "__main__":
    main()