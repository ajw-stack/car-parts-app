#!/usr/bin/env python3
"""
Monroe Australia Part Search Extractor
Extracts complete vehicle-to-part application data from monroe.com.au
Uses TecDoc-based REST API via WordPress proxy — pure requests, no Selenium.
"""

import requests
import csv
import json
import time
import os
import logging
from datetime import datetime

# ─── Configuration ───────────────────────────────────────────────────────
BASE_URL = "https://monroe.com.au"
API_PROXY = f"{BASE_URL}/wp-json/parts-search/v1/proxy"
API_VEHICLES_P = f"{API_PROXY}/vehicles/p/au/"   # Passenger
API_VEHICLES_C = f"{API_PROXY}/vehicles/c/au/"   # Commercial / Heavy Duty
API_MAKES_P = f"{API_PROXY}/makes/p/au/"
API_MAKES_C = f"{API_PROXY}/makes/c/au/"

DELAY = 0.5              # Seconds between article requests
CHECKPOINT_FILE = "monroe_checkpoint.json"
OUTPUT_CSV = "monroe_parts.csv"
LOG_FILE = "monroe_extraction.log"

# Fixed API parameters (from the Angular app)
BRAND_ID = 7777777777
PROVIDER = 8888888888
LANG = "qb"

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
    "Vehicle_Type", "Make", "Model", "Type_Name",
    "Construction_Type", "Fuel_Type", "Drive_Type",
    "Power_KW", "Power_HP",
    "Year_From", "Year_To",
    "Car_ID", "Manu_ID", "Mod_ID",
    "Part_Number", "Product_Family", "Part_Type",
    "Assembly_Group", "Is_Accessory",
    "Fitting_Position", "Required_Qty",
    "Model_Year_From", "Model_Year_To",
    "For_Model_Code", "Notes",
    "OEM_Numbers"
]


class MonroeExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "Origin": BASE_URL,
            "Referer": f"{BASE_URL}/",
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
                logger.info(f"Loaded checkpoint: {len(cp.get('completed_cars', []))} vehicles done")
                return cp
        return {"completed_cars": [], "last_car_id": None}

    def _save_checkpoint(self, car_id=None):
        if car_id:
            self.checkpoint["last_car_id"] = car_id
        with open(CHECKPOINT_FILE, "w") as f:
            json.dump(self.checkpoint, f)

    def _is_completed(self, car_id):
        return car_id in self.checkpoint.get("completed_cars", [])

    def _mark_completed(self, car_id):
        if "completed_cars" not in self.checkpoint:
            self.checkpoint["completed_cars"] = []
        self.checkpoint["completed_cars"].append(car_id)
        # Save periodically
        if len(self.checkpoint["completed_cars"]) % 100 == 0:
            self._save_checkpoint(car_id)

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
        if self.rows_written % 100 == 0:
            self.csv_file.flush()

    def _close_csv(self):
        if self.csv_file:
            self.csv_file.flush()
            self.csv_file.close()

    # ─── API Calls ───────────────────────────────────────────────────
    def get_all_vehicles(self, vehicle_type="p"):
        """Fetch ALL vehicles in a single GET request."""
        url = API_VEHICLES_P if vehicle_type == "p" else API_VEHICLES_C
        type_label = "passenger" if vehicle_type == "p" else "commercial"
        logger.info(f"Fetching all {type_label} vehicles from {url}...")

        resp = self.session.get(url, timeout=60)
        resp.raise_for_status()
        vehicles = resp.json()
        logger.info(f"Retrieved {len(vehicles)} {type_label} vehicles")
        return vehicles

    def get_articles(self, car_id, vehicle_type="P"):
        """Get all Monroe parts for a specific vehicle (by carId/linkageTargetId)."""
        time.sleep(DELAY)

        payload = {
            "getArticles": {
                "articleCountry": "AU",
                "provider": PROVIDER,
                "linkageTargetId": car_id,
                "linkageTargetType": vehicle_type,
                "linkageTargetCountry": "AU",
                "dataSupplierIds": BRAND_ID,
                "lang": LANG,
                "includeAll": True,
                "perPage": 1000,
                "articleStatusIds": 1
            }
        }

        resp = self.session.post(API_PROXY, json=payload, timeout=30)

        if resp.status_code == 503:
            # Rate limited — wait and retry
            logger.warning(f"  503 for carId {car_id}, waiting 5s and retrying...")
            time.sleep(5)
            resp = self.session.post(API_PROXY, json=payload, timeout=30)

        resp.raise_for_status()
        data = resp.json()
        return data if data else []

    def _parse_article(self, article, car_id):
        """Parse a single article into a flat dict of extracted fields."""
        part_number = article.get("articleNumber", "")
        mfr_name = article.get("mfrName", "")
        misc = article.get("misc", {})
        product_family = misc.get("additionalDescription", "")
        is_accessory = misc.get("isAccessory", False)

        # Generic article info (type, assembly group)
        generic = article.get("genericArticles", [{}])[0] if article.get("genericArticles") else {}
        part_type = generic.get("genericArticleDescription", "")
        assembly_group = generic.get("assemblyGroupName", "")

        # Linkage criteria (position, qty, year constraints)
        fitting_position = ""
        required_qty = ""
        model_year_from = ""
        model_year_to = ""
        for_model_code = ""
        notes_parts = []

        linkages = article.get("linkages", [])
        target_linkage = None
        for link in linkages:
            if link.get("linkageTargetId") == car_id:
                target_linkage = link
                break
        if not target_linkage and linkages:
            target_linkage = linkages[0]

        if target_linkage:
            for criteria in target_linkage.get("linkageCriteria", []):
                desc = criteria.get("criteriaDescription", "")
                value = criteria.get("formattedValue", "")

                if desc == "Fitting Position":
                    fitting_position = value
                elif desc == "Required quantity":
                    required_qty = value
                elif desc == "Model Year from":
                    model_year_from = value
                elif desc == "Model Year to":
                    model_year_to = value
                elif desc == "for model code":
                    for_model_code = value
                else:
                    notes_parts.append(f"{desc}: {value}")

        # OEM cross-reference numbers
        oem_numbers = ""
        if article.get("oemNumbers"):
            oem_list = [o.get("articleNumber", "") for o in article["oemNumbers"][:10]]
            oem_numbers = "; ".join(oem_list)

        return {
            "Part_Number": part_number,
            "Product_Family": product_family,
            "Part_Type": part_type,
            "Assembly_Group": assembly_group,
            "Is_Accessory": str(is_accessory),
            "Fitting_Position": fitting_position,
            "Required_Qty": required_qty,
            "Model_Year_From": model_year_from,
            "Model_Year_To": model_year_to,
            "For_Model_Code": for_model_code,
            "Notes": "; ".join(notes_parts),
            "OEM_Numbers": oem_numbers,
        }

    # ─── Main Extraction ─────────────────────────────────────────────
    def extract_all(self, vehicle_type="p", target_make=None):
        """Main extraction loop."""
        self._open_csv()

        type_code = "P" if vehicle_type == "p" else "C"
        type_label = "Passenger" if vehicle_type == "p" else "Commercial"

        try:
            vehicles = self.get_all_vehicles(vehicle_type)

            if target_make:
                vehicles = [v for v in vehicles if v["manuName"].upper() == target_make.upper()]
                logger.info(f"Filtered to {len(vehicles)} vehicles for {target_make}")

            # Sort by make, model for orderly processing
            vehicles.sort(key=lambda v: (v["manuName"], v.get("modelName", ""), v.get("carId", 0)))

            total = len(vehicles)
            logger.info(f"Processing {total} {type_label} vehicles...")

            for idx, vehicle in enumerate(vehicles):
                car_id = vehicle["carId"]

                if self._is_completed(car_id):
                    continue

                make = vehicle.get("manuName", "")
                model = vehicle.get("modelName", "")
                type_name = vehicle.get("typeName", "")
                construction = vehicle.get("constructionType", "")
                fuel = vehicle.get("fuelType", "")
                drive = vehicle.get("impulsionType", "")
                kw = vehicle.get("powerKwFrom", "")
                hp = vehicle.get("powerHpFrom", "")
                year_from = vehicle.get("yearOfConstrFrom", "")
                year_to = vehicle.get("yearOfConstrTo", "")
                manu_id = vehicle.get("manuId", "")
                mod_id = vehicle.get("modId", "")

                if idx % 100 == 0:
                    logger.info(f"[{idx+1}/{total}] {make} {model} {type_name}")

                try:
                    articles = self.get_articles(car_id, type_code)
                except Exception as e:
                    logger.error(f"  Error fetching articles for carId {car_id}: {e}")
                    continue

                if not articles:
                    self._mark_completed(car_id)
                    continue

                for article in articles:
                    parsed = self._parse_article(article, car_id)
                    row = {
                        "Vehicle_Type": type_label,
                        "Make": make,
                        "Model": model,
                        "Type_Name": type_name,
                        "Construction_Type": construction,
                        "Fuel_Type": fuel,
                        "Drive_Type": drive,
                        "Power_KW": kw,
                        "Power_HP": hp,
                        "Year_From": year_from,
                        "Year_To": year_to if year_to else "",
                        "Car_ID": car_id,
                        "Manu_ID": manu_id,
                        "Mod_ID": mod_id,
                        **parsed
                    }
                    self._write_row(row)

                self._mark_completed(car_id)

            logger.info(f"Completed {type_label} extraction!")

        except KeyboardInterrupt:
            logger.info("Interrupted by user. Progress saved.")
        finally:
            self._save_checkpoint()
            self._close_csv()
            logger.info(f"Total rows written: {self.rows_written}")


# ─── Main ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    extractor = MonroeExtractor()

    # Parse command line args
    vehicle_type = "p"  # default: passenger
    target_make = None

    args = sys.argv[1:]
    for arg in args:
        if arg.lower() in ("commercial", "heavy", "hd", "c"):
            vehicle_type = "c"
        elif arg.lower() in ("passenger", "p"):
            vehicle_type = "p"
        elif arg.lower() == "all":
            # Extract both passenger and commercial
            extractor.extract_all(vehicle_type="p", target_make=target_make)
            extractor = MonroeExtractor()  # Reset for second pass
            extractor.extract_all(vehicle_type="c", target_make=target_make)
            sys.exit(0)
        else:
            target_make = arg

    extractor.extract_all(vehicle_type=vehicle_type, target_make=target_make)
