#!/usr/bin/env python3
"""
NGK Spark Plugs Australia - Complete Application Data Extractor
Uses Selenium to drive the NGK Part Finder (AutoInfo Oscar widget)
because the widget uses obfuscated API encoding.

Requirements:
    pip install selenium webdriver-manager

Output: ngk_applications.csv
Columns: vehicle_type, make, model, sub_model, year, series, engine,
         part_category, part_number, part_description, notes
"""

import csv
import time
import json
import os
import re
import sys
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, NoSuchElementException,
    StaleElementReferenceException, ElementClickInterceptedException
)
from selenium.webdriver.common.action_chains import ActionChains

try:
    from webdriver_manager.chrome import ChromeDriverManager
    USE_WDM = True
except ImportError:
    USE_WDM = False

# Configuration
OUTPUT_FILE = "ngk_applications.csv"
CHECKPOINT_FILE = "ngk_checkpoint.json"
BASE_URL = "https://ngk.com.au/partfinder/"
DELAY = 0.5  # seconds between interactions
HEADLESS = False  # Set to False to watch the browser

# Vehicle type tabs in the Part Finder
VEHICLE_TABS = {
    "Automotive": "Automotive",
    "Motorbike": "Motorbike",
}

# Stats
stats = {
    "vehicles_processed": 0,
    "parts_found": 0,
    "errors": 0,
    "start_time": None,
}


def create_driver():
    """Create and configure Chrome WebDriver."""
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                         "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    if USE_WDM:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    else:
        driver = webdriver.Chrome(options=options)

    driver.implicitly_wait(5)
    return driver


def switch_to_oscar_iframe(driver):
    """Switch to the AutoInfo Oscar iframe."""
    driver.switch_to.default_content()
    # Debug: print all iframes found
    all_iframes = driver.find_elements(By.TAG_NAME, "iframe")
    print(f"  Debug: Found {len(all_iframes)} iframes on page")
    for i, f in enumerate(all_iframes):
        print(f"    iframe[{i}] src={f.get_attribute('src')} id={f.get_attribute('id')}")
    wait = WebDriverWait(driver, 30)
    # Wait specifically for the autoinfo iframe — do NOT fall back to others
    iframe = wait.until(EC.presence_of_element_located(
        (By.CSS_SELECTOR, 'iframe[src*="autoinfo"]')
    ))
    driver.switch_to.frame(iframe)
    time.sleep(3)
    # Debug: print iframe body text snippet
    try:
        body = driver.find_element(By.TAG_NAME, "body")
        print(f"  iframe body snippet: {body.text[:300]}")
        # Print all td elements with DisplayText class
        tds = driver.find_elements(By.CSS_SELECTOR, "td.DisplayText")
        print(f"  DisplayText tds found: {len(tds)}")
        # Print all table IDs
        tables = driver.find_elements(By.TAG_NAME, "table")
        print(f"  Tables found: {len(tables)}")
        for t in tables[:5]:
            print(f"    table id={t.get_attribute('id')} class={t.get_attribute('class')}")
    except Exception as e:
        print(f"  iframe debug error: {e}")


def get_listbox_items(driver, listbox_selector):
    """Get all items from an Oscar listbox/select element."""
    try:
        items = driver.find_elements(By.CSS_SELECTOR, f"{listbox_selector} tr td.DisplayText")
        result = []
        for item in items:
            text = item.text.strip()
            item_id = item.get_attribute("id") or ""
            if text and text != "- Popular Makes -" and text != "- All Makes -":
                result.append({"text": text, "id": item_id})
        return result
    except Exception as e:
        print(f"  Error getting listbox items: {e}")
        return []


def click_listbox_item(driver, item_element):
    """Click an item in an Oscar listbox."""
    try:
        driver.execute_script("arguments[0].click();", item_element)
        time.sleep(DELAY)
        return True
    except Exception as e:
        print(f"  Error clicking item: {e}")
        return False


def get_make_elements(driver):
    """Get all make items from the Make listbox."""
    try:
        # NGK uses DataTables with dynamic IDs — find by table class
        makes = driver.find_elements(By.CSS_SELECTOR, "table.tablePart td.DisplayText")
        if not makes:
            makes = driver.find_elements(By.CSS_SELECTOR, "#tblBrowseMake tr td.DisplayText")
        if not makes:
            makes = driver.find_elements(By.CSS_SELECTOR, ".browseMake tr td.DisplayText")
        if not makes:
            makes = driver.find_elements(By.CSS_SELECTOR, "td.DisplayText")
        result = []
        for m in makes:
            text = m.text.strip()
            mid = m.get_attribute("id") or ""
            if text and "Popular" not in text and "All Makes" not in text:
                result.append({"text": text, "id": mid, "element": m})
        return result
    except Exception as e:
        print(f"  Error getting makes: {e}")
        return []


