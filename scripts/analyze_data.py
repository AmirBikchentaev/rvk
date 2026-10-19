"""Quick data quality scan for README."""
import csv
from collections import defaultdict
from datetime import datetime
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"


def read_csv(name):
    with open(DATA / name, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def parse_date(s):
    return datetime.strptime(s.strip(), "%Y-%m-%d").date()


def overlaps(a_in, a_out, b_in, b_out):
    return a_in < b_out and b_in < a_out


def main():
    props = {r["property_id"] for r in read_csv("properties.csv")}
    reservations = read_csv("reservations.csv")
    payments = read_csv("payments.csv")
    expenses = read_csv("expenses.csv")

    dup_ids = defaultdict(list)
    for i, r in enumerate(reservations):
        dup_ids[r["reservation_id"]].append(i + 2)

    bad_prop = [r for r in reservations if r["property_id"] not in props]
    bad_exp = [e for e in expenses if e["property_id"] not in props]

    wrong_currency = [r for r in reservations if r["currency"] != "IDR"]
    negative_ota = [r for r in reservations if float(r["ota_fee"] or 0) < 0]

    cancelled = [r for r in reservations if r["status"] == "cancelled"]
    modified = [r for r in reservations if r["status"] == "modified"]
    confirmed = [r for r in reservations if r["status"] == "confirmed"]

    pay_dup = defaultdict(int)
    for p in payments:
        pay_dup[p["payment_id"]] += 1

    pay_bad_prop = [p for p in payments if p["property_id"] not in props]

    # overlapping confirmed+modified on same property
    by_prop = defaultdict(list)
    for r in reservations:
        if r["status"] in ("confirmed", "modified"):
            by_prop[r["property_id"]].append(r)

    overlaps_list = []
    for pid, rows in by_prop.items():
        for i, a in enumerate(rows):
            for b in rows[i + 1 :]:
                if overlaps(
                    parse_date(a["check_in"]),
                    parse_date(a["check_out"]),
                    parse_date(b["check_in"]),
                    parse_date(b["check_out"]),
                ):
                    overlaps_list.append((pid, a["reservation_id"], b["reservation_id"]))

    print("=== Duplicates reservation_id ===")
    for rid, lines in dup_ids.items():
        if len(lines) > 1:
            print(rid, lines)

    print("\n=== Invalid property in reservations ===")
    for r in bad_prop:
        print(r["reservation_id"], r["property_id"])

    print("\n=== Invalid property in expenses ===")
    for e in bad_exp:
        print(e["expense_id"], e["property_id"])

    print("\n=== Non-IDR reservations ===")
    for r in wrong_currency:
        print(r["reservation_id"], r["currency"], r["gross_booking_value"])

    print("\n=== Negative OTA fee ===")
    for r in negative_ota:
        print(r["reservation_id"], r["ota_fee"])

    print("\n=== Duplicate payment_id ===")
    for pid, c in pay_dup.items():
        if c > 1:
            print(pid, c)

    print("\n=== Payment invalid property ===")
    for p in pay_bad_prop:
        print(p["payment_id"], p["property_id"])

    print(f"\n=== Status counts: confirmed={len(confirmed)} modified={len(modified)} cancelled={len(cancelled)} ===")
    print(f"=== Overlapping stays (confirmed/modified): {len(overlaps_list)} pairs (show first 15) ===")
    for x in overlaps_list[:15]:
        print(x)


if __name__ == "__main__":
    main()
