#!/usr/bin/env python3
"""
Gates Australia Catalogue Extractor
Extracts complete vehicle-to-product listings from navigates.gates.com/au/
Uses the PartsB2 REST API (ABP framework)

Output: gates_au_catalogue.csv
"""

import requests
import csv
import time
import json
import os
import sys
from datetime import datetime

# ============================================================
# API Configuration
# ============================================================
API_BASE = "https://api-v3.partsb2.com.au"
AUTO_SEARCH_URL = f"{API_BASE}/api/Gates/Search/AutoSearch"

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "text/plain",
    "Abp-TenantId": "27",
    "B2v4ApiKey": "gatesaus.im6JkPKDgIGIMb68c8Inj1fi3ZMfJE0mviOpLBZe4Zs=",
    "X-Requested-With": "XMLHttpRequest",
    "gates_country": "AUS",
    "gates_server_id": "2",
    "gates_search_type": "vehicle",
    "gates_last_language": "en-AU",
}

PAGE_SIZE = 50  # API returns 50 results per page
DELAY_BETWEEN_REQUESTS = 0.5  # seconds
OUTPUT_FILE = "gates_au_catalogue.csv"
CHECKPOINT_FILE = "gates_au_checkpoint.json"

# ============================================================
# CSV Column Headers
# ============================================================
CSV_HEADERS = [
    "Make",
    "Model",
    "Years",
    "Series",
    "Engine_Code",
    "Litres",
    "kW",
    "HP",
    "Fuel_Type",
    "Part_Number",
    "Part_Description",
    "Product_Category",
    "Part_Type",
    "Article_Status",
    "OEM_Numbers",
    "Trade_Numbers",
    "Notes",
    "Part_URL",
]