def get_model_elements(driver):
    """Get all model items from the Model listbox."""
    try:
        models = driver.find_elements(By.CSS_SELECTOR, "table.tableSubModel td")
        if not models:
            models = driver.find_elements(By.CSS_SELECTOR, "#tblBrowseModel tr td.DisplayText")
        if not models:
            models = driver.find_elements(By.CSS_SELECTOR, ".browseModel tr td.DisplayText")
        result = []
        for m in models:
            cls = m.get_attribute("class") or ""
            if "dataTables_empty" in cls:
                continue
            text = m.text.strip()
            mid = m.get_attribute("id") or ""
            if text and "Popular" not in text and "Select" not in text:
                result.append({"text": text, "id": mid, "element": m})
        return result
    except Exception as e:
        print(f"  Error getting models: {e}")
        return []


def get_year_elements(driver):
    """Get all year items from the Year listbox."""
    try:
        years = driver.find_elements(By.CSS_SELECTOR, "#tblBrowseYear tr td.DisplayText")
        if not years:
            years = driver.find_elements(By.CSS_SELECTOR, ".browseYear tr td.DisplayText")
        result = []
        for y in years:
            text = y.text.strip()
            yid = y.get_attribute("id") or ""
            if text:
                result.append({"text": text, "id": yid, "element": y})
        return result
    except Exception as e:
        print(f"  Error getting years: {e}")
        return []


def get_engine_elements(driver):
    """Get all engine items from the Engine listbox."""
    try:
        engines = driver.find_elements(By.CSS_SELECTOR, "#tblBrowseEngine tr td.DisplayText")
        if not engines:
            engines = driver.find_elements(By.CSS_SELECTOR, ".browseEngine tr td.DisplayText")
        result = []
        for e_elem in engines:
            text = e_elem.text.strip()
            eid = e_elem.get_attribute("id") or ""
            if text:
                result.append({"text": text, "id": eid, "element": e_elem})
        return result
    except Exception as e:
        print(f"  Error getting engines: {e}")
        return []


def get_detail_elements(driver):
    """Get detail/variant items if present."""
    try:
        details = driver.find_elements(By.CSS_SELECTOR, "#tblBrowseDetail tr td.DisplayText")
        if not details:
            details = driver.find_elements(By.CSS_SELECTOR, ".browseDetail tr td.DisplayText")
        result = []
        for d in details:
            text = d.text.strip()
            did = d.get_attribute("id") or ""
            if text:
                result.append({"text": text, "id": did, "element": d})
        return result
    except Exception as e:
        return []


def get_parts_data(driver):
    """Extract parts data from the results section."""
    parts = []
    try:
        time.sleep(2)

        part_sections = driver.find_elements(By.CSS_SELECTOR, ".partSection, .partGroupSection, [class*='part']")

        if not part_sections:
            try:
                results_area = driver.find_element(By.CSS_SELECTOR, ".results, .partsResults, #partsArea, .vehicleParts")
                if results_area:
                    part_sections = [results_area]
            except NoSuchElementException:
                pass

        part_rows = driver.find_elements(By.CSS_SELECTOR, "table.partTable tr, .partRow, tr[class*='part']")

        for row in part_rows:
            try:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) >= 2:
                    part_info = {
                        "category": "",
                        "part_number": "",
                        "description": "",
                        "notes": ""
                    }
                    for i, cell in enumerate(cells):
                        text = cell.text.strip()
                        if i == 0:
                            part_info["part_number"] = text
                        elif i == 1:
                            part_info["description"] = text
                        elif i == 2:
                            part_info["notes"] = text
                    if part_info["part_number"]:
                        parts.append(part_info)
            except StaleElementReferenceException:
                continue

        if not parts:
            try:
                all_text = driver.find_element(By.TAG_NAME, "body").text
                ngk_parts = re.findall(r'\b([A-Z]{1,4}\d{3,6}[A-Z]*(?:-\d+)?)\b', all_text)
                for pn in set(ngk_parts):
                    parts.append({
                        "category": "",
                        "part_number": pn,
                        "description": "",
                        "notes": ""
                    })
            except Exception:
                pass

    except Exception as e:
        print(f"  Error extracting parts: {e}")

    return parts


def wait_for_load(driver, timeout=10):
    """Wait for AJAX loading to complete."""
    try:
        WebDriverWait(driver, timeout).until_not(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".loading, .spinner, .ajax-loader"))
        )
    except TimeoutException:
        pass
    time.sleep(DELAY)


def load_checkpoint():
    """Load checkpoint for resuming."""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r") as f:
            return json.load(f)
    return {"completed": [], "last_make": "", "last_model": ""}


