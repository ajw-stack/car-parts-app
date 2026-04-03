#!/usr/bin/env python3
"""
Dayco Australia Application Data Extractor
Extracts vehicle-to-part mappings from dayco.com.au/applications.aspx
Processes one make at a time using Selenium.

Usage:
    python dayco_extractor.py                    # Interactive: pick a make
    python dayco_extractor.py --make "Toyota"    # Extract specific make
    python dayco_extractor.py --list-makes       # List all available makes
    python dayco_extractor.py --all              # Extract ALL makes sequentially

Requirements:
    pip install selenium webdriver-manager beautifulsoup4
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from datetime import datetime

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, NoSuchElementException,
    StaleElementReferenceException, ElementClickInterceptedException
)

try:
    from webdriver_manager.chrome import ChromeDriverManager
    USE_WDM = True
except ImportError:
    USE_WDM = False

# --- Configuration ---
BASE_URL = "https://dayco.com.au/applications.aspx"
OUTPUT_DIR = "dayco_data"
CHECKPOINT_DIR = "dayco_checkpoints"
PAGE_LOAD_TIMEOUT = 30
DELAY_BETWEEN_REQUESTS = 1.5  # seconds between postbacks
DELAY_BETWEEN_PAGES = 1.0     # seconds between pagination clicks
DELAY_BETWEEN_MODELS = 2.0    # seconds between model switches
REGION_AUSTRALIA = "28"
REGION_NZ = "29"

# Logo makes have dedicated image buttons; all others use the dropdown
LOGO_MAKES = {
    "Ford": "ctl00$cph$Make-Ford",
    "Holden": "ctl00$cph$Make-Holden",
    "Honda": "ctl00$cph$Make-Honda",
    "Hyundai": "ctl00$cph$Make-Hyundai",
    "Kia": "ctl00$cph$Make-Kia",
    "Mazda": "ctl00$cph$Make-Mazda",
    "Mitsubishi": "ctl00$cph$Make-Mitsubishi",
    "Nissan": "ctl00$cph$Make-Nissan",
    "Subaru": "ctl00$cph$Make-Subaru",
    "Suzuki": "ctl00$cph$Make-Suzuki",
    "Toyota": "ctl00$cph$Make-Toyota",
    "Volkswagen": "ctl00$cph$Make-Volkswagen",
}


def create_driver(headless=False, user_data_dir=None):
    """Create a Chrome WebDriver instance."""
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1400,900")
    if user_data_dir:
        options.add_argument(f"--user-data-dir={user_data_dir}")

    if USE_WDM:
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    else:
        return webdriver.Chrome(options=options)


def wait_for_postback(driver, old_viewstate, timeout=PAGE_LOAD_TIMEOUT):
    """Wait for ASP.NET postback to complete by checking ViewState change."""
    def viewstate_changed(d):
        try:
            vs = d.find_element(By.ID, "__VIEWSTATE")
            return vs.get_attribute("value") != old_viewstate
        except (NoSuchElementException, StaleElementReferenceException):
            return False

    try:
        WebDriverWait(driver, timeout).until(viewstate_changed)
        time.sleep(0.5)  # Extra settle time
        return True
    except TimeoutException:
        # Viewstate might not change if no data changed
        time.sleep(1)
        return False


def get_viewstate(driver):
    """Get current ViewState value."""
    try:
        return driver.find_element(By.ID, "__VIEWSTATE").get_attribute("value")
    except NoSuchElementException:
        return ""


def login_prompt(driver):
    """Check if user is logged in, prompt if not."""
    try:
        page_text = driver.page_source
        if "Log off" in page_text or "logged on as" in page_text:
            logged_as = ""
            match = re.search(r'logged on as\s+([^|]+)', page_text)
            if match:
                logged_as = match.group(1).strip()
            print(f"  ✓ Logged in as: {logged_as}")
            return True
    except Exception:
        pass

    print("\n" + "="*60)
    print("  LOGIN REQUIRED")
    print("  The browser window should be open at the Dayco site.")
    print("  Please log in manually, then press Enter here.")
    print("="*60)
    input("\n  Press Enter after logging in... ")
    driver.get(BASE_URL)
    time.sleep(3)
    return True


def get_all_makes(driver):
    """Get list of all makes from the OTHER MAKE dropdown."""
    makes = {}
    try:
        select_el = Select(driver.find_element(By.ID, "ctl00_cph_cboMakesOther"))
        for opt in select_el.options:
            val = opt.get_attribute("value")
            text = opt.text.strip()
            if val and val != "0" and text:
                makes[text] = val
    except Exception as e:
        print(f"  Error reading makes dropdown: {e}")

    # Also add logo makes (they use the same IDs but via image buttons)
    logo_make_ids = {
        "Ford": "21", "Holden": "26", "Honda": "27", "Hyundai": "28",
        "Kia": "35", "Mazda": "47", "Mitsubishi": "51", "Nissan": "53",
        "Subaru": "67", "Suzuki": "68", "Toyota": "71", "Volkswagen": "76"
    }
    for name, val in logo_make_ids.items():
        if name not in makes:
            makes[name] = val

    return dict(sorted(makes.items()))


def select_make(driver, make_name, make_value):
    """Select a make and wait for model dropdown to populate."""
    old_vs = get_viewstate(driver)

    if make_name in LOGO_MAKES:
        btn_name = LOGO_MAKES[make_name]
        btn_id = btn_name.replace("$", "_")
        try:
            btn = driver.find_element(By.ID, btn_id)
            btn.click()
        except NoSuchElementException:
            select_el = Select(driver.find_element(By.ID, "ctl00_cph_cboMakesOther"))
            select_el.select_by_value(make_value)
    else:
        select_el = Select(driver.find_element(By.ID, "ctl00_cph_cboMakesOther"))
        select_el.select_by_value(make_value)

    wait_for_postback(driver, old_vs)
    time.sleep(DELAY_BETWEEN_REQUESTS)


def get_models_for_make(driver):
    """Get list of models from the model dropdown after a make is selected."""
    models = {}
    try:
        select_el = Select(driver.find_element(By.ID, "ctl00_cph_cboModels"))
        for opt in select_el.options:
            val = opt.get_attribute("value")
            text = opt.text.strip()
            if val and text:
                models[text] = val
    except Exception as e:
        print(f"  Error reading models: {e}")
    return models


def select_model(driver, model_value):
    """Select a model from the dropdown and wait for postback."""
    old_vs = get_viewstate(driver)
    select_el = Select(driver.find_element(By.ID, "ctl00_cph_cboModels"))
    select_el.select_by_value(model_value)
    wait_for_postback(driver, old_vs)
    time.sleep(DELAY_BETWEEN_REQUESTS)


def ensure_all_checkboxes_checked(driver):
    """Make sure all product group checkboxes are checked."""
    checkboxes = driver.find_elements(By.CSS_SELECTOR, "input[name^='ctl00$cph$cblApps']")
    for cb in checkboxes:
        if not cb.is_selected():
            cb.click()
            time.sleep(0.2)


def click_go(driver):
    """Click the Go button and wait for results."""
    old_vs = get_viewstate(driver)
    try:
        go_btn = driver.find_element(By.ID, "ctl00_cph_cmdGo")
        go_btn.click()
    except NoSuchElementException:
        go_btn = driver.find_element(By.NAME, "ctl00$cph$cmdGo")
        go_btn.click()
    wait_for_postback(driver, old_vs, timeout=60)
    time.sleep(DELAY_BETWEEN_REQUESTS)


def parse_results_page(driver, make_name, model_name):
    """Parse the current results page and extract vehicle-part data."""
    rows = []
    try:
        soup = BeautifulSoup(driver.page_source, "html.parser")
        results_table = soup.find("table", id=re.compile(r"dgVehicles"))
        if not results_table:
            tables = soup.find_all("table")
            for t in tables:
                if t.find(string=re.compile(r"Part number")):
                    results_table = t
                    break

        if not results_table:
            return rows

        current_variant = ""
        all_trs = results_table.find_all("tr")

        for tr in all_trs:
            tds = tr.find_all("td")
            if not tds:
                continue

            if len(tds) == 1:
                text = tds[0].get_text(strip=True)
                if text == make_name or text == model_name:
                    continue
                if "Part number" in text:
                    continue
                if re.search(r'\d{4}', text) and ('cyl' in text.lower() or 'engcode' in text.lower() or 'l,' in text.lower()):
                    current_variant = text
                    continue
                if re.match(r'^\d{4}\s*[-–]', text):
                    current_variant = text
                    continue

            if len(tds) == 2:
                part_link = tds[0].find("a")
                if part_link:
                    part_number = part_link.get_text(strip=True)
                    application = tds[1].get_text(strip=True)
                    if part_number and application:
                        rows.append({
                            "make": make_name,
                            "model": model_name,
                            "vehicle_variant": current_variant,
                            "part_number": part_number,
                            "application": application
                        })
                else:
                    t0 = tds[0].get_text(strip=True)
                    t1 = tds[1].get_text(strip=True)
                    if t0 == "Part number" and t1 == "Application":
                        continue

    except Exception as e:
        print(f"    Error parsing results: {e}")

    return rows


def get_total_pages(driver):
    """Get the total number of pagination pages."""
    try:
        soup = BeautifulSoup(driver.page_source, "html.parser")
        results_table = soup.find("table", id=re.compile(r"dgVehicles"))
        if not results_table:
            return 1

        all_trs = results_table.find_all("tr")
        if not all_trs:
            return 1

        last_tr = all_trs[-1]
        page_links = last_tr.find_all("a")
        page_numbers = []
        for link in page_links:
            text = link.get_text(strip=True)
            if text.isdigit():
                page_numbers.append(int(text))

        spans = last_tr.find_all("span")
        for span in spans:
            text = span.get_text(strip=True)
            if text.isdigit():
                page_numbers.append(int(text))

        tds = last_tr.find_all("td")
        for td in tds:
            text = td.get_text(strip=True)
            if text.isdigit() and int(text) not in page_numbers:
                page_numbers.append(int(text))

        if page_numbers:
            return max(page_numbers)
        return 1
    except Exception:
        return 1


def navigate_to_page(driver, page_num):
    """Navigate to a specific results page using pagination."""
    old_vs = get_viewstate(driver)
    try:
        links = driver.find_elements(By.PARTIAL_LINK_TEXT, str(page_num))
        for link in links:
            href = link.get_attribute("href") or ""
            if "__doPostBack" in href and "dgVehicles" in href:
                text = link.text.strip()
                if text == str(page_num):
                    link.click()
                    wait_for_postback(driver, old_vs, timeout=60)
                    time.sleep(DELAY_BETWEEN_PAGES)
                    return True
    except Exception as e:
        print(f"    Error navigating to page {page_num}: {e}")
    return False


def extract_model_data(driver, make_name, model_name, model_value):
    """Extract all data for a specific model."""
    all_rows = []

    print(f"    Selecting model: {model_name}...")
    select_model(driver, model_value)

    ensure_all_checkboxes_checked(driver)

    print(f"    Clicking Go...")
    click_go(driver)

    page_source = driver.page_source
    if "No applications found" in page_source or "dgVehicles" not in page_source:
        print(f"    No results for {model_name}")
        return all_rows

    total_pages = get_total_pages(driver)
    print(f"    Found {total_pages} page(s) of results")

    rows = parse_results_page(driver, make_name, model_name)
    all_rows.extend(rows)
    print(f"    Page 1: {len(rows)} parts")

    for page in range(2, total_pages + 1):
        success = navigate_to_page(driver, page)
        if success:
            rows = parse_results_page(driver, make_name, model_name)
            all_rows.extend(rows)
            print(f"    Page {page}: {len(rows)} parts")
        else:
            print(f"    Failed to navigate to page {page}")
            break

    return all_rows


def load_checkpoint(make_name):
    """Load checkpoint for a make (which models have been completed)."""
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    cp_file = os.path.join(CHECKPOINT_DIR, f"{make_name.replace(' ', '_')}.json")
    if os.path.exists(cp_file):
        with open(cp_file, "r") as f:
            return json.load(f)
    return {"completed_models": [], "total_rows": 0}


def save_checkpoint(make_name, completed_models, total_rows):
    """Save checkpoint for a make."""
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    cp_file = os.path.join(CHECKPOINT_DIR, f"{make_name.replace(' ', '_')}.json")
    with open(cp_file, "w") as f:
        json.dump({
            "completed_models": completed_models,
            "total_rows": total_rows,
            "last_updated": datetime.now().isoformat()
        }, f, indent=2)


def save_csv(data, filename):
    """Save data to CSV file."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, filename)

    if not data:
        print(f"  No data to save for {filename}")
        return

    fieldnames = ["make", "model", "vehicle_variant", "part_number", "application"]
    mode = "a" if os.path.exists(filepath) else "w"
    write_header = not os.path.exists(filepath)

    with open(filepath, mode, newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        writer.writerows(data)

    print(f"  Saved {len(data)} rows to {filepath}")


def extract_make(driver, make_name, make_value, region="AU"):
    """Extract all data for a single make."""
    print(f"\n{'='*60}")
    print(f"  EXTRACTING: {make_name}")
    print(f"{'='*60}")

    csv_filename = f"dayco_{make_name.replace(' ', '_').replace('/', '_')}.csv"
    csv_path = os.path.join(OUTPUT_DIR, csv_filename)

    checkpoint = load_checkpoint(make_name)
    completed_models = checkpoint["completed_models"]
    if completed_models:
        print(f"  Resuming - {len(completed_models)} model(s) already completed")

    driver.get(BASE_URL)
    time.sleep(3)

    if region == "AU":
        radio = driver.find_element(By.CSS_SELECTOR, f"input[name='ctl00$cph$optRegions'][value='{REGION_AUSTRALIA}']")
    else:
        radio = driver.find_element(By.CSS_SELECTOR, f"input[name='ctl00$cph$optRegions'][value='{REGION_NZ}']")
    if not radio.is_selected():
        radio.click()
        time.sleep(1)

    print(f"  Selecting make: {make_name}...")
    select_make(driver, make_name, make_value)

    models = get_models_for_make(driver)
    print(f"  Found {len(models)} model(s): {', '.join(list(models.keys())[:10])}{'...' if len(models) > 10 else ''}")

    if not models:
        print(f"  No models found for {make_name}")
        return

    total_rows = checkpoint["total_rows"]

    for i, (model_name, model_value) in enumerate(models.items()):
        if model_name in completed_models:
            print(f"\n  [{i+1}/{len(models)}] {model_name} - SKIPPED (already done)")
            continue

        print(f"\n  [{i+1}/{len(models)}] {model_name}")
        try:
            if i > 0:
                driver.get(BASE_URL)
                time.sleep(3)
                select_make(driver, make_name, make_value)
                time.sleep(1)

            rows = extract_model_data(driver, make_name, model_name, model_value)

            if rows:
                save_csv(rows, csv_filename)
                total_rows += len(rows)

            completed_models.append(model_name)
            save_checkpoint(make_name, completed_models, total_rows)

            time.sleep(DELAY_BETWEEN_MODELS)

        except Exception as e:
            print(f"    ERROR processing {model_name}: {e}")
            import traceback
            traceback.print_exc()
            save_checkpoint(make_name, completed_models, total_rows)
            try:
                driver.get(BASE_URL)
                time.sleep(3)
            except Exception:
                pass

    print(f"\n{'='*60}")
    print(f"  COMPLETE: {make_name}")
    print(f"  Total rows: {total_rows}")
    print(f"  Output: {csv_path}")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Dayco Australia Application Data Extractor")
    parser.add_argument("--make", type=str, help="Extract data for a specific make (e.g., 'Toyota')")
    parser.add_argument("--list-makes", action="store_true", help="List all available makes")
    parser.add_argument("--all", action="store_true", help="Extract ALL makes sequentially")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode (no browser window)")
    parser.add_argument("--region", choices=["AU", "NZ"], default="AU", help="Region (default: AU)")
    parser.add_argument("--user-data-dir", type=str, help="Chrome user data directory (to reuse login)")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

    print("=" * 60)
    print("  DAYCO AUSTRALIA - Application Data Extractor")
    print("=" * 60)
    print(f"  Output directory: {OUTPUT_DIR}/")
    print(f"  Checkpoint directory: {CHECKPOINT_DIR}/")
    print(f"  Region: {'Australia' if args.region == 'AU' else 'New Zealand'}")
    print()

    driver = create_driver(headless=args.headless, user_data_dir=args.user_data_dir)
    driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT * 2)

    try:
        print("  Loading Dayco applications page...")
        driver.get(BASE_URL)
        time.sleep(3)

        login_prompt(driver)

        all_makes = get_all_makes(driver)
        print(f"  Found {len(all_makes)} makes total")

        if args.list_makes:
            print("\n  Available Makes:")
            print("  " + "-" * 40)
            for i, (name, val) in enumerate(all_makes.items()):
                logo = " [LOGO]" if name in LOGO_MAKES else ""
                print(f"  {i+1:4d}. {name}{logo}")
            return

        if args.make:
            target = args.make.strip()
            found = None
            for name, val in all_makes.items():
                if name.lower() == target.lower():
                    found = (name, val)
                    break
            if not found:
                matches = [(n, v) for n, v in all_makes.items() if target.lower() in n.lower()]
                if len(matches) == 1:
                    found = matches[0]
                elif len(matches) > 1:
                    print(f"\n  Multiple matches for '{target}':")
                    for n, v in matches:
                        print(f"    - {n}")
                    print("  Please be more specific.")
                    return
                else:
                    print(f"\n  Make '{target}' not found.")
                    print("  Use --list-makes to see available makes.")
                    return

            extract_make(driver, found[0], found[1], args.region)

        elif args.all:
            print(f"\n  Will extract ALL {len(all_makes)} makes sequentially.")
            print("  This will take a very long time. Press Ctrl+C to stop (progress is saved).\n")
            for i, (name, val) in enumerate(all_makes.items()):
                print(f"\n  >>> Make {i+1}/{len(all_makes)} <<<")
                try:
                    extract_make(driver, name, val, args.region)
                except KeyboardInterrupt:
                    print("\n\n  Interrupted by user. Progress has been saved.")
                    print("  Run again with --all to resume from where you left off.")
                    break
                except Exception as e:
                    print(f"  ERROR with {name}: {e}")
                    continue

        else:
            print("\n  Select a make to extract:")
            print("  " + "-" * 40)
            make_list = list(all_makes.items())
            for i, (name, val) in enumerate(make_list):
                logo = " *" if name in LOGO_MAKES else ""
                print(f"  {i+1:4d}. {name}{logo}")

            print()
            choice = input("  Enter number or name: ").strip()
            if choice.isdigit():
                idx = int(choice) - 1
                if 0 <= idx < len(make_list):
                    name, val = make_list[idx]
                    extract_make(driver, name, val, args.region)
                else:
                    print("  Invalid selection.")
            else:
                for name, val in make_list:
                    if name.lower() == choice.lower():
                        extract_make(driver, name, val, args.region)
                        break
                else:
                    print(f"  Make '{choice}' not found.")

    except KeyboardInterrupt:
        print("\n\n  Interrupted. Progress has been saved.")
    finally:
        print("\n  Closing browser...")
        driver.quit()
        print("  Done!")


if __name__ == "__main__":
    main()