# ============================================================
# Helper Functions
# ============================================================
def api_request(body, retries=3):
    """Make a POST request to the AutoSearch API with retries."""
    for attempt in range(retries):
        try:
            resp = requests.post(
                AUTO_SEARCH_URL,
                headers=HEADERS,
                json=body,
                timeout=30,
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("success"):
                    return data.get("result")
                else:
                    error_msg = data.get("error", {}).get("message", "Unknown error")
                    print(f"  API error: {error_msg}")
            elif resp.status_code == 401:
                print(f"  Auth error (401) - API key may have expired")
                return None
            elif resp.status_code == 429:
                wait = 10 * (attempt + 1)
                print(f"  Rate limited (429) - waiting {wait}s...")
                time.sleep(wait)
                continue
            else:
                print(f"  HTTP {resp.status_code}")
        except requests.exceptions.Timeout:
            print(f"  Timeout (attempt {attempt + 1}/{retries})")
        except requests.exceptions.RequestException as e:
            print(f"  Request error: {e}")

        if attempt < retries - 1:
            time.sleep(2 * (attempt + 1))

    return None


def get_all_makes():
    """Get all vehicle makes."""
    print("Fetching all makes...")
    body = {
        "source": "search",
        "search_type": "vehicle",
        "CompressedSearch": True,
    }
    result = api_request(body)
    if not result:
        return []

    makes = result.get("columns", {}).get("make", {}).get("results", [])
    print(f"  Found {len(makes)} makes")
    return [{"name": m["key"], "count": m.get("count", 0), "id": m.get("props", {}).get("MakeId")} for m in makes]


def get_models_for_make(make_name):
    """Get all models for a specific make."""
    body = {
        "source": "search",
        "search_type": "vehicle",
        "make": make_name,
        "CompressedSearch": True,
    }
    result = api_request(body)
    if not result:
        return []

    models = result.get("columns", {}).get("model", {}).get("results", [])
    return [{"name": m["key"], "count": m.get("count", 0)} for m in models]


def get_products_for_make_model(make_name, model_name, page=0):
    """Get products for a specific make+model (with pagination)."""
    body = {
        "source": "result",
        "search_type": "vehicle",
        "make": make_name,
        "model": model_name,
        "page": page,
        "CompressedSearch": True,
    }
    result = api_request(body)
    if not result:
        return None

    return result


def extract_column_values(columns, col_name):
    """Extract a list of values from a column's results."""
    col = columns.get(col_name, {})
    results = col.get("results", [])
    return [r.get("key", "") for r in results]


def load_checkpoint():
    """Load checkpoint to resume interrupted extraction."""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r") as f:
            return json.load(f)
    return {"completed_makes": [], "current_make": None, "current_model": None}


def save_checkpoint(checkpoint):
    """Save checkpoint for resuming."""
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump(checkpoint, f, indent=2)


# ============================================================
# Main Extraction
# ============================================================
def extract_all():
    """Extract complete Gates catalogue data."""
    checkpoint = load_checkpoint()
    completed_makes = set(checkpoint.get("completed_makes", []))

    # Get all makes
    makes = get_all_makes()
    if not makes:
        print("ERROR: Could not fetch makes. Check API key and connectivity.")
        return

    total_makes = len(makes)
    total_products = sum(m["count"] for m in makes)
    print(f"\nTotal: {total_makes} makes, ~{total_products} product listings")
    print(f"Already completed: {len(completed_makes)} makes\n")

    # Open CSV file (append if resuming)
    file_exists = os.path.exists(OUTPUT_FILE) and len(completed_makes) > 0
    csv_file = open(OUTPUT_FILE, "a" if file_exists else "w", newline="", encoding="utf-8")
    writer = csv.DictWriter(csv_file, fieldnames=CSV_HEADERS)

    if not file_exists:
        writer.writeheader()

    total_rows = 0
    start_time = datetime.now()

    for make_idx, make in enumerate(makes):
        make_name = make["name"]

        if make_name in completed_makes:
            print(f"[{make_idx+1}/{total_makes}] SKIP {make_name} (already completed)")
            continue

        print(f"\n[{make_idx+1}/{total_makes}] Processing {make_name} ({make['count']} products)...")

        # Get models for this make
        time.sleep(DELAY_BETWEEN_REQUESTS)
        models = get_models_for_make(make_name)

        if not models:
            print(f"  No models found for {make_name}")
            completed_makes.add(make_name)
            save_checkpoint({"completed_makes": list(completed_makes)})
            continue

        print(f"  {len(models)} models: {', '.join(m['name'] for m in models[:5])}{'...' if len(models) > 5 else ''}")

        make_rows = 0

        for model_idx, model in enumerate(models):
            model_name = model["name"]
            print(f"  [{model_idx+1}/{len(models)}] {model_name}...", end=" ", flush=True)

            time.sleep(DELAY_BETWEEN_REQUESTS)

            # Fetch first page to get total count and vehicle info
            result = get_products_for_make_model(make_name, model_name, page=0)
            if not result:
                print("(no data)")
                continue

            total = result.get("total", 0)
            columns = result.get("columns", {})

            # Extract vehicle specification columns
            years = extract_column_values(columns, "vyear")
            series_list = extract_column_values(columns, "fullseries")
            engine_codes = extract_column_values(columns, "enginecode")
            litres_list = extract_column_values(columns, "litres")
            kw_list = extract_column_values(columns, "KW")
            hp_list = extract_column_values(columns, "PS")
            fuel_types = extract_column_values(columns, "enginetype")

            # Comma-separated vehicle specs
            years_str = ", ".join(years) if years else ""
            series_str = " | ".join(series_list) if series_list else ""
            engine_str = ", ".join(engine_codes) if engine_codes else ""
            litres_str = ", ".join(litres_list) if litres_list else ""
            kw_str = ", ".join(kw_list) if kw_list else ""
            hp_str = ", ".join(hp_list) if hp_list else ""
            fuel_str = ", ".join(fuel_types) if fuel_types else ""

            # Process all pages of parts
            page = 0
            parts_written = 0

            while True:
                if page > 0:
                    time.sleep(DELAY_BETWEEN_REQUESTS)
                    result = get_products_for_make_model(make_name, model_name, page=page)
                    if not result:
                        break

                parts = result.get("columns", {}).get("part", {}).get("results", [])
                if not parts:
                    break

                for part in parts:
                    props = part.get("props", {})
                    notes = props.get("Notes", [])
                    oem_numbers = props.get("OEMNumber", [])
                    trade_numbers = props.get("TradeNumber", [])

                    row = {
                        "Make": make_name,
                        "Model": model_name,
                        "Years": years_str,
                        "Series": series_str,
                        "Engine_Code": engine_str,
                        "Litres": litres_str,
                        "kW": kw_str,
                        "HP": hp_str,
                        "Fuel_Type": fuel_str,
                        "Part_Number": props.get("ProductNr", part.get("key", "")),
                        "Part_Description": props.get("Description", ""),
                        "Product_Category": props.get("ProductCategory", ""),
                        "Part_Type": props.get("PartDescription", ""),
                        "Article_Status": props.get("ArticleStatus", ""),
                        "OEM_Numbers": ", ".join(oem_numbers) if oem_numbers else "",
                        "Trade_Numbers": ", ".join(trade_numbers) if trade_numbers else "",
                        "Notes": " | ".join(str(n) for n in notes) if notes else "",
                        "Part_URL": part.get("href", ""),
                    }
                    writer.writerow(row)
                    parts_written += 1

                # Check if there are more pages
                if len(parts) < PAGE_SIZE:
                    break
                page += 1

            print(f"{parts_written} parts ({total} total)")
            make_rows += parts_written
            total_rows += parts_written

        # Mark make as completed
        completed_makes.add(make_name)
        save_checkpoint({"completed_makes": list(completed_makes)})
        print(f"  >> {make_name}: {make_rows} parts written")

    csv_file.close()
    elapsed = (datetime.now() - start_time).total_seconds()

    print(f"\n{'='*60}")
    print(f"EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"Total rows: {total_rows}")
    print(f"Time: {elapsed:.0f}s ({elapsed/60:.1f}m)")
    print(f"Output: {OUTPUT_FILE}")

    # Clean up checkpoint
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)
        print(f"Checkpoint removed: {CHECKPOINT_FILE}")


# ============================================================
# Alternative: Extract with vehicle-level granularity
# ============================================================
def extract_detailed():
    """
    More detailed extraction that also iterates through each series
    within each make+model to get exact vehicle-to-part mappings.
    This takes longer but gives more precise fitment data.
    """
    checkpoint = load_checkpoint()
    completed = set(checkpoint.get("completed_makes", []))

    makes = get_all_makes()
    if not makes:
        print("ERROR: Could not fetch makes.")
        return

    output_file = "gates_au_detailed.csv"
    detailed_headers = [
        "Make", "Model", "Year", "Series", "Engine_Code",
        "Litres", "kW", "HP", "Fuel_Type",
        "Part_Number", "Part_Description", "Product_Category",
        "Part_Type", "Article_Status", "OEM_Numbers",
        "Trade_Numbers", "Notes", "Part_URL",
    ]

    file_exists = os.path.exists(output_file) and len(completed) > 0
    csv_file = open(output_file, "a" if file_exists else "w", newline="", encoding="utf-8")
    writer = csv.DictWriter(csv_file, fieldnames=detailed_headers)
    if not file_exists:
        writer.writeheader()

    total_rows = 0

    for make_idx, make in enumerate(makes):
        make_name = make["name"]
        if make_name in completed:
            continue

        print(f"\n[{make_idx+1}/{len(makes)}] {make_name}...")

        time.sleep(DELAY_BETWEEN_REQUESTS)
        models = get_models_for_make(make_name)

        for model in models:
            model_name = model["name"]
            time.sleep(DELAY_BETWEEN_REQUESTS)

            # Get the model overview to find all years
            result = get_products_for_make_model(make_name, model_name, page=0)
            if not result:
                continue

            columns = result.get("columns", {})
            years = extract_column_values(columns, "vyear")

            # For each year, get specific parts
            for year in years:
                time.sleep(DELAY_BETWEEN_REQUESTS)

                body = {
                    "source": "result",
                    "search_type": "vehicle",
                    "make": make_name,
                    "model": model_name,
                    "vyear": year,
                    "CompressedSearch": True,
                }
                yr_result = api_request(body)
                if not yr_result:
                    continue

                yr_columns = yr_result.get("columns", {})
                series_list = extract_column_values(yr_columns, "fullseries")
                engine_codes = extract_column_values(yr_columns, "enginecode")
                litres_list = extract_column_values(yr_columns, "litres")
                kw_list = extract_column_values(yr_columns, "KW")
                hp_list = extract_column_values(yr_columns, "PS")
                fuel_types = extract_column_values(yr_columns, "enginetype")

                # Get all parts pages
                page = 0
                while True:
                    if page > 0:
                        time.sleep(DELAY_BETWEEN_REQUESTS)
                        body["page"] = page
                        yr_result = api_request(body)
                        if not yr_result:
                            break

                    parts = yr_result.get("columns", {}).get("part", {}).get("results", [])
                    if not parts:
                        break

                    for part in parts:
                        props = part.get("props", {})
                        row = {
                            "Make": make_name,
                            "Model": model_name,
                            "Year": year,
                            "Series": " | ".join(series_list),
                            "Engine_Code": ", ".join(engine_codes),
                            "Litres": ", ".join(litres_list),
                            "kW": ", ".join(kw_list),
                            "HP": ", ".join(hp_list),
                            "Fuel_Type": ", ".join(fuel_types),
                            "Part_Number": props.get("ProductNr", ""),
                            "Part_Description": props.get("Description", ""),
                            "Product_Category": props.get("ProductCategory", ""),
                            "Part_Type": props.get("PartDescription", ""),
                            "Article_Status": props.get("ArticleStatus", ""),
                            "OEM_Numbers": ", ".join(props.get("OEMNumber", [])),
                            "Trade_Numbers": ", ".join(props.get("TradeNumber", [])),
                            "Notes": " | ".join(str(n) for n in props.get("Notes", [])),
                            "Part_URL": part.get("href", ""),
                        }
                        writer.writerow(row)
                        total_rows += 1

                    if len(parts) < PAGE_SIZE:
                        break
                    page += 1

            print(f"  {model_name}: {len(years)} years processed")

        completed.add(make_name)
        save_checkpoint({"completed_makes": list(completed)})

    csv_file.close()
    print(f"\nDetailed extraction complete: {total_rows} rows -> {output_file}")

    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)


# ============================================================
# Entry Point
# ============================================================
if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "standard"

    if mode == "detailed":
        print("Running DETAILED extraction (year-level, slower)...")
        extract_detailed()
    else:
        print("Running STANDARD extraction (make+model level)...")
        print("Use 'python gates_extract.py detailed' for year-level granularity\n")
        extract_all()