def save_checkpoint(completed, make="", model=""):
    """Save checkpoint."""
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump({
            "completed": completed[-1000:],  # Keep last 1000
            "last_make": make,
            "last_model": model,
        }, f)


def extract_all():
    """Main extraction function."""
    stats["start_time"] = datetime.now()

    fieldnames = [
        "vehicle_type", "make", "model", "sub_model", "year",
        "series", "engine", "detail",
        "part_category", "part_number", "part_description", "notes"
    ]

    checkpoint = load_checkpoint()
    completed = set(checkpoint.get("completed", []))

    mode = "a" if completed else "w"
    file_exists = os.path.exists(OUTPUT_FILE) and len(completed) > 0

    driver = create_driver()

    try:
        with open(OUTPUT_FILE, mode, newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()

            for tab_name in VEHICLE_TABS:
                print(f"\n{'='*60}")
                print(f"Vehicle Type: {tab_name}")
                print(f"{'='*60}")

                driver.get(BASE_URL)
                time.sleep(8)

                switch_to_oscar_iframe(driver)

                try:
                    tab = driver.find_element(By.XPATH,
                        f"//li[contains(text(),'{tab_name}')] | //a[contains(text(),'{tab_name}')]"
                    )
                    tab.click()
                    time.sleep(2)
                except NoSuchElementException:
                    print(f"  Tab '{tab_name}' not found, trying default...")

                makes = get_make_elements(driver)
                print(f"  Found {len(makes)} makes")

                for make_idx, make_data in enumerate(makes):
                    make_name = make_data["text"]
                    print(f"\n  [{make_idx+1}/{len(makes)}] Make: {make_name}")

                    try:
                        # Use ActionChains for a real mouse click
                        try:
                            ActionChains(driver).move_to_element(make_data["element"]).click().perform()
                        except Exception:
                            driver.execute_script("arguments[0].click();", make_data["element"])
                        time.sleep(4)
                        wait_for_load(driver)
                        # Wait until tableSubModel has at least one non-empty td
                        try:
                            WebDriverWait(driver, 15).until(
                                lambda d: len([t for t in d.find_elements(By.CSS_SELECTOR, "table.tableSubModel td")
                                               if "dataTables_empty" not in (t.get_attribute("class") or "") and t.text.strip()]) > 0
                            )
                        except TimeoutException:
                            pass

                        # Debug after click
                        all_tds = driver.find_elements(By.CSS_SELECTOR, "td.DisplayText")
                        print(f"    Debug: {len(all_tds)} DisplayText tds after make click")
                        tables = driver.find_elements(By.TAG_NAME, "table")
                        print(f"    Debug: {len(tables)} tables after make click")
                        for t in tables[:8]:
                            print(f"      table id={t.get_attribute('id')} class={t.get_attribute('class')}")
                        if all_tds:
                            print(f"    First 5 td texts: {[t.text.strip() for t in all_tds[:5]]}")

                        # Debug tableSubModel specifically
                        sub_tables = driver.find_elements(By.CSS_SELECTOR, "table.tableSubModel")
                        print(f"    tableSubModel tables: {len(sub_tables)}")
                        for st in sub_tables[:2]:
                            all_tds_in_sub = st.find_elements(By.TAG_NAME, "td")
                            print(f"      tds in tableSubModel: {len(all_tds_in_sub)}")
                            print(f"      first 5: {[t.text.strip() for t in all_tds_in_sub[:5]]}")
                            print(f"      first td classes: {[t.get_attribute('class') for t in all_tds_in_sub[:5]]}")

                        models = get_model_elements(driver)
                        print(f"    Found {len(models)} models")

                        for model_idx, model_data in enumerate(models):
                            model_name = model_data["text"]

                            try:
                                model_data["element"].click()
                                time.sleep(1.5)
                                wait_for_load(driver)

                                years = get_year_elements(driver)

                                for year_data in years:
                                    year_text = year_data["text"]

                                    try:
                                        year_data["element"].click()
                                        time.sleep(1)
                                        wait_for_load(driver)

                                        engines = get_engine_elements(driver)

                                        if not engines:
                                            checkpoint_key = f"{tab_name}|{make_name}|{model_name}|{year_text}"
                                            if checkpoint_key in completed:
                                                continue

                                            parts = get_parts_data(driver)
                                            stats["vehicles_processed"] += 1

                                            for part in parts:
                                                stats["parts_found"] += 1
                                                writer.writerow({
                                                    "vehicle_type": tab_name,
                                                    "make": make_name,
                                                    "model": model_name,
                                                    "sub_model": "",
                                                    "year": year_text,
                                                    "series": "",
                                                    "engine": "",
                                                    "detail": "",
                                                    "part_category": part.get("category", ""),
                                                    "part_number": part.get("part_number", ""),
                                                    "part_description": part.get("description", ""),
                                                    "notes": part.get("notes", ""),
                                                })

                                            completed.add(checkpoint_key)
                                        else:
                                            for engine_data in engines:
                                                engine_text = engine_data["text"]

                                                try:
                                                    engine_data["element"].click()
                                                    time.sleep(1)
                                                    wait_for_load(driver)

                                                    details = get_detail_elements(driver)

                                                    if not details:
                                                        ck = f"{tab_name}|{make_name}|{model_name}|{year_text}|{engine_text}"
                                                        if ck in completed:
                                                            continue

                                                        parts = get_parts_data(driver)
                                                        stats["vehicles_processed"] += 1

                                                        for part in parts:
                                                            stats["parts_found"] += 1
                                                            writer.writerow({
                                                                "vehicle_type": tab_name,
                                                                "make": make_name,
                                                                "model": model_name,
                                                                "sub_model": "",
                                                                "year": year_text,
                                                                "series": "",
                                                                "engine": engine_text,
                                                                "detail": "",
                                                                "part_category": part.get("category", ""),
                                                                "part_number": part.get("part_number", ""),
                                                                "part_description": part.get("description", ""),
                                                                "notes": part.get("notes", ""),
                                                            })

                                                        completed.add(ck)
                                                    else:
                                                        for detail_data in details:
                                                            detail_text = detail_data["text"]
                                                            try:
                                                                detail_data["element"].click()
                                                                time.sleep(1)
                                                                wait_for_load(driver)

                                                                ck = f"{tab_name}|{make_name}|{model_name}|{year_text}|{engine_text}|{detail_text}"
                                                                if ck in completed:
                                                                    continue

                                                                parts = get_parts_data(driver)
                                                                stats["vehicles_processed"] += 1

                                                                for part in parts:
                                                                    stats["parts_found"] += 1
                                                                    writer.writerow({
                                                                        "vehicle_type": tab_name,
                                                                        "make": make_name,
                                                                        "model": model_name,
                                                                        "sub_model": "",
                                                                        "year": year_text,
                                                                        "series": "",
                                                                        "engine": engine_text,
                                                                        "detail": detail_text,
                                                                        "part_category": part.get("category", ""),
                                                                        "part_number": part.get("part_number", ""),
                                                                        "part_description": part.get("description", ""),
                                                                        "notes": part.get("notes", ""),
                                                                    })

                                                                completed.add(ck)
                                                            except Exception as e:
                                                                stats["errors"] += 1

                                                except Exception as e:
                                                    stats["errors"] += 1

                                    except Exception as e:
                                        stats["errors"] += 1

                                if stats["vehicles_processed"] % 25 == 0 and stats["vehicles_processed"] > 0:
                                    csvfile.flush()
                                    save_checkpoint(list(completed)[-1000:], make_name, model_name)
                                    elapsed = (datetime.now() - stats["start_time"]).total_seconds()
                                    rate = stats["vehicles_processed"] / max(elapsed, 1) * 3600
                                    print(f"\n  --- Progress: {stats['vehicles_processed']} vehicles, "
                                          f"{stats['parts_found']} parts, "
                                          f"{stats['errors']} errors, "
                                          f"~{rate:.0f} vehicles/hr ---\n")

                            except Exception as e:
                                stats["errors"] += 1
                                print(f"    Error on model {model_name}: {e}")

                    except Exception as e:
                        stats["errors"] += 1
                        print(f"  Error on make {make_name}: {e}")

                    # Re-establish iframe context periodically
                    if (make_idx + 1) % 10 == 0:
                        try:
                            driver.get(BASE_URL)
                            time.sleep(5)
                            switch_to_oscar_iframe(driver)
                            if tab_name != "Automotive":
                                tab = driver.find_element(By.XPATH,
                                    f"//li[contains(text(),'{tab_name}')] | //a[contains(text(),'{tab_name}')]"
                                )
                                tab.click()
                                time.sleep(2)
                        except Exception:
                            pass

    finally:
        driver.quit()

    elapsed = (datetime.now() - stats["start_time"]).total_seconds()
    print(f"\n{'='*60}")
    print(f"EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"Vehicles processed: {stats['vehicles_processed']}")
    print(f"Parts found: {stats['parts_found']}")
    print(f"Errors: {stats['errors']}")
    print(f"Time elapsed: {elapsed/3600:.1f} hours")
    print(f"Output: {OUTPUT_FILE}")

    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)


if __name__ == "__main__":
    print("NGK Spark Plugs Australia - Data Extractor")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Headless mode: {HEADLESS}")
    print()
    extract_all()
