#!/usr/bin/env python3
"""
MANN-FILTER Australia - Vehicle Application Data Extractor
Extracts filter application data from mann-filter.com GraphQL API (AU store)
Outputs: mann_filter_applications.csv
"""

import requests
import csv
import time
import json
import os
import string
import re
from datetime import datetime

# === CONFIGURATION ===
GRAPHQL_URL = "https://www.mann-filter.com/api/graphql/catalog-prod"
HEADERS = {
    "Content-Type": "application/json",
    "Store": "pcat_mf_au_store_en",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Origin": "https://www.mann-filter.com",
    "Referer": "https://www.mann-filter.com/au-en/catalog.html"
}

OUTPUT_CSV = "mann_filter_applications.csv"
CHECKPOINT_FILE = "mann_filter_checkpoint.json"
BRANDS_CACHE_FILE = "mann_filter_brands.json"
DELAY_BETWEEN_REQUESTS = 0.3  # seconds
CARS_SEGMENT_ID = "01"  # Cars + Transporters only
PAGE_SIZE_MODELS = 500
PAGE_SIZE_PRODUCTS = 100

# === CSV COLUMNS ===
CSV_HEADERS = [
    "Make", "Model", "Model_Date_Range", "Vehicle_Name",
    "Engine_Code", "CCM", "kW", "BHP", "Fuel_Type",
    "Model_Code", "Manufactured_From", "Manufactured_To",
    "Filter_Type", "Part_Number", "Product_Name",
    "Fits_From", "Fits_To", "Linkage_Notes",
    "Product_URL"
]

# === GRAPHQL QUERIES ===

BRAND_SUGGESTION_QUERY = """
query($vehicleMake: String!) {
  brand_id_suggestion(search: $vehicleMake) {
    suggestions {
      vehicle_brand_id
      vehicle_brand_name
      vehicle_application_segment_id
    }
  }
}
"""

MODELS_QUERY = """
query($brandId: String!, $pageSize: Int!) {
  modelCollectionByBrandId(vehicle_brand_id: $brandId, pageSize: $pageSize) {
    models {
      model_series_id
      model_series_name
      model_series_date
    }
  }
}
"""

VEHICLE_TYPES_QUERY = """
query($modelSeriesId: String!) {
  modelTypeCollection(model_series_id: $modelSeriesId) {
    allModelTypes {
      bhp
      ccm
      engine_code
      fuel_type
      kw
      model_code
      model_type_id
      vehicle_manufactured_from
      vehicle_manufactured_to
      vehicle_name
    }
  }
}
"""

# Note: filterBy is an ENUM (ALL_FILTER) - passed inline, not as a variable
PRODUCTS_QUERY = """
{
  productLinkageCollection(vehicle_model_type_id: "%s", filterBy: ALL_FILTER, currentPage: %d, pageSize: %d) {
    total_count
    page_info {
      current_page
      page_size
      total_pages
    }
    items {
      product_name
      product_type
      product {
        sku
        url_key
      }
      linkages {
        date_interval {
          linkage_fits_from
          linkage_fits_to
        }
        text {
          module_name
          module_value
        }
      }
    }
  }
}
"""


