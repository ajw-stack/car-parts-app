#!/usr/bin/env python3
"""
KYB Australia Part Finder Extractor
Extracts complete vehicle-to-shock-absorber application data from kyb.com.au
Uses AutoInfo Oscar widget (kyb9d77w) — same platform as NGK and Narva.
"""

import csv
import json
import os
import re
import time
import logging
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, StaleElementReferenceException,
    NoSuchElementException, ElementClickInterceptedException,
    WebDriverException
)

# ─── Configuration ───────────────────────────────────────────────────────
BASE_URL = "https://kyb.com.au/partfinder/"
OSCAR_WIDGET_ID = "kyb9d77w"
CHECKPOINT_FILE = "kyb_checkpoint.json"
OUTPUT_CSV = "kyb_parts.csv"
LOG_FILE = "kyb_extraction.log"

DELAY = 1.5              # Base delay between interactions
PAGE_LOAD_TIMEOUT = 30   # Max seconds to wait for page/widget
ELEMENT_TIMEOUT = 10     # Max seconds to wait for elements
MAX_RETRIES = 3          # Retries per action

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
    "Make", "Model", "Year", "Series", "Chassis", "Engine",
    "Position", "Part_Number", "Part_Description", "Qty",
    "Notes"
]


class KYBExtractor:
    def __init__(self):
        self.driver = None
        self.checkpoint = self._load_checkpoint()
        self.csv_file = None
        self.csv_writer = None
        self.rows_written = 0

    # ─── Browser Setup ───────────────────────────────────────────────
    def _init_browser(self):
        """Initialize Chrome with Selenium."""
        options = Options()
        options.add_argument("--window-size=1400,900")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        # Uncomment for headless mode (may not work with Oscar widget):
        # options.add_argument("--headless=new")

        self.driver = webdriver.Chrome(options=options)
        self.driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
        self.driver.implicitly_wait(2)
        logger.info("Browser initialized")

    def _quit_browser(self):
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass

    # ─── Checkpoint Management ───────────────────────────────────────
    def _load_checkpoint(self):
        if os.path.exists(CHECKPOINT_FILE):
            with open(CHECKPOINT_FILE, "r") as f:
                cp = json.load(f)
                logger.info(f"Loaded checkpoint: last_make={cp.get('last_make')}, "
                            f"last_model={cp.get('last_model')}")
                return cp
        return {"completed_vehicles": {}, "last_make": None, "last_model": None}

    def _save_checkpoint(self, make=None, model=None):
        if make:
            self.checkpoint["last_make"] = make
        if model:
            self.checkpoint["last_model"] = model
        with open(CHECKPOINT_FILE, "w") as f:
            json.dump(self.checkpoint, f, indent=2)

    def _is_completed(self, vehicle_key):
        return vehicle_key in self.checkpoint.get("completed_vehicles", {})

    def _mark_completed(self, vehicle_key):
        if "completed_vehicles" not in self.checkpoint:
            self.checkpoint["completed_vehicles"] = {}
        self.checkpoint["completed_vehicles"][vehicle_key] = True

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
        if self.rows_written % 20 == 0:
            self.csv_file.flush()

    def _close_csv(self):
        if self.csv_file:
            self.csv_file.flush()
            self.csv_file.close()

    # ─── Page Navigation ─────────────────────────────────────────────
    def _load_page(self):
        """Load the KYB part finder page and wait for Oscar widget."""
        logger.info("Loading KYB Part Finder page...")
        self.driver.get(BASE_URL)
        time.sleep(3)

        # Wait for the Oscar iframe to appear
        try:
            WebDriverWait(self.driver, PAGE_LOAD_TIMEOUT).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "iframe[id*='easyXDM']"))
            )
        except TimeoutException:
            logger.warning("Oscar iframe not found, retrying...")
            self.driver.refresh()
            time.sleep(5)
            WebDriverWait(self.driver, PAGE_LOAD_TIMEOUT).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "iframe[id*='easyXDM']"))
            )

        # Switch into the Oscar iframe
        iframe = self.driver.find_element(By.CSS_SELECTOR, "iframe[id*='easyXDM']")
        # Scroll iframe into view
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", iframe)
        time.sleep(1)
        self.driver.switch_to.frame(iframe)
        time.sleep(2)

        # Wait for the Make list to load
        WebDriverWait(self.driver, ELEMENT_TIMEOUT).until(
            EC.presence_of_element_located((By.ID, "tMake"))
        )
        logger.info("Oscar widget loaded successfully")

    def _reload_page(self):
        """Reload the page to reset state (handles freezes)."""
        logger.info("Reloading page...")
        try:
            self.driver.switch_to.default_content()
        except Exception:
            pass
        try:
            self.driver.get(BASE_URL)
        except TimeoutException:
            logger.warning("Page load timed out, force navigating...")
            self.driver.execute_script("window.stop();")
            time.sleep(2)
            self.driver.get(BASE_URL)

        time.sleep(5)

        # Switch back into iframe
        try:
            iframe = WebDriverWait(self.driver, PAGE_LOAD_TIMEOUT).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "iframe[id*='easyXDM']"))
            )
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", iframe)
            time.sleep(1)
            self.driver.switch_to.frame(iframe)
            time.sleep(2)
            WebDriverWait(self.driver, ELEMENT_TIMEOUT).until(
                EC.presence_of_element_located((By.ID, "tMake"))
            )
            logger.info("Page reloaded, Oscar widget ready")
            return True
        except Exception as e:
            logger.error(f"Failed to reload: {e}")
            return False

    # ─── Oscar Widget Interaction ────────────────────────────────────
    def _get_list_items(self, list_id):
        """Get all items from an Oscar list box."""
        try:
            list_el = self.driver.find_element(By.ID, list_id)
            items = list_el.find_elements(By.TAG_NAME, "div")
            result = []
            for item in items:
                text = item.text.strip()
                if text and not text.startswith("- Popular") and not text.startswith("- All"):
                    result.append(text)
            return result
        except Exception as e:
            logger.error(f"Error getting list items from {list_id}: {e}")
            return []

    def _click_list_item(self, list_id, item_text, exact=True):
        """Click an item in an Oscar list box."""
        try:
            list_el = self.driver.find_element(By.ID, list_id)
            items = list_el.find_elements(By.TAG_NAME, "div")
            for item in items:
                try:
                    text = item.text.strip()
                    if exact and text == item_text:
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", item)
                        time.sleep(0.3)
                        item.click()
                        time.sleep(DELAY)
                        return True
                    elif not exact and item_text.lower() in text.lower():
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", item)
                        time.sleep(0.3)
                        item.click()
                        time.sleep(DELAY)
                        return True
                except StaleElementReferenceException:
                    continue
            logger.warning(f"Item '{item_text}' not found in {list_id}")
            return False
        except Exception as e:
            logger.error(f"Error clicking item in {list_id}: {e}")
            return False

    def _get_all_makes(self):
        """Get all make names from the Oscar make list."""
        makes = []
        try:
            make_list = self.driver.find_element(By.ID, "tMake")
            divs = make_list.find_elements(By.TAG_NAME, "div")
            in_all_makes = False
            for div in divs:
                text = div.text.strip()
                if text == "- All Makes -":
                    in_all_makes = True
                    continue
                if in_all_makes and text:
                    makes.append(text)
                elif not in_all_makes and text and not text.startswith("- Popular"):
                    # Also collect popular makes in case they're not in All Makes
                    pass  # Skip popular, we'll get them from All Makes
            logger.info(f"Found {len(makes)} makes")
            return makes
        except Exception as e:
            logger.error(f"Error getting makes: {e}")
            return []

    def _select_make(self, make_name):
        """Select a make from the make list."""
        return self._click_list_item("tMake", make_name)

    def _get_all_models(self):
        """Get all model names from the Oscar model list."""
        models = []
        try:
            model_list = self.driver.find_element(By.ID, "tModel")
            divs = model_list.find_elements(By.TAG_NAME, "div")
            in_all_models = False
            for div in divs:
                text = div.text.strip()
                if text == "- All Models -":
                    in_all_models = True
                    continue
                if in_all_models and text:
                    models.append(text)
            # If no "All Models" section, get everything
            if not models:
                for div in divs:
                    text = div.text.strip()
                    if text and not text.startswith("- Popular") and not text.startswith("- All"):
                        models.append(text)
            return models
        except Exception as e:
            logger.error(f"Error getting models: {e}")
            return []

    def _select_model(self, model_name):
        """Select a model from the model list."""
        return self._click_list_item("tModel", model_name)

    def _select_year_all(self):
        """Select ALL in the year list."""
        return self._click_list_item("tYear", "ALL")

    def _select_series_show_all(self):
        """Click SHOW ALL in the series/chassis list."""
        try:
            # Look for SHOW ALL button or link
            series_list = self.driver.find_element(By.ID, "tSeries")
            items = series_list.find_elements(By.TAG_NAME, "div")
            for item in items:
                text = item.text.strip()
                if "SHOW ALL" in text.upper():
                    item.click()
                    time.sleep(DELAY)
                    return True
            # If no SHOW ALL, try clicking first actual item
            for item in items:
                text = item.text.strip()
                if text and text != "SHOW ALL":
                    item.click()
                    time.sleep(DELAY)
                    return True
            return False
        except Exception as e:
            logger.error(f"Error selecting series: {e}")
            return False

    def _get_engines(self):
        """Get all engine options from the engine list."""
        engines = []
        try:
            engine_list = self.driver.find_element(By.ID, "tEngine")
            divs = engine_list.find_elements(By.TAG_NAME, "div")
            for div in divs:
                text = div.text.strip()
                if text:
                    engines.append(text)
            return engines
        except Exception as e:
            logger.error(f"Error getting engines: {e}")
            return []

    def _select_engine(self, engine_text):
        """Select an engine from the engine list."""
        return self._click_list_item("tEngine", engine_text)

    def _get_selected_vehicle(self):
        """Get the currently selected vehicle description."""
        try:
            selected = self.driver.find_element(By.ID, "selectedVehicle")
            return selected.text.strip()
        except Exception:
            return ""

    def _get_results(self):
        """Extract product results from the results area."""
        results = []
        try:
            # Wait a moment for results to load
            time.sleep(2)

            # The results area typically uses a table or div-based layout
            # Look for the results container
            results_area = None
            for container_id in ["resultsArea", "results", "partResults", "tResults"]:
                try:
                    results_area = self.driver.find_element(By.ID, container_id)
                    if results_area.text.strip():
                        break
                except NoSuchElementException:
                    continue

            if not results_area:
                # Try finding by class or general table
                try:
                    results_area = self.driver.find_element(By.CSS_SELECTOR, ".results, .partResults, table.results")
                except NoSuchElementException:
                    pass

            if not results_area:
                # Try finding any table in the results section
                try:
                    tables = self.driver.find_elements(By.TAG_NAME, "table")
                    for table in tables:
                        if "part" in table.text.lower() or "shock" in table.text.lower() or "strut" in table.text.lower():
                            results_area = table
                            break
                except Exception:
                    pass

            if not results_area:
                # Fallback: get all text from the bottom half of the page
                body_text = self.driver.find_element(By.TAG_NAME, "body").text
                logger.debug(f"Page text for results parsing: {body_text[:500]}")
                return self._parse_results_from_text(body_text)

            # Try parsing as table
            rows = results_area.find_elements(By.TAG_NAME, "tr")
            if rows:
                return self._parse_table_results(rows)

            # Try parsing as div-based layout
            return self._parse_results_from_text(results_area.text)

        except Exception as e:
            logger.error(f"Error extracting results: {e}")
            return []

    def _parse_table_results(self, rows):
        """Parse results from HTML table rows."""
        results = []
        headers = []

        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            if not cells:
                # Try th for header row
                cells = row.find_elements(By.TAG_NAME, "th")
                if cells:
                    headers = [c.text.strip() for c in cells]
                    continue

            if cells:
                cell_texts = [c.text.strip() for c in cells]
                if len(cell_texts) >= 2:
                    result = {
                        "position": cell_texts[0] if len(cell_texts) > 0 else "",
                        "part_number": cell_texts[1] if len(cell_texts) > 1 else "",
                        "description": cell_texts[2] if len(cell_texts) > 2 else "",
                        "qty": cell_texts[3] if len(cell_texts) > 3 else "",
                        "notes": cell_texts[4] if len(cell_texts) > 4 else "",
                    }
                    # Only add if we have a part number
                    if result["part_number"]:
                        results.append(result)

        return results

    def _parse_results_from_text(self, text):
        """Parse results from raw text when table parsing fails."""
        results = []
        lines = text.split("\n")
        current_position = ""

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Skip header/label lines
            if line in ("Select vehicle to display parts", "KYB", "Shock Absorbers"):
                continue

            # Look for position headers (e.g., "Front", "Rear", "Front Left", "Rear Right")
            position_pattern = re.match(
                r'^(Front Left|Front Right|Rear Left|Rear Right|Front|Rear|'
                r'F/Left|F/Right|R/Left|R/Right|FL|FR|RL|RR)$',
                line, re.IGNORECASE
            )
            if position_pattern:
                current_position = line
                continue

            # Look for part numbers (KYB format: typically alphanumeric like 339232, KBxxxx, etc.)
            part_match = re.match(r'^(\d{5,6}|[A-Z]{2,3}\d{3,5})(\s+.*)?$', line)
            if part_match:
                results.append({
                    "position": current_position,
                    "part_number": part_match.group(1),
                    "description": (part_match.group(2) or "").strip(),
                    "qty": "",
                    "notes": "",
                })

        return results

    # ─── Extraction Logic ────────────────────────────────────────────
    def _extract_vehicle_parts(self, make, model, year_info, series_info, chassis_info, engine_info):
        """Extract parts for a specific vehicle configuration."""
        vehicle_key = f"{make}|{model}|{engine_info}"

        if self._is_completed(vehicle_key):
            return

        selected = self._get_selected_vehicle()
        results = self._get_results()

        if results:
            for part in results:
                row = {
                    "Make": make,
                    "Model": model,
                    "Year": year_info,
                    "Series": series_info,
                    "Chassis": chassis_info,
                    "Engine": engine_info,
                    "Position": part.get("position", ""),
                    "Part_Number": part.get("part_number", ""),
                    "Part_Description": part.get("description", ""),
                    "Qty": part.get("qty", ""),
                    "Notes": part.get("notes", ""),
                }
                self._write_row(row)
            logger.info(f"        Found {len(results)} parts")
        else:
            logger.info(f"        No parts found")

        self._mark_completed(vehicle_key)

    def _process_model(self, make_name, model_name):
        """Process all year/series/engine combinations for a model."""
        logger.info(f"    Processing model: {model_name}")

        if not self._select_model(model_name):
            logger.warning(f"    Could not select model: {model_name}")
            return

        time.sleep(DELAY)

        # Select ALL years
        if not self._select_year_all():
            logger.warning(f"    Could not select ALL years for {model_name}")
            # Try getting individual years
            years = self._get_list_items("tYear")
            if not years:
                return
            # Process first year as fallback
            self._click_list_item("tYear", years[0] if years[0] != "ALL" else years[1])
            time.sleep(DELAY)

        time.sleep(DELAY)

        # Try SHOW ALL for series/chassis
        self._select_series_show_all()
        time.sleep(DELAY)

        # Get engines
        engines = self._get_engines()
        if not engines:
            logger.info(f"    No engines found for {model_name}")
            # Maybe results are already shown (no engine selection needed)
            results = self._get_results()
            if results:
                for part in results:
                    row = {
                        "Make": make_name,
                        "Model": model_name,
                        "Year": "ALL",
                        "Series": "",
                        "Chassis": "",
                        "Engine": "",
                        "Position": part.get("position", ""),
                        "Part_Number": part.get("part_number", ""),
                        "Part_Description": part.get("description", ""),
                        "Qty": part.get("qty", ""),
                        "Notes": part.get("notes", ""),
                    }
                    self._write_row(row)
            return

        logger.info(f"    Found {len(engines)} engine options")

        for engine_text in engines:
            try:
                if not self._select_engine(engine_text):
                    continue

                time.sleep(DELAY)

                # Get the selected vehicle info for year/series/chassis
                selected = self._get_selected_vehicle()
                year_info = "ALL"
                series_info = ""
                chassis_info = ""

                # Parse selected vehicle for details
                if selected:
                    parts = selected.split(",")
                    if len(parts) >= 3:
                        series_info = parts[-2].strip() if len(parts) > 2 else ""
                        chassis_info = parts[-1].strip() if len(parts) > 1 else ""

                self._extract_vehicle_parts(
                    make_name, model_name, year_info,
                    series_info, chassis_info, engine_text
                )

            except Exception as e:
                logger.error(f"      Error processing engine {engine_text}: {e}")
                continue

    def _process_make(self, make_name):
        """Process all models for a make."""
        logger.info(f"Processing make: {make_name}")

        # Reload page to reset state
        if not self._reload_page():
            logger.error(f"Could not reload page for {make_name}")
            return

        time.sleep(DELAY)

        # Select the make
        if not self._select_make(make_name):
            logger.warning(f"Could not select make: {make_name}")
            return

        time.sleep(DELAY * 2)  # Wait longer for models to load

        # Get all models
        models = self._get_all_models()
        if not models:
            logger.warning(f"No models found for {make_name}")
            return

        logger.info(f"  Found {len(models)} models for {make_name}")

        # Resume support: find starting model
        start_model = None
        if make_name == self.checkpoint.get("last_make"):
            start_model = self.checkpoint.get("last_model")

        skip_models = start_model is not None

        for model_idx, model_name in enumerate(models):
            if skip_models:
                if model_name == start_model:
                    skip_models = False
                else:
                    continue

            logger.info(f"  [{model_idx+1}/{len(models)}] Model: {model_name}")

            try:
                # Need to re-select the make before each model (Oscar resets)
                if model_idx > 0:
                    if not self._reload_page():
                        logger.error("Could not reload page between models")
                        continue
                    time.sleep(DELAY)
                    if not self._select_make(make_name):
                        logger.error(f"Could not re-select make {make_name}")
                        continue
                    time.sleep(DELAY * 2)

                self._process_model(make_name, model_name)
                self._save_checkpoint(make_name, model_name)

            except WebDriverException as e:
                logger.error(f"  WebDriver error for {model_name}: {e}")
                # Try to recover
                try:
                    self._reload_page()
                except Exception:
                    logger.error("Recovery failed, restarting browser...")
                    self._quit_browser()
                    time.sleep(5)
                    self._init_browser()
                    self._load_page()

    # ─── Main Entry Point ────────────────────────────────────────────
    def extract_all(self, target_make=None):
        """Main extraction loop."""
        self._init_browser()
        self._open_csv()

        try:
            self._load_page()
            makes = self._get_all_makes()

            if not makes:
                logger.error("No makes found!")
                return

            logger.info(f"Found {len(makes)} makes to process")

            if target_make:
                # Single make mode
                if target_make.upper() in [m.upper() for m in makes]:
                    actual_name = next(m for m in makes if m.upper() == target_make.upper())
                    self._process_make(actual_name)
                else:
                    logger.error(f"Make '{target_make}' not found. Available: {makes}")
                return

            # Full extraction
            start_make = self.checkpoint.get("last_make")
            skip_makes = start_make is not None

            for make_idx, make_name in enumerate(makes):
                if skip_makes:
                    if make_name == start_make:
                        skip_makes = False
                    else:
                        logger.info(f"Skipping {make_name} (resuming)")
                        continue

                logger.info(f"\n{'='*60}")
                logger.info(f"[{make_idx+1}/{len(makes)}] MAKE: {make_name}")
                logger.info(f"{'='*60}")

                try:
                    self._process_make(make_name)
                except Exception as e:
                    logger.error(f"Error processing make {make_name}: {e}")
                    # Try to recover
                    try:
                        self._quit_browser()
                        time.sleep(5)
                        self._init_browser()
                    except Exception:
                        pass

            logger.info("Extraction complete!")

        except KeyboardInterrupt:
            logger.info("Interrupted by user. Progress saved.")
        finally:
            self._save_checkpoint()
            self._close_csv()
            self._quit_browser()
            logger.info(f"Total rows written: {self.rows_written}")


# ─── Main ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    extractor = KYBExtractor()

    if len(sys.argv) > 1:
        # Single make mode: python kyb_extractor.py TOYOTA
        target = " ".join(sys.argv[1:])
        extractor.extract_all(target_make=target)
    else:
        # Full extraction
        extractor.extract_all()
