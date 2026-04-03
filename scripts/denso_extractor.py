#!/usr/bin/env python3
"""
Denso Australia Part Search Extractor
Extracts complete vehicle-to-part application data from denso.com.au
"""

import requests
from bs4 import BeautifulSoup
import csv
import json
import time
import os
import re
import logging
from datetime import datetime

# ─── Configuration ───────────────────────────────────────────────────────
BASE_URL = "https://www.denso.com.au"
DELAY = 0.5            # Seconds between requests
CHECKPOINT_FILE = "denso_checkpoint.json"
OUTPUT_CSV = "denso_parts.csv"
LOG_FILE = "denso_extraction.log"

# ─── Logging ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ─── CSV Columns ─────────────────────────────────────────────────────────
CSV_HEADERS = [
    "Make", "Make_ID", "Model", "Model_ID", "Year",
    "Vehicle_ID", "Engine_Codes", "CC", "Cylinders", "KW",
    "Engine_Type", "Drive_Type", "Series",
    "Category", "Subcategory", "Part_Number", "Qty_Per"
]


class DensoExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-AU,en;q=0.9",
        })
        self.checkpoint = self._load_checkpoint()
        self.csv_file = None
        self.csv_writer = None
        self.rows_written = 0

    # ─── Checkpoint Management ───────────────────────────────────────
    def _load_checkpoint(self):
        if os.path.exists(CHECKPOINT_FILE):
            with open(CHECKPOINT_FILE, "r") as f:
                cp = json.load(f)
                logger.info(f"Loaded checkpoint: {cp.get('last_make', '?')} / "
                            f"{cp.get('last_model', '?')} / {cp.get('last_year', '?')} / "
                            f"{cp.get('last_engine', '?')}")
                return cp
        return {"completed_vehicles": [], "last_make": None, "last_model": None,
                "last_year": None, "last_engine": None}

    def _save_checkpoint(self, make_name=None, model_name=None, year=None, engine_id=None):
        self.checkpoint["last_make"] = make_name
        self.checkpoint["last_model"] = model_name
        self.checkpoint["last_year"] = year
        self.checkpoint["last_engine"] = engine_id
        with open(CHECKPOINT_FILE, "w") as f:
            json.dump(self.checkpoint, f, indent=2)

    def _is_completed(self, vehicle_key):
        return vehicle_key in self.checkpoint.get("completed_vehicles", [])

    def _mark_completed(self, vehicle_key):
        if "completed_vehicles" not in self.checkpoint:
            self.checkpoint["completed_vehicles"] = []
        self.checkpoint["completed_vehicles"].append(vehicle_key)

    # ─── CSV Management ──────────────────────────────────────────────
    def _open_csv(self):
        file_exists = os.path.exists(OUTPUT_CSV) and os.path.getsize(OUTPUT_CSV) > 0
        self.csv_file = open(OUTPUT_CSV, "a", newline="", encoding="utf-8")
        self.csv_writer = csv.DictWriter(self.csv_file, fieldnames=CSV_HEADERS)
        if not file_exists:
            self.csv_writer.writeheader()

    def _write_row(self, row):
        self.csv_writer.writerow(row)
        self.rows_written += 1
        if self.rows_written % 50 == 0:
            self.csv_file.flush()

    def _close_csv(self):
        if self.csv_file:
            self.csv_file.close()

    # ─── API Calls ───────────────────────────────────────────────────
    def get_makes(self):
        """Get all makes from the Part Search page HTML."""
        logger.info("Fetching makes from part-search page...")
        resp = self.session.get(f"{BASE_URL}/part-search", timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        select = soup.find("select", {"id": "maker_id"})
        makes = []
        if select:
            for opt in select.find_all("option"):
                val = opt.get("value", "").strip()
                text = opt.get_text(strip=True)
                if val:
                    makes.append({"make_id": val, "make_name": text})
        logger.info(f"Found {len(makes)} makes")
        return makes

    def get_models(self, make_id):
        """Get all models for a given make ID."""
        time.sleep(DELAY)
        resp = self.session.post(
            f"{BASE_URL}/get-models",
            data={"maker_id": make_id},
            headers={"X-Requested-With": "XMLHttpRequest"},
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        return data  # List of {model_id, model_name, make_name}

    def get_years(self, make_id, model_name):
        """Get all years for a given make + model."""
        time.sleep(DELAY)
        resp = self.session.post(
            f"{BASE_URL}/get-years",
            data={"maker_id": make_id, "model_id": model_name},
            headers={"X-Requested-With": "XMLHttpRequest"},
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        return data  # List of integers [2026, 2025, ...]

    def get_engines(self, make_id, model_name, year):
        """Get all engine variants for a given make + model + year."""
        time.sleep(DELAY)
        resp = self.session.post(
            f"{BASE_URL}/get-engine",
            data={"maker_id": make_id, "model_id": model_name, "model_year": year},
            headers={"X-Requested-With": "XMLHttpRequest"},
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        return data  # List of {vehicle_id, engine_codes, cc, cylinders, kw, engine_type, drive_type, series}

    def set_vehicle_context(self, make_id, model_name, year, vehicle_id):
        """POST to /part-search/category to set the vehicle in the session."""
        time.sleep(DELAY)
        resp = self.session.post(
            f"{BASE_URL}/part-search/category",
            data={
                "maker_id": make_id,
                "model_id": model_name,
                "model_year": year,
                "model_engine": vehicle_id
            },
            timeout=30,
            allow_redirects=True
        )
        resp.raise_for_status()
        return resp.text

    def get_categories(self, category_html=None):
        """Extract product categories from the category page HTML."""
        if category_html is None:
            resp = self.session.get(f"{BASE_URL}/part-search/category", timeout=30)
            resp.raise_for_status()
            category_html = resp.text

        soup = BeautifulSoup(category_html, "html.parser")
        links = soup.find_all("a", href=re.compile(r"/part-search/category/[a-z]"))
        categories = []
        seen = set()
        for link in links:
            href = link.get("href", "")
            text = link.get_text(strip=True)
            # Only top-level categories (one slug after /category/)
            parts = href.rstrip("/").split("/part-search/category/")
            if len(parts) == 2 and "/" not in parts[1] and text and href not in seen:
                seen.add(href)
                categories.append({"slug": parts[1], "name": text, "url": href})
        return categories

    def get_subcategories(self, category_slug):
        """Get subcategories for a given category."""
        time.sleep(DELAY)
        resp = self.session.get(
            f"{BASE_URL}/part-search/category/{category_slug}",
            timeout=30
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        links = soup.find_all("a", href=re.compile(
            rf"/part-search/category/{re.escape(category_slug)}/[a-z]"
        ))
        subcategories = []
        seen = set()
        for link in links:
            href = link.get("href", "")
            text = link.get_text(strip=True)
            slug_parts = href.rstrip("/").split(f"{category_slug}/")
            if len(slug_parts) == 2 and text and href not in seen:
                seen.add(href)
                subcategories.append({
                    "slug": slug_parts[1],
                    "name": text,
                    "url": href
                })

        # If no subcategories found, check if products are directly on this page
        if not subcategories:
            products = self._extract_products_from_soup(soup)
            if products:
                # This category has products directly (no subcategory level)
                subcategories.append({
                    "slug": "",
                    "name": "(direct)",
                    "url": f"{BASE_URL}/part-search/category/{category_slug}",
                    "products": products
                })
        return subcategories

    def get_products(self, category_slug, subcategory_slug):
        """Get all products from a subcategory page."""
        time.sleep(DELAY)
        url = f"{BASE_URL}/part-search/category/{category_slug}/{subcategory_slug}"
        resp = self.session.get(url, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        return self._extract_products_from_soup(soup)

    def _extract_products_from_soup(self, soup):
        """Extract product info from a BeautifulSoup parsed page."""
        products = []
        product_infos = soup.find_all("div", class_="product-info")
        for pi in product_infos:
            title_link = pi.find("h2", class_="product-title")
            if title_link:
                a_tag = title_link.find("a")
                part_number = a_tag.get_text(strip=True) if a_tag else title_link.get_text(strip=True)
            else:
                continue

            price_div = pi.find("div", class_="product-price")
            qty_per = ""
            if price_div:
                span = price_div.find("span")
                if span:
                    qty_text = span.get_text(strip=True)
                    # Extract number from "Qty Per:4"
                    qty_match = re.search(r"Qty Per:\s*(\d+)", qty_text)
                    if qty_match:
                        qty_per = qty_match.group(1)

            products.append({"part_number": part_number, "qty_per": qty_per})

        return products

    # ─── Main Extraction ─────────────────────────────────────────────
    def extract_all(self):
        """Main extraction loop."""
        self._open_csv()

        try:
            makes = self.get_makes()
            logger.info(f"Starting extraction for {len(makes)} makes")

            # Resume support: find starting point
            start_make = self.checkpoint.get("last_make")
            skip_makes = start_make is not None

            for make_idx, make in enumerate(makes):
                make_name = make["make_name"]
                make_id = make["make_id"]

                if skip_makes:
                    if make_name == start_make:
                        skip_makes = False
                    else:
                        logger.info(f"Skipping make {make_name} (resuming)")
                        continue

                logger.info(f"[{make_idx+1}/{len(makes)}] Processing make: {make_name} (ID: {make_id})")

                try:
                    models = self.get_models(make_id)
                except Exception as e:
                    logger.error(f"  Error getting models for {make_name}: {e}")
                    continue

                if not models:
                    logger.info(f"  No models found for {make_name}")
                    continue

                logger.info(f"  Found {len(models)} models")

                # Resume support: find starting model
                start_model = self.checkpoint.get("last_model") if make_name == self.checkpoint.get("last_make") else None
                skip_models = start_model is not None

                for model_idx, model in enumerate(models):
                    model_name = model["model_name"]
                    model_id = model.get("model_id", "")

                    if skip_models:
                        if model_name == start_model:
                            skip_models = False
                        else:
                            continue

                    logger.info(f"    [{model_idx+1}/{len(models)}] Model: {model_name}")

                    try:
                        years = self.get_years(make_id, model_name)
                    except Exception as e:
                        logger.error(f"    Error getting years for {model_name}: {e}")
                        continue

                    if not years:
                        logger.info(f"    No years found for {model_name}")
                        continue

                    # Resume support: find starting year
                    start_year = self.checkpoint.get("last_year") if model_name == self.checkpoint.get("last_model") else None
                    skip_years = start_year is not None

                    for year in years:
                        year_str = str(year)

                        if skip_years:
                            if year_str == str(start_year):
                                skip_years = False
                            else:
                                continue

                        try:
                            engines = self.get_engines(make_id, model_name, year_str)
                        except Exception as e:
                            logger.error(f"      Error getting engines for {model_name} {year_str}: {e}")
                            continue

                        if not engines:
                            continue

                        # Resume support: find starting engine
                        start_engine = self.checkpoint.get("last_engine") if year_str == str(self.checkpoint.get("last_year")) else None
                        skip_engines = start_engine is not None

                        for engine in engines:
                            vehicle_id = engine["vehicle_id"]
                            vehicle_key = f"{make_id}_{model_name}_{year_str}_{vehicle_id}"

                            if skip_engines:
                                if vehicle_id == start_engine:
                                    skip_engines = False
                                else:
                                    continue

                            if self._is_completed(vehicle_key):
                                continue

                            engine_desc = (f"{engine.get('engine_codes','')} "
                                           f"{engine.get('cc','')}cc "
                                           f"{engine.get('engine_type','')}")
                            logger.info(f"      Engine: {engine_desc} (VID: {vehicle_id})")

                            try:
                                self._extract_vehicle_parts(make, model, year_str, engine)
                                self._mark_completed(vehicle_key)
                                self._save_checkpoint(make_name, model_name, year_str, vehicle_id)
                            except Exception as e:
                                logger.error(f"      Error extracting parts: {e}")
                                self._save_checkpoint(make_name, model_name, year_str, vehicle_id)
                                continue

                logger.info(f"  Completed make: {make_name}")

        except KeyboardInterrupt:
            logger.info("Interrupted by user. Progress saved.")
        finally:
            self._save_checkpoint()
            self._close_csv()
            logger.info(f"Total rows written: {self.rows_written}")

    def _extract_vehicle_parts(self, make, model, year, engine):
        """Extract all parts for a specific vehicle/engine combination."""
        make_name = make["make_name"]
        make_id = make["make_id"]
        model_name = model["model_name"]
        model_id = model.get("model_id", "")
        vehicle_id = engine["vehicle_id"]

        # Step 1: Set vehicle context via POST
        category_html = self.set_vehicle_context(make_id, model_name, year, vehicle_id)

        # Step 2: Get categories from the response
        categories = self.get_categories(category_html)

        if not categories:
            logger.info(f"        No categories found")
            return

        parts_found = 0

        # Step 3: For each category, get subcategories and products
        for cat in categories:
            try:
                subcategories = self.get_subcategories(cat["slug"])
            except Exception as e:
                logger.error(f"        Error getting subcategories for {cat['name']}: {e}")
                continue

            for subcat in subcategories:
                try:
                    # If products were already extracted (direct category, no subcategory)
                    if "products" in subcat:
                        products = subcat["products"]
                    else:
                        products = self.get_products(cat["slug"], subcat["slug"])
                except Exception as e:
                    logger.error(f"        Error getting products for {cat['name']}/{subcat['name']}: {e}")
                    continue

                for product in products:
                    row = {
                        "Make": make_name,
                        "Make_ID": make_id,
                        "Model": model_name,
                        "Model_ID": model_id,
                        "Year": year,
                        "Vehicle_ID": vehicle_id,
                        "Engine_Codes": engine.get("engine_codes", ""),
                        "CC": engine.get("cc", ""),
                        "Cylinders": engine.get("cylinders", ""),
                        "KW": engine.get("kw", ""),
                        "Engine_Type": engine.get("engine_type", ""),
                        "Drive_Type": engine.get("drive_type", ""),
                        "Series": engine.get("series", ""),
                        "Category": cat["name"],
                        "Subcategory": subcat["name"],
                        "Part_Number": product["part_number"],
                        "Qty_Per": product["qty_per"],
                    }
                    self._write_row(row)
                    parts_found += 1

        logger.info(f"        Found {parts_found} parts")


# ─── Single-Make Mode ────────────────────────────────────────────────────
def extract_single_make(make_name_filter):
    """Extract data for a single make (for batch processing one at a time)."""
    extractor = DensoExtractor()
    makes = extractor.get_makes()

    # Find the matching make
    target_make = None
    for m in makes:
        if m["make_name"].upper() == make_name_filter.upper():
            target_make = m
            break

    if not target_make:
        logger.error(f"Make '{make_name_filter}' not found. Available makes:")
        for m in makes:
            logger.info(f"  {m['make_name']}")
        return

    logger.info(f"Extracting data for {target_make['make_name']} (ID: {target_make['make_id']})")

    extractor._open_csv()
    try:
        models = extractor.get_models(target_make["make_id"])
        logger.info(f"Found {len(models)} models")

        for model_idx, model in enumerate(models):
            model_name = model["model_name"]
            logger.info(f"  [{model_idx+1}/{len(models)}] Model: {model_name}")

            try:
                years = extractor.get_years(target_make["make_id"], model_name)
            except Exception as e:
                logger.error(f"    Error getting years: {e}")
                continue

            for year in years:
                try:
                    engines = extractor.get_engines(target_make["make_id"], model_name, str(year))
                except Exception as e:
                    logger.error(f"    Error getting engines for {year}: {e}")
                    continue

                for engine in engines:
                    vehicle_key = f"{target_make['make_id']}_{model_name}_{year}_{engine['vehicle_id']}"
                    if extractor._is_completed(vehicle_key):
                        continue

                    try:
                        extractor._extract_vehicle_parts(target_make, model, str(year), engine)
                        extractor._mark_completed(vehicle_key)
                        extractor._save_checkpoint(target_make["make_name"], model_name, str(year), engine["vehicle_id"])
                    except Exception as e:
                        logger.error(f"      Error: {e}")
                        continue

    except KeyboardInterrupt:
        logger.info("Interrupted. Progress saved.")
    finally:
        extractor._save_checkpoint()
        extractor._close_csv()
        logger.info(f"Total rows written: {extractor.rows_written}")


# ─── Main ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        # Single make mode: python denso_extractor.py TOYOTA
        make_filter = " ".join(sys.argv[1:])
        extract_single_make(make_filter)
    else:
        # Full extraction mode
        extractor = DensoExtractor()
        extractor.extract_all()
