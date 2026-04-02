"""
Penrite Oil Application Guide Extractor
========================================
Extracts the complete vehicle-to-oil application data from Penrite's Product Selector API.
Outputs a CSV file suitable for uploading to a website or database.

Usage:
    pip install requests
    python penrite_extractor.py

Output: penrite_application_guide.csv
"""

import requests
import csv
import time
import json
import sys
from datetime import datetime

# ── All 377 Penrite product IDs discovered from their API ──────────────────
PRODUCT_IDS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 27, 29, 30,
    31, 35, 38, 42, 62, 63, 70, 72, 73, 76, 78, 79, 80, 81, 82, 83, 84, 85,
    86, 87, 92, 98, 104, 105, 107, 108, 109, 114, 115, 116, 117, 119, 120,
    121, 122, 124, 125, 126, 127, 128, 129, 134, 146, 147, 155, 157, 158,
    160, 161, 162, 163, 167, 182, 183, 184, 248, 252, 253, 255, 256, 257,
    265, 266, 268, 274, 276, 277, 278, 279, 286, 288, 289, 291, 306, 318,
    327, 330, 336, 343, 350, 351, 355, 357, 358, 359, 360, 361, 366, 367,
    368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 379, 380, 381, 397,
    406, 407, 408, 436, 437, 443, 444, 449, 455, 456, 459, 460, 464, 465,
    468, 469, 470, 472, 475, 484, 485, 492, 546, 574, 580, 597, 598, 602,
    603, 604, 605, 606, 613, 614, 618, 627, 639, 671, 679, 680, 681, 682,
    685, 690, 695, 706, 709, 710, 716, 718, 719, 720, 725, 726, 732, 738,
    745, 746, 747, 748, 749, 750, 752, 753, 754, 755, 756, 757, 760, 766,
    770, 771, 772, 773, 775, 776, 782, 783, 784, 787, 788, 789, 791, 792,
    6382, 6383, 6384, 6385, 6386, 6392, 6394, 6395, 6398, 6418, 6409, 6402,
    6422, 6423, 6427, 6424, 6428, 6429, 6430, 6442, 6443, 6444, 6445, 6446,
    6451, 6453, 6456, 6465, 6469, 6468, 6470, 6471, 6472, 6458, 6473, 6474,
    6477, 6478, 6479, 6476, 6490, 6491, 6493, 6495, 6496, 6501, 6504, 6506,
    6508, 6509, 6514, 6515, 6452, 6516, 6517, 6512, 6520, 6505, 6521, 6522,
    6523, 6524, 6528, 6529, 6531, 6533, 6534, 6535, 6537, 6538, 6539, 6540,
    6532, 6542, 6544, 6545, 6546, 6549, 6550, 6551, 6552, 6553, 6554, 6555,
    6556, 6558, 6559, 6562, 6563, 6557, 6565, 6566, 6561, 6567, 6568, 6569,
    6570, 6571, 6572, 6573, 6574, 6575, 6576, 6578, 6580, 6582, 6583, 6584,
    6585, 6586, 6587, 6588, 6589, 6590, 6591, 6592, 6594, 6601, 6602, 6603,
    6604, 6605, 6606, 6607, 6608, 6610, 6612, 6613, 6614, 6620, 6622, 6623,
    6624, 6625, 6619, 6628, 6629, 6631, 6632, 6633, 6634, 6637, 6638, 6639,
    6640, 6641, 6642, 6643, 6644, 6645, 6646, 6649, 6657, 6658, 6664, 6665,
    6666, 6674, 6675, 6669, 6678, 6679, 6680, 6681, 6677, 6682, 6683, 6684,
    6685, 6686, 6687,
]

BASE_URL = "https://penriteoil.com.au"
API_URL = f"{BASE_URL}/api/v1/fetchProductVehicles"

# CSV column headers
CSV_HEADERS = [
    "Vehicle_ID",
    "Make",
    "Model",
    "Series",
    "Submodel",
    "Year_From",
    "Year_To",
    "Fuel",
    "Engine",
    "Engine_CC",
    "Cylinders",
    "Aspiration",
    "Cam",
    "Fuel_System",
    "Drive_Type",
    "Transmission",
    "Body_Type",
    "Vehicle_Type",
    "Compartment",
    "Penrite_Product_Name",
    "Penrite_Product_Code",
    "Capacity",
    "Capacity_Litres",
    "Notes",
    "Available_AU",
    "Available_NZ",
]


