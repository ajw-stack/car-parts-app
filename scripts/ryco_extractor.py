#!/usr/bin/env python3
"""
Ryco Filters Australia - Complete Application Data Extractor
Extracts all vehicle-to-filter mappings from rycofilters.com.au API

API Base: https://ryconext-api.azurewebsites.net/api/au/autoinfosearch/

Output: ryco_filters_applications.csv
Columns: vehicle_type, make, model, year, series, engine, vehicle_detail,
         vehicle_id_encrypted, filter_category, part_number, part_description,
         grade, footnote
"""

import requests
import csv
import time
import json
import sys
import os
from datetime import datetime
from urllib.parse import quote

BASE_URL = "https://ryconext-api.azurewebsites.net/api/au/autoinfosearch"

# Vehicle type flag configurations
VEHICLE_TYPES = {
    "Passenger & Light Commercial": {"PA": "true", "HC": "false", "MC": "false", "LC": "false", "MA": "false"},
    "Motorcycle":                   {"PA": "false", "HC": "false", "MC": "true",  "LC": "false", "MA": "false"},
    "Heavy Commercial":             {"PA": "false", "HC": "true",  "MC": "false", "LC": "false", "MA": "false"},
    "Industrial & Agricultural":    {"PA": "false", "HC": "false", "MC": "false", "LC": "true",  "MA": "false"},
    "Marine":                       {"PA": "false", "HC": "false", "MC": "false", "LC": "false", "MA": "true"},
}

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://rycofilters.com.au",
    "Referer": "https://rycofilters.com.au/",
})

DELAY = 0.5  # seconds between requests - be respectful

# Progress tracking
stats = {
    "api_calls": 0,
    "vehicles_found": 0,
    "filters_found": 0,
    "errors": 0,
    "start_time": None,
}

# Checkpoint file for resuming interrupted runs
CHECKPOINT_FILE = "ryco_checkpoint.json"


def api_get(endpoint, params=None, retries=3):
    """Make a GET request to the Ryco API with retry logic."""
    url = f"{BASE_URL}/{endpoint}"
    for attempt in range(retries):
        try:
            stats["api_calls"] += 1
            resp = SESSION.get(url, params=params, timeout=30)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 429:
                wait = min(60, 5 * (attempt + 1))
                print(f"  Rate limited. Waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  HTTP {resp.status_code} for {endpoint}")
                time.sleep(2)
        except requests.exceptions.Timeout:
            print(f"  Timeout on attempt {attempt+1}/{retries}")
            time.sleep(5)
        except requests.exceptions.RequestException as e:
            print(f"  Request error: {e}")
            time.sleep(5)
    stats["errors"] += 1
    return None


def get_drilldown(return_field, flags, **extra_params):
    """Call the PartsGuide drill-down API."""
    params = {"ReturnField": return_field, **flags, **extra_params}
    data = api_get("PartsGuide", params)
    time.sleep(DELAY)
    if data and data.get("success"):
        return data.get("options", []), data.get("details")
    return [], None


def get_vehicle_results(vehicle_id_encrypted):
    """Get all filter products for a vehicle by its encrypted ID."""
    params = {"VehicleId": vehicle_id_encrypted}
    data = api_get("SearchResultsByKey", params)
    time.sleep(DELAY)
    if data and "groups" in data:
        return data["groups"]
    return []


def load_checkpoint():
    """Load checkpoint for resuming interrupted runs."""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r") as f:
            return json.load(f)
    return {"completed_vehicles": set(), "last_position": {}}


def save_checkpoint(completed_set, position):
    """Save checkpoint for resuming."""
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump({
            "completed_vehicles": list(completed_set),
            "last_position": position,
        }, f)