def graphql_request(query, variables=None, retries=3):
    """Make a GraphQL request with retry logic."""
    body = {"query": query}
    if variables:
        body["variables"] = variables

    for attempt in range(retries):
        try:
            resp = requests.post(GRAPHQL_URL, headers=HEADERS, json=body, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            if "errors" in data and data["errors"]:
                error_msg = data["errors"][0].get("message", "Unknown error")
                print(f"  [GraphQL Error] {error_msg}")
                if attempt < retries - 1:
                    time.sleep(2)
                    continue
                return None

            return data.get("data")

        except requests.exceptions.RequestException as e:
            print(f"  [Request Error] Attempt {attempt+1}/{retries}: {e}")
            if attempt < retries - 1:
                time.sleep(3 * (attempt + 1))
            else:
                return None

    return None


def discover_all_car_brands():
    """Discover all car brands by searching with various prefixes.
    The autocomplete API returns max 10 results per search,
    so we need to search systematically to find all brands.
    """
    # Check cache first
    if os.path.exists(BRANDS_CACHE_FILE):
        print(f"Loading brands from cache: {BRANDS_CACHE_FILE}")
        with open(BRANDS_CACHE_FILE, "r") as f:
            return json.load(f)

    print("Discovering all car brands (this may take a minute)...")
    all_brands = {}  # id -> name

    # Strategy 1: Single letters a-z
    search_terms = list(string.ascii_lowercase)

    # Strategy 2: Two-letter combos (common starting pairs)
    two_letter = []
    for c1 in string.ascii_lowercase:
        for c2 in 'aeiou':  # consonant + vowel combos
            two_letter.append(c1 + c2)
        for c2 in ['r', 'l', 'n', 's', 't', 'w', 'h', 'm', 'c', 'k', 'g', 'p', 'b', 'd', 'f', 'v', 'y', 'z']:
            two_letter.append(c1 + c2)
    search_terms.extend(two_letter)

    # Strategy 3: Specific known brand name searches
    specific_brands = [
        'alfa romeo', 'aston martin', 'audi', 'bentley', 'bmw', 'buick', 'byd',
        'cadillac', 'chery', 'chevrolet', 'chrysler', 'citroen', 'cupra',
        'dacia', 'daewoo', 'daf', 'daihatsu', 'datsun', 'dodge', 'ds',
        'ferrari', 'fiat', 'ford', 'foton',
        'geely', 'general motors', 'genesis', 'gmc', 'great wall', 'gwm', 'grecav',
        'haval', 'holden', 'honda', 'hummer', 'hyundai',
        'ineos', 'infiniti', 'innocenti', 'isuzu', 'iveco',
        'jaguar', 'jeep',
        'kia', 'lada', 'lamborghini', 'lancia', 'land rover', 'ldv', 'lexus',
        'leyland', 'ligier', 'lincoln', 'london taxi', 'lotus',
        'mahindra', 'maserati', 'mazda', 'mclaren', 'mega', 'mercedes', 'mg',
        'microcar', 'mini', 'mitsubishi', 'morgan', 'morris', 'moskvitch',
        'nissan', 'oldsmobile', 'opel',
        'panther', 'peugeot', 'piaggio', 'plymouth', 'polestar', 'pontiac',
        'porsche', 'proton',
        'ram', 'ravon', 'renault', 'rolls royce', 'rover',
        'saab', 'saturn', 'scion', 'seat', 'skoda', 'smart', 'ssangyong', 'subaru', 'suzuki',
        'talbot', 'tata', 'tesla', 'tofas', 'toyota', 'triumph', 'tvr',
        'uaz', 'vauxhall', 'volkswagen', 'volga', 'volvo', 'vw',
        'wartburg', 'zaz'
    ]
    search_terms.extend(specific_brands)

    # Deduplicate
    search_terms = list(dict.fromkeys(search_terms))

    total = len(search_terms)
    for i, term in enumerate(search_terms):
        if (i + 1) % 50 == 0:
            print(f"  Searching... {i+1}/{total} terms processed, {len(all_brands)} brands found so far")

        data = graphql_request(BRAND_SUGGESTION_QUERY, {"vehicleMake": term})
        if data and data.get("brand_id_suggestion"):
            suggestions = data["brand_id_suggestion"].get("suggestions", [])
            for s in suggestions:
                if s.get("vehicle_application_segment_id") == CARS_SEGMENT_ID:
                    brand_id = s["vehicle_brand_id"]
                    if brand_id not in all_brands:
                        all_brands[brand_id] = s["vehicle_brand_name"]

        time.sleep(0.1)  # Light delay for brand discovery

    brand_list = [
        {"id": bid, "name": bname}
        for bid, bname in sorted(all_brands.items(), key=lambda x: x[1])
    ]

    print(f"  Found {len(brand_list)} unique car brands")

    # Cache the results
    with open(BRANDS_CACHE_FILE, "w") as f:
        json.dump(brand_list, f, indent=2)
    print(f"  Saved brand cache to {BRANDS_CACHE_FILE}")

    return brand_list


def get_models(brand_id):
    """Get all models for a brand."""
    data = graphql_request(MODELS_QUERY, {
        "brandId": brand_id,
        "pageSize": PAGE_SIZE_MODELS
    })
    if data and data.get("modelCollectionByBrandId"):
        return data["modelCollectionByBrandId"].get("models", [])
    return []


def get_vehicle_types(model_series_id):
    """Get all vehicle types (engine variants) for a model."""
    data = graphql_request(VEHICLE_TYPES_QUERY, {
        "modelSeriesId": model_series_id
    })
    if data and data.get("modelTypeCollection"):
        return data["modelTypeCollection"].get("allModelTypes", [])
    return []


def get_products(vehicle_model_type_id):
    """Get all filter products for a vehicle type. Handles pagination."""
    all_items = []
    page = 1

    while True:
        query = PRODUCTS_QUERY % (vehicle_model_type_id, page, PAGE_SIZE_PRODUCTS)
        data = graphql_request(query)

        if not data or not data.get("productLinkageCollection"):
            break

        collection = data["productLinkageCollection"]
        items = collection.get("items", [])
        all_items.extend(items)

        page_info = collection.get("page_info", {})
        total_pages = page_info.get("total_pages", 1)

        if page >= total_pages:
            break

        page += 1
        time.sleep(DELAY_BETWEEN_REQUESTS)

    return all_items


def format_date(date_str):
    """Format date string for display. Returns empty string for sentinel dates."""
    if not date_str or date_str == "9999-12-31" or date_str == "1900-01-01":
        return ""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%Y-%m")
    except ValueError:
        return date_str


def format_sku(sku):
    """Clean up SKU - remove _MANN-FILTER suffix."""
    if sku and sku.endswith("_MANN-FILTER"):
        return sku.replace("_MANN-FILTER", "")
    return sku or ""


def build_product_url(url_key):
    """Build full product URL."""
    if url_key:
        return f"https://www.mann-filter.com/au-en/catalog/{url_key}.html"
    return ""


def load_checkpoint():
    """Load checkpoint data."""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r") as f:
            return json.load(f)
    return {"completed_brands": [], "total_rows": 0}


def save_checkpoint(checkpoint):
    """Save checkpoint data."""
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump(checkpoint, f, indent=2)


def main():
    print("=" * 70)
    print("MANN-FILTER Australia - Application Data Extractor")
    print("=" * 70)
    print(f"Output: {OUTPUT_CSV}")
    print(f"Segment: Cars + Transporters only (segment_id={CARS_SEGMENT_ID})")
    print()

    # Step 1: Discover all brands
    brands = discover_all_car_brands()
    print(f"\nTotal brands to process: {len(brands)}")

    # Step 2: Load checkpoint
    checkpoint = load_checkpoint()
    completed_brands = set(checkpoint.get("completed_brands", []))
    total_rows = checkpoint.get("total_rows", 0)

    # Step 3: Open CSV (append if resuming)
    file_mode = "a" if completed_brands else "w"
    csv_file = open(OUTPUT_CSV, file_mode, newline="", encoding="utf-8-sig")
    writer = csv.writer(csv_file)

    if not completed_brands:
        writer.writerow(CSV_HEADERS)

    print(f"Resuming from checkpoint: {len(completed_brands)} brands already completed, {total_rows} rows written")
    print()

    try:
        for brand_idx, brand in enumerate(brands):
            brand_id = brand["id"]
            brand_name = brand["name"]

            if brand_id in completed_brands:
                continue

            print(f"\n[{brand_idx+1}/{len(brands)}] Processing: {brand_name} ({brand_id})")

            # Get models
            models = get_models(brand_id)
            if not models:
                print(f"  No models found, skipping")
                completed_brands.add(brand_id)
                checkpoint["completed_brands"] = list(completed_brands)
                save_checkpoint(checkpoint)
                continue

            print(f"  Found {len(models)} models")
            brand_rows = 0

            for model_idx, model in enumerate(models):
                model_name = model.get("model_series_name", "")
                model_date = model.get("model_series_date", "")
                model_series_id = model.get("model_series_id", "")

                # Get vehicle types
                time.sleep(DELAY_BETWEEN_REQUESTS)
                vehicle_types = get_vehicle_types(model_series_id)

                if not vehicle_types:
                    continue

                for vtype in vehicle_types:
                    vehicle_name = vtype.get("vehicle_name", "")
                    engine_code = vtype.get("engine_code", "")
                    ccm = vtype.get("ccm", "")
                    kw = vtype.get("kw", "")
                    bhp = vtype.get("bhp", "")
                    fuel_type = vtype.get("fuel_type", "")
                    model_code = vtype.get("model_code", "")
                    mfg_from = format_date(vtype.get("vehicle_manufactured_from", ""))
                    mfg_to = format_date(vtype.get("vehicle_manufactured_to", ""))
                    model_type_id = vtype.get("model_type_id", "")

                    # Get products
                    time.sleep(DELAY_BETWEEN_REQUESTS)
                    products = get_products(model_type_id)

                    if not products:
                        # Still record the vehicle even with no products
                        row = [
                            brand_name, model_name, model_date, vehicle_name,
                            engine_code, ccm, kw, bhp, fuel_type,
                            model_code, mfg_from, mfg_to,
                            "", "", "",
                            "", "", "",
                            ""
                        ]
                        writer.writerow(row)
                        total_rows += 1
                        brand_rows += 1
                        continue

                    for product in products:
                        product_type = product.get("product_type", "")
                        product_name = product.get("product_name", "")
                        prod_info = product.get("product", {}) or {}
                        sku = format_sku(prod_info.get("sku", ""))
                        url_key = prod_info.get("url_key", "")
                        product_url = build_product_url(url_key)

                        # Process linkages
                        linkages = product.get("linkages", [])
                        if linkages:
                            for linkage in linkages:
                                date_interval = linkage.get("date_interval", {}) or {}
                                fits_from = format_date(date_interval.get("linkage_fits_from", ""))
                                fits_to = format_date(date_interval.get("linkage_fits_to", ""))

                                # Collect text modules (notes)
                                text_modules = linkage.get("text", []) or []
                                notes_parts = []
                                for tm in text_modules:
                                    name = tm.get("module_name", "")
                                    value = tm.get("module_value", "")
                                    if name and value:
                                        notes_parts.append(f"{name}: {value}")
                                    elif value:
                                        notes_parts.append(value)
                                notes = "; ".join(notes_parts)

                                row = [
                                    brand_name, model_name, model_date, vehicle_name,
                                    engine_code, ccm, kw, bhp, fuel_type,
                                    model_code, mfg_from, mfg_to,
                                    product_type, sku, product_name,
                                    fits_from, fits_to, notes,
                                    product_url
                                ]
                                writer.writerow(row)
                                total_rows += 1
                                brand_rows += 1
                        else:
                            # Product with no linkage details
                            row = [
                                brand_name, model_name, model_date, vehicle_name,
                                engine_code, ccm, kw, bhp, fuel_type,
                                model_code, mfg_from, mfg_to,
                                product_type, sku, product_name,
                                "", "", "",
                                product_url
                            ]
                            writer.writerow(row)
                            total_rows += 1
                            brand_rows += 1

                # Progress within brand
                if (model_idx + 1) % 10 == 0:
                    print(f"    Models processed: {model_idx+1}/{len(models)}")

            print(f"  Completed {brand_name}: {brand_rows} rows ({total_rows} total)")

            # Save checkpoint after each brand
            completed_brands.add(brand_id)
            checkpoint["completed_brands"] = list(completed_brands)
            checkpoint["total_rows"] = total_rows
            save_checkpoint(checkpoint)

            # Flush CSV
            csv_file.flush()

    except KeyboardInterrupt:
        print("\n\n[Interrupted] Saving checkpoint...")
        checkpoint["completed_brands"] = list(completed_brands)
        checkpoint["total_rows"] = total_rows
        save_checkpoint(checkpoint)
        print(f"Checkpoint saved. {total_rows} rows written. Resume by running again.")

    except Exception as e:
        print(f"\n[Error] {e}")
        checkpoint["completed_brands"] = list(completed_brands)
        checkpoint["total_rows"] = total_rows
        save_checkpoint(checkpoint)
        print(f"Checkpoint saved. {total_rows} rows written. Resume by running again.")
        raise

    finally:
        csv_file.close()

    print("\n" + "=" * 70)
    print(f"EXTRACTION COMPLETE")
    print(f"Total rows: {total_rows}")
    print(f"Brands processed: {len(completed_brands)}/{len(brands)}")
    print(f"Output: {OUTPUT_CSV}")
    print("=" * 70)

    # Clean up checkpoint on successful completion
    if len(completed_brands) == len(brands):
        if os.path.exists(CHECKPOINT_FILE):
            os.remove(CHECKPOINT_FILE)
            print("Checkpoint file removed (extraction complete)")


if __name__ == "__main__":
    main()