def extract_row(record):
    """Extract a flat CSV row from a single API record."""
    vehicle = record.get("vehicle", {}) or {}
    return {
        "Vehicle_ID": record.get("vehicleid", ""),
        "Make": vehicle.get("make", ""),
        "Model": vehicle.get("model", ""),
        "Series": vehicle.get("series", ""),
        "Submodel": vehicle.get("submodel", ""),
        "Year_From": vehicle.get("yearmin", ""),
        "Year_To": vehicle.get("yearmax", ""),
        "Fuel": vehicle.get("fuel", ""),
        "Engine": vehicle.get("engine", ""),
        "Engine_CC": vehicle.get("cc", ""),
        "Cylinders": vehicle.get("cyls", ""),
        "Aspiration": vehicle.get("aspiration", ""),
        "Cam": vehicle.get("cam", ""),
        "Fuel_System": vehicle.get("fuelsystem", ""),
        "Drive_Type": vehicle.get("drivetype", ""),
        "Transmission": vehicle.get("transmission", ""),
        "Body_Type": vehicle.get("bodytype", ""),
        "Vehicle_Type": vehicle.get("TypeName", ""),
        "Compartment": record.get("Subcat", ""),
        "Penrite_Product_Name": "",  # filled from product lookup
        "Penrite_Product_Code": record.get("Partno", ""),
        "Capacity": record.get("longfootnote", ""),
        "Capacity_Litres": record.get("liquidqty", ""),
        "Notes": record.get("FootnoteText", ""),
        "Available_AU": vehicle.get("AU", ""),
        "Available_NZ": vehicle.get("NZ", ""),
    }


def main():
    output_file = "scripts/penrite_application_guide.csv"
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "Accept": "application/json",
    })

    # First, get the product selector page to establish a session
    print("Initialising session...")
    resp = session.get(f"{BASE_URL}/product-selector")
    if resp.status_code != 200:
        print(f"Warning: Initial page returned status {resp.status_code}")

    # Try to get product names via search API (needs CSRF token)
    product_names = {}
    try:
        import re
        csrf_match = re.search(r'<meta name="csrf-token" content="([^"]+)"', resp.text)
        if csrf_match:
            csrf_token = csrf_match.group(1)
            search_queries = [
                "hpr", "enviro", "convoy", "vantage", "classic", "mc",
                "10 tenths", "everyday", "atf", "cvt", "gear", "brake",
                "coolant", "power", "diesel", "pro ", "pmo", "full",
                "semi", "mineral", "syn", "flush", "fuel", "eds",
                "stops", "marine", "heritage", "shelsley", "racing",
                "trans", "diff", "grease", "super", "general",
            ]
            for query in search_queries:
                try:
                    r = session.post(
                        f"{BASE_URL}/api/v1/searchProductsByNameOrCode",
                        json={"query": query},
                        headers={
                            "X-CSRF-TOKEN": csrf_token,
                            "X-Requested-With": "XMLHttpRequest",
                        },
                    )
                    if r.status_code == 200:
                        for p in r.json():
                            product_names[p.get("code", "")] = p.get("name", "")
                except Exception:
                    pass
            print(f"  Found names for {len(product_names)} products")
    except Exception as e:
        print(f"  Could not fetch product names (will use codes): {e}")

    total_rows = 0
    failed_products = []

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()

        for i, product_id in enumerate(PRODUCT_IDS, 1):
            print(f"[{i}/{len(PRODUCT_IDS)}] Fetching product ID {product_id}...", end=" ", flush=True)
            try:
                resp = session.get(f"{API_URL}?id={product_id}", timeout=60)
                if resp.status_code != 200:
                    print(f"HTTP {resp.status_code} - skipped")
                    failed_products.append(product_id)
                    continue

                records = resp.json()
                if not isinstance(records, list):
                    print("unexpected response format - skipped")
                    failed_products.append(product_id)
                    continue

                count = 0
                for record in records:
                    row = extract_row(record)
                    code = row["Penrite_Product_Code"]
                    row["Penrite_Product_Name"] = product_names.get(code, code)
                    writer.writerow(row)
                    count += 1

                total_rows += count
                print(f"{count} vehicles ({total_rows} total)")

            except requests.exceptions.Timeout:
                print("TIMEOUT - skipped")
                failed_products.append(product_id)
            except json.JSONDecodeError:
                print("invalid JSON - skipped")
                failed_products.append(product_id)
            except Exception as e:
                print(f"ERROR: {e}")
                failed_products.append(product_id)

            time.sleep(0.3)

    print(f"\n{'='*60}")
    print(f"EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"Total rows written: {total_rows:,}")
    print(f"Products processed: {len(PRODUCT_IDS) - len(failed_products)}/{len(PRODUCT_IDS)}")
    print(f"Output file: {output_file}")
    if failed_products:
        print(f"Failed product IDs: {failed_products}")
    print(f"Timestamp: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