def extract_all():
    """Main extraction function - walks the entire drill-down tree."""
    stats["start_time"] = datetime.now()

    output_file = "ryco_filters_applications.csv"
    fieldnames = [
        "vehicle_type", "make", "model", "year", "series", "engine",
        "vehicle_detail", "vehicle_id_encrypted",
        "filter_category", "part_number", "part_description",
        "grade", "footnote"
    ]

    # Load checkpoint
    checkpoint = load_checkpoint()
    completed = set(checkpoint.get("completed_vehicles", []))

    # Open CSV in append mode if resuming, write mode if fresh
    mode = "a" if completed else "w"
    file_exists = os.path.exists(output_file) and len(completed) > 0

    with open(output_file, mode, newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()

        for vtype_name, flags in VEHICLE_TYPES.items():
            print(f"\n{'='*60}")
            print(f"Vehicle Type: {vtype_name}")
            print(f"{'='*60}")

            # Step 1: Get all Makes
            makes, _ = get_drilldown("Make", flags)
            print(f"  Found {len(makes)} makes")

            for make_idx, make in enumerate(makes):
                if not make:
                    continue
                print(f"\n  [{make_idx+1}/{len(makes)}] Make: {make}")

                # Step 2: Get all Models for this Make
                models, _ = get_drilldown("Model", flags, Make=make)
                print(f"    Found {len(models)} models")

                for model_idx, model in enumerate(models):
                    if not model:
                        continue
                    print(f"    [{model_idx+1}/{len(models)}] Model: {model}")

                    # Step 3: Get all Years
                    years, _ = get_drilldown("Year", flags, Make=make, Model=model)

                    for year in years:
                        if not year:
                            continue

                        # Step 4: Get all Series
                        series_list, _ = get_drilldown("Series", flags,
                                                        Make=make, Model=model, Year=year)
                        if not series_list:
                            series_list = [""]

                        for series in series_list:
                            # Step 5: Get all Engines
                            engine_params = {"Make": make, "Model": model, "Year": year}
                            if series:
                                engine_params["Series"] = series
                            engines, _ = get_drilldown("Engine", flags, **engine_params)
                            if not engines:
                                engines = [""]

                            for engine in engines:
                                # Step 6: Get Details (vehicle variants + encrypted IDs)
                                detail_params = {**engine_params}
                                if engine:
                                    detail_params["Engine"] = engine

                                _, details_data = get_drilldown("Details", flags, **detail_params)

                                if not details_data:
                                    continue

                                details = details_data if isinstance(details_data, list) else details_data.get("details", []) if isinstance(details_data, dict) else []

                                if not details:
                                    continue

                                for detail in details:
                                    if not isinstance(detail, dict):
                                        continue

                                    vehicle_desc = detail.get("option", "")
                                    vid_encrypted = detail.get("vehicleIdEncrypted", "")

                                    if not vid_encrypted:
                                        continue

                                    # Check if already processed
                                    checkpoint_key = f"{vtype_name}|{vid_encrypted}"
                                    if checkpoint_key in completed:
                                        continue

                                    # Step 7: Get filter results
                                    stats["vehicles_found"] += 1
                                    groups = get_vehicle_results(vid_encrypted)

                                    if not groups:
                                        # Write a row even with no filters for completeness
                                        writer.writerow({
                                            "vehicle_type": vtype_name,
                                            "make": make,
                                            "model": model,
                                            "year": year,
                                            "series": series,
                                            "engine": engine,
                                            "vehicle_detail": vehicle_desc,
                                            "vehicle_id_encrypted": vid_encrypted,
                                            "filter_category": "",
                                            "part_number": "",
                                            "part_description": "",
                                            "grade": "",
                                            "footnote": "",
                                        })
                                    else:
                                        for group in groups:
                                            category = group.get("name", "")
                                            for product in group.get("products", []):
                                                stats["filters_found"] += 1
                                                writer.writerow({
                                                    "vehicle_type": vtype_name,
                                                    "make": make,
                                                    "model": model,
                                                    "year": year,
                                                    "series": series,
                                                    "engine": engine,
                                                    "vehicle_detail": vehicle_desc,
                                                    "vehicle_id_encrypted": vid_encrypted,
                                                    "filter_category": category,
                                                    "part_number": product.get("partNo", ""),
                                                    "part_description": product.get("partDesc", ""),
                                                    "grade": product.get("grade", ""),
                                                    "footnote": product.get("longFootnote", ""),
                                                })

                                    completed.add(checkpoint_key)

                                    # Periodic checkpoint save
                                    if stats["vehicles_found"] % 50 == 0:
                                        csvfile.flush()
                                        save_checkpoint(completed, {
                                            "vehicle_type": vtype_name,
                                            "make": make,
                                            "model": model,
                                        })
                                        elapsed = (datetime.now() - stats["start_time"]).total_seconds()
                                        rate = stats["vehicles_found"] / max(elapsed, 1) * 3600
                                        print(f"\n  --- Progress: {stats['vehicles_found']} vehicles, "
                                              f"{stats['filters_found']} filter rows, "
                                              f"{stats['api_calls']} API calls, "
                                              f"{stats['errors']} errors, "
                                              f"~{rate:.0f} vehicles/hr ---\n")

    # Final stats
    elapsed = (datetime.now() - stats["start_time"]).total_seconds()
    print(f"\n{'='*60}")
    print(f"EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"Vehicles processed: {stats['vehicles_found']}")
    print(f"Filter rows written: {stats['filters_found']}")
    print(f"Total API calls: {stats['api_calls']}")
    print(f"Errors: {stats['errors']}")
    print(f"Time elapsed: {elapsed/3600:.1f} hours")
    print(f"Output: {output_file}")

    # Clean up checkpoint on success
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)


def extract_products_catalog():
    """
    Also extract the full Ryco product catalog (part details, not applications).
    This gives you product descriptions, types, images, availability etc.
    """
    print("Fetching complete Ryco product catalog...")
    resp = SESSION.get(f"{BASE_URL}/GetPublishedParts", timeout=60)
    if resp.status_code != 200:
        print(f"Failed to get product catalog: HTTP {resp.status_code}")
        return

    products = resp.json()
    print(f"Got {len(products)} products")

    output_file = "ryco_products_catalog.csv"
    fieldnames = [
        "product_code", "type_name", "stock_group", "description",
        "web_description", "long_description", "image_url",
        "condition_au", "condition_nz", "availability_au", "availability_nz",
        "roundel_icon", "coming_soon"
    ]

    with open(output_file, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for code, prod in products.items():
            writer.writerow({
                "product_code": code,
                "type_name": prod.get("typeName", ""),
                "stock_group": prod.get("stockGroup", ""),
                "description": prod.get("description", ""),
                "web_description": prod.get("webDescription", ""),
                "long_description": prod.get("longDescription", ""),
                "image_url": prod.get("imageUrl", ""),
                "condition_au": prod.get("conditionAU", ""),
                "condition_nz": prod.get("conditionNZ", ""),
                "availability_au": prod.get("availabilityAU", ""),
                "availability_nz": prod.get("availabilityNZ", ""),
                "roundel_icon": prod.get("roundelIconFileName", ""),
                "coming_soon": prod.get("comingSoon", ""),
            })

    print(f"Product catalog saved to {output_file}")


if __name__ == "__main__":
    print("Ryco Filters Australia - Data Extractor")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Extract product catalog first (fast, single API call)
    extract_products_catalog()
    print()

    # Extract full vehicle-to-filter application data (slow, many API calls)
    extract_all()
