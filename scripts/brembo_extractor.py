#!/usr/bin/env python3
"""
Brembo Parts (Asia Pacific) - Car Application Data Extractor
Extracts vehicle-to-brake-part mappings from bremboparts.com
Cars only (no bikes or commercial vehicles).

Usage:
    python brembo_extractor.py                    # Interactive: pick a brand
    python brembo_extractor.py --brand "TOYOTA"   # Extract specific brand
    python brembo_extractor.py --list-brands      # List all available brands
    python brembo_extractor.py --all              # Extract ALL brands sequentially

Requirements:
    pip install requests beautifulsoup4
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

# --- Configuration ---
BASE_URL = "https://www.bremboparts.com"
REGION = "asiapacific"
LANG = "en"
API_BASE = f"{BASE_URL}/{REGION}/{LANG}/catalogue"
SEARCH_BASE = f"{API_BASE}/search"

OUTPUT_DIR = "brembo_data"
CHECKPOINT_DIR = "brembo_checkpoints"

DELAY_BETWEEN_REQUESTS = 0.8   # seconds between API calls
DELAY_BETWEEN_PAGES = 1.0      # seconds between product page fetches
DELAY_BETWEEN_MODELS = 0.5     # seconds between model queries

VEHICLE_TYPE = "Car"  # Cars only


class BremboExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-AU,en;q=0.9",
        })
        self.token = None

    def _get_token(self):
        """Fetch the homepage and extract the __RequestVerificationToken."""
        print("  Fetching verification token...")
        resp = self.session.get(f"{BASE_URL}/{REGION}/{LANG}")
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        token_input = soup.find("input", {"name": "__RequestVerificationToken"})
        if not token_input:
            raise RuntimeError("Could not find __RequestVerificationToken on page")
        self.token = token_input["value"]
        print(f"  ✓ Token obtained ({len(self.token)} chars)")

    def _api_post(self, url, data):
        """Make an authenticated POST to a Brembo API endpoint."""
        if not self.token:
            self._get_token()

        headers = {
            "Content-Type": "application/json",
            "RequestVerificationToken": self.token,
            "Accept": "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
        }
        resp = self.session.post(url, json=data, headers=headers, timeout=30)

        # If token expired, refresh and retry
        if resp.status_code in (400, 403, 404):
            print("  Token may have expired, refreshing...")
            self._get_token()
            headers["RequestVerificationToken"] = self.token
            resp = self.session.post(url, json=data, headers=headers, timeout=30)

        resp.raise_for_status()
        time.sleep(DELAY_BETWEEN_REQUESTS)
        return resp.json()

    def get_brands(self):
        """Get all car brands."""
        print("  Fetching car brands...")
        brands = self._api_post(
            f"{SEARCH_BASE}/getsearchbrands",
            {"vehicleType": VEHICLE_TYPE}
        )
        print(f"  ✓ Found {len(brands)} car brands")
        return brands

    def get_models(self, brand_code):
        """Get all models for a brand."""
        models = self._api_post(
            f"{SEARCH_BASE}/getsearchmodels",
            {"vehicleType": VEHICLE_TYPE, "brandCode": brand_code}
        )
        return models

    def get_types(self, brand_code, model_code):
        """Get all engine types for a model."""
        types = self._api_post(
            f"{SEARCH_BASE}/getsearchtypes",
            {"vehicleType": VEHICLE_TYPE, "brandCode": brand_code, "modelCode": model_code}
        )
        return types

    def get_product_page_url(self, brand_code, model_code, type_code):
        """Get the product page URL for a specific vehicle type."""
        result = self._api_post(
            f"{SEARCH_BASE}/searchtype",
            {
                "vehicleType": VEHICLE_TYPE,
                "brandCode": brand_code,
                "modelCode": model_code,
                "typeCode": type_code,
                "productTypes": ["All"]
            }
        )
        if "url" in result:
            return result["url"]
        return None

    def fetch_products(self, page_url):
        """Fetch a product page and parse all products from the HTML."""
        full_url = f"{BASE_URL}{page_url}" if page_url.startswith("/") else page_url
        resp = self.session.get(full_url, timeout=30)
        if resp.status_code != 200:
            return []

        time.sleep(DELAY_BETWEEN_PAGES)
        return self._parse_products_html(resp.text)

    def _parse_products_html(self, html):
        """Parse product data from the server-rendered HTML."""
        soup = BeautifulSoup(html, "html.parser")
        products = []

        groups = soup.select(".products-group")
        for group in groups:
            # Get product category (Brake discs, Brake pads, etc.)
            title_el = group.select_one(".title .label")
            category = title_el.get_text(strip=True) if title_el else ""

            # Each app-globalcaritem is a product group
            app_items = group.select("app-globalcaritem")
            for app_item in app_items:
                product_type = app_item.get("product-type", "")

                # Extract specs
                specs = {}
                spec_items = app_item.select(".detail .data .item")
                for si in spec_items:
                    label = si.select_one(".label")
                    detail = si.select_one(".detail")
                    if label and detail:
                        key = label.get_text(strip=True)
                        val = re.sub(r'\s+', ' ', detail.get_text(strip=True))
                        specs[key] = val

                # Extract part number variants (Prime, Xtra, Prime Ceramic, etc.)
                code_items = app_item.select(".codes-list > .item")
                for ci in code_items:
                    type_el = ci.select_one(".type .label")
                    code_el = ci.select_one(".code")
                    if code_el:
                        products.append({
                            "category": category,
                            "product_type": product_type,
                            "line": type_el.get_text(strip=True) if type_el else "",
                            "part_number": code_el.get_text(strip=True),
                            "specs": specs
                        })

        return products


def load_checkpoint(brand_name):
    """Load checkpoint for a brand."""
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    cp_file = os.path.join(CHECKPOINT_DIR, f"brembo_{brand_name.replace(' ', '_').replace('/', '_')}.json")
    if os.path.exists(cp_file):
        with open(cp_file, "r") as f:
            return json.load(f)
    return {"completed_models": [], "total_rows": 0}


def save_checkpoint(brand_name, completed_models, total_rows):
    """Save checkpoint for a brand."""
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    cp_file = os.path.join(CHECKPOINT_DIR, f"brembo_{brand_name.replace(' ', '_').replace('/', '_')}.json")
    with open(cp_file, "w") as f:
        json.dump({
            "completed_models": completed_models,
            "total_rows": total_rows,
            "last_updated": datetime.now().isoformat()
        }, f, indent=2)


def flatten_specs(specs):
    """Flatten specs dict into individual columns."""
    all_keys = [
        "Diameter", "Thickness", "Height", "Width",
        "Number of holes", "Brake disc type", "Centering",
        "Min. thickness", "Tightening torque", "Units per box",
        "Braking system", "Wear indicator", "WVA number", "FMSI",
        "Accessories", "Position"
    ]
    result = {}
    for key in all_keys:
        result[key.lower().replace(" ", "_").replace(".", "")] = specs.get(key, "")
    for key, val in specs.items():
        norm_key = key.lower().replace(" ", "_").replace(".", "")
        if norm_key not in result:
            result[norm_key] = val
    return result


def save_csv(data, filename, brand_name, model_info, type_info):
    """Append product data to CSV file."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, filename)

    if not data:
        return

    rows = []
    for product in data:
        flat_specs = flatten_specs(product.get("specs", {}))
        row = {
            "brand": brand_name,
            "model": model_info.get("modelName", ""),
            "model_date_start": model_info.get("modelDateStart", ""),
            "model_date_end": model_info.get("modelDateEnd", ""),
            "type": type_info.get("typeName", ""),
            "type_date_start": type_info.get("typeDateStart", ""),
            "type_date_end": type_info.get("typeDateEnd", ""),
            "kw": type_info.get("kw", ""),
            "cv": type_info.get("cv", ""),
            "category": product["category"],
            "product_line": product["line"],
            "part_number": product["part_number"],
            **flat_specs
        }
        rows.append(row)

    fieldnames = [
        "brand", "model", "model_date_start", "model_date_end",
        "type", "type_date_start", "type_date_end", "kw", "cv",
        "category", "product_line", "part_number",
        "diameter", "thickness", "height", "width",
        "number_of_holes", "brake_disc_type", "centering",
        "min_thickness", "tightening_torque", "units_per_box",
        "braking_system", "wear_indicator", "wva_number", "fmsi",
        "accessories", "position"
    ]
    for row in rows:
        for key in row:
            if key not in fieldnames:
                fieldnames.append(key)

    file_exists = os.path.exists(filepath)
    with open(filepath, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        if not file_exists:
            writer.writeheader()
        writer.writerows(rows)


def extract_brand(extractor, brand, all_brands=None):
    """Extract all data for a single brand."""
    brand_name = brand["brandName"]
    brand_code = brand["brandCode"]

    print(f"\n{'='*60}")
    print(f"  EXTRACTING: {brand_name} (code: {brand_code})")
    print(f"{'='*60}")

    csv_filename = f"brembo_{brand_name.replace(' ', '_').replace('/', '_')}.csv"
    csv_path = os.path.join(OUTPUT_DIR, csv_filename)

    checkpoint = load_checkpoint(brand_name)
    completed_models = checkpoint["completed_models"]
    total_rows = checkpoint["total_rows"]

    if completed_models:
        print(f"  Resuming - {len(completed_models)} model(s) already completed ({total_rows} rows so far)")

    print(f"  Fetching models for {brand_name}...")
    models = extractor.get_models(brand_code)
    print(f"  ✓ Found {len(models)} model(s)")

    if not models:
        print(f"  No models found for {brand_name}")
        return

    for i, model in enumerate(models):
        model_name = model["modelName"]
        model_code = model["modelCode"]

        if model_code in completed_models:
            print(f"\n  [{i+1}/{len(models)}] {model_name} - SKIPPED (already done)")
            continue

        print(f"\n  [{i+1}/{len(models)}] {model_name} ({model.get('modelDateStart', '')} - {model.get('modelDateEnd', '')})")

        try:
            types = extractor.get_types(brand_code, model_code)
            print(f"    {len(types)} engine type(s)")

            if not types:
                completed_models.append(model_code)
                save_checkpoint(brand_name, completed_models, total_rows)
                continue

            model_rows = 0
            for j, vtype in enumerate(types):
                type_code = vtype["typeCode"]
                type_name = vtype["typeName"]
                print(f"    [{j+1}/{len(types)}] {type_name} ({vtype.get('kw', '?')} kW)")

                try:
                    page_url = extractor.get_product_page_url(brand_code, model_code, type_code)
                    if not page_url:
                        print(f"      No product page URL")
                        continue

                    products = extractor.fetch_products(page_url)
                    if products:
                        save_csv(products, csv_filename, brand_name, model, vtype)
                        model_rows += len(products)
                        total_rows += len(products)
                        print(f"      {len(products)} product(s)")
                    else:
                        print(f"      No products found")

                except Exception as e:
                    print(f"      ERROR: {e}")

                time.sleep(DELAY_BETWEEN_MODELS)

            print(f"    Total for {model_name}: {model_rows} products")

        except Exception as e:
            print(f"    ERROR processing {model_name}: {e}")
            import traceback
            traceback.print_exc()

        completed_models.append(model_code)
        save_checkpoint(brand_name, completed_models, total_rows)

    print(f"\n{'='*60}")
    print(f"  COMPLETE: {brand_name}")
    print(f"  Total rows: {total_rows}")
    print(f"  Output: {csv_path}")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Brembo Parts Car Application Data Extractor")
    parser.add_argument("--brand", type=str, help="Extract data for a specific brand (e.g., 'TOYOTA')")
    parser.add_argument("--list-brands", action="store_true", help="List all available car brands")
    parser.add_argument("--all", action="store_true", help="Extract ALL brands sequentially")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

    print("=" * 60)
    print("  BREMBO PARTS - Car Application Data Extractor")
    print("  Region: Asia Pacific (Australia)")
    print("=" * 60)
    print(f"  Output directory: {OUTPUT_DIR}/")
    print(f"  Checkpoint directory: {CHECKPOINT_DIR}/")
    print()

    extractor = BremboExtractor()
    extractor._get_token()

    brands = extractor.get_brands()

    if args.list_brands:
        print(f"\n  Available Car Brands ({len(brands)}):")
        print("  " + "-" * 40)
        for i, brand in enumerate(brands):
            print(f"  {i+1:4d}. {brand['brandName']} ({brand['brandCode']})")
        return

    if args.brand:
        target = args.brand.strip().upper()
        found = None
        for brand in brands:
            if brand["brandName"].upper() == target:
                found = brand
                break
        if not found:
            matches = [b for b in brands if target in b["brandName"].upper()]
            if len(matches) == 1:
                found = matches[0]
            elif len(matches) > 1:
                print(f"\n  Multiple matches for '{args.brand}':")
                for b in matches:
                    print(f"    - {b['brandName']}")
                print("  Please be more specific.")
                return
            else:
                print(f"\n  Brand '{args.brand}' not found.")
                print("  Use --list-brands to see available brands.")
                return

        extract_brand(extractor, found, brands)

    elif args.all:
        print(f"\n  Will extract ALL {len(brands)} car brands sequentially.")
        print("  Press Ctrl+C to stop (progress is saved).\n")
        for i, brand in enumerate(brands):
            print(f"\n  >>> Brand {i+1}/{len(brands)} <<<")
            try:
                extract_brand(extractor, brand, brands)
            except KeyboardInterrupt:
                print("\n\n  Interrupted. Progress has been saved.")
                print("  Run again with --all to resume.")
                break
            except Exception as e:
                print(f"  ERROR with {brand['brandName']}: {e}")
                continue

    else:
        print(f"\n  Select a brand to extract ({len(brands)} available):")
        print("  " + "-" * 40)
        for i, brand in enumerate(brands):
            print(f"  {i+1:4d}. {brand['brandName']}")

        print()
        choice = input("  Enter number or name: ").strip()
        if choice.isdigit():
            idx = int(choice) - 1
            if 0 <= idx < len(brands):
                extract_brand(extractor, brands[idx], brands)
            else:
                print("  Invalid selection.")
        else:
            for brand in brands:
                if brand["brandName"].upper() == choice.upper():
                    extract_brand(extractor, brand, brands)
                    break
            else:
                print(f"  Brand '{choice}' not found.")


if __name__ == "__main__":
    main()
