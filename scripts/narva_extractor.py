#!/usr/bin/env python3
"""
Narva Globe Application Guide - Data Extractor
Extracts vehicle-to-globe mappings from narva.com.au Globe Application Guide.
Uses Selenium to navigate the AutoInfo Oscar widget (same engine as NGK).

Usage:
    python narva_extractor.py                     # Interactive: pick a make
    python narva_extractor.py --make "TOYOTA"     # Extract specific make
    python narva_extractor.py --list-makes        # List all available makes
    python narva_extractor.py --all               # Extract ALL makes sequentially

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
from selenium.webdriver.support.ui import WebDriverWait
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
BASE_URL = "https://www.narva.com.au/resources/globe-application-guide"
OUTPUT_DIR = "narva_data"
CHECKPOINT_DIR = "narva_checkpoints"
PAGE_LOAD_TIMEOUT = 30
WIDGET_LOAD_TIMEOUT = 15
DELAY_BETWEEN_CLICKS = 1.5
DELAY_BETWEEN_MODELS = 1.0

# Oscar iframe identifier
OSCAR_IFRAME_ID_PREFIX = "easyXDM_default"


def create_driver(headless=False):
    """Create a Chrome WebDriver instance."""
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1400,900")

    if USE_WDM:
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    else:
        return webdriver.Chrome(options=options)


def find_oscar_iframe(driver):
    """Find and switch to the Oscar widget iframe."""
    iframes = driver.find_elements(By.TAG_NAME, "iframe")
    for iframe in iframes:
        iframe_id = iframe.get_attribute("id") or ""
        iframe_src = iframe.get_attribute("src") or ""
        if "autoinfo" in iframe_src or OSCAR_IFRAME_ID_PREFIX in iframe_id:
            return iframe
    return None


def switch_to_oscar(driver):
    """Switch to the Oscar iframe context."""
    driver.switch_to.default_content()
    iframe = find_oscar_iframe(driver)
    if iframe:
        driver.switch_to.frame(iframe)
        return True
    return False


def wait_for_content_change(driver, old_text, timeout=WIDGET_LOAD_TIMEOUT):
    """Wait for the iframe content to change after a click."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            body = driver.find_element(By.TAG_NAME, "body")
            current_text = body.text
            if current_text != old_text and len(current_text.strip()) > 10:
                time.sleep(0.5)
                return True
        except (StaleElementReferenceException, NoSuchElementException):
            pass
        time.sleep(0.3)
    return False


def get_body_text(driver):
    """Get the current body text of the iframe."""
    try:
        body = driver.find_element(By.TAG_NAME, "body")
        return body.text
    except Exception:
        return ""


def get_clickable_items(driver):
    """Get all clickable list items in the current Oscar view."""
    items = []
    try:
        links = driver.find_elements(By.CSS_SELECTOR, "a, div.item, tr, li")
        for link in links:
            text = link.text.strip()
            if text and len(text) > 0 and text not in ['', '\n']:
                items.append({"text": text, "element": link})
    except Exception:
        pass
    return items


def get_list_items_text(driver):
    """Get text of all list items in the current view."""
    items = []
    try:
        body_text = get_body_text(driver)
        soup = BeautifulSoup(driver.page_source, "html.parser")

        rows = soup.select("tr, div.row, a.item, li, div.option")
        for row in rows:
            text = row.get_text(strip=True)
            if text and len(text) > 1:
                items.append(text)

        if not items:
            lines = body_text.strip().split('\n')
            items = [l.strip() for l in lines if l.strip() and len(l.strip()) > 1]
    except Exception:
        pass
    return items


def click_item_by_text(driver, target_text):
    """Click on an item by matching its text content."""
    try:
        selectors = [
            "a", "tr td", "div.item", "li", "div.option",
            "span", "td", "tr"
        ]
        for sel in selectors:
            elements = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in elements:
                try:
                    el_text = el.text.strip()
                    if el_text == target_text or target_text in el_text:
                        old_text = get_body_text(driver)
                        el.click()
                        time.sleep(DELAY_BETWEEN_CLICKS)
                        wait_for_content_change(driver, old_text)
                        return True
                except (StaleElementReferenceException, ElementClickInterceptedException):
                    continue

        xpath = f"//*[contains(text(), '{target_text}')]"
        elements = driver.find_elements(By.XPATH, xpath)
        for el in elements:
            try:
                old_text = get_body_text(driver)
                el.click()
                time.sleep(DELAY_BETWEEN_CLICKS)
                wait_for_content_change(driver, old_text)
                return True
            except Exception:
                continue

    except Exception as e:
        print(f"      Error clicking '{target_text}': {e}")
    return False


def click_go_back(driver):
    """Click the 'Go Back' button."""
    try:
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            if "Go Back" in btn.text or "Back" in btn.text:
                old_text = get_body_text(driver)
                btn.click()
                time.sleep(DELAY_BETWEEN_CLICKS)
                wait_for_content_change(driver, old_text)
                return True

        inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='button'], input[type='submit']")
        for inp in inputs:
            val = inp.get_attribute("value") or ""
            if "Back" in val or "Go Back" in val:
                old_text = get_body_text(driver)
                inp.click()
                time.sleep(DELAY_BETWEEN_CLICKS)
                wait_for_content_change(driver, old_text)
                return True

        links = driver.find_elements(By.TAG_NAME, "a")
        for link in links:
            if "Go Back" in link.text or "Back" in link.text:
                old_text = get_body_text(driver)
                link.click()
                time.sleep(DELAY_BETWEEN_CLICKS)
                wait_for_content_change(driver, old_text)
                return True
    except Exception:
        pass
    return False


def click_start_over(driver):
    """Click the 'Start Over' button to reset."""
    try:
        elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'Start Over')]")
        for el in elements:
            try:
                old_text = get_body_text(driver)
                el.click()
                time.sleep(DELAY_BETWEEN_CLICKS)
                wait_for_content_change(driver, old_text)
                return True
            except Exception:
                continue
    except Exception:
        pass
    return False


def parse_globe_results(driver):
    """Parse the globe results page and extract globe positions and part numbers."""
    results = []
    try:
        soup = BeautifulSoup(driver.page_source, "html.parser")

        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    texts = [c.get_text(strip=True) for c in cells]
                    if any(t for t in texts if t):
                        results.append(texts)

        if not results:
            body_text = driver.find_element(By.TAG_NAME, "body").text
            lines = body_text.strip().split('\n')
            for line in lines:
                line = line.strip()
                if line and '\t' in line:
                    parts = line.split('\t')
                    results.append(parts)
                elif line and '  ' in line:
                    parts = [p.strip() for p in re.split(r'\s{2,}', line) if p.strip()]
                    if len(parts) >= 2:
                        results.append(parts)
    except Exception as e:
        print(f"      Error parsing results: {e}")

    return results


def detect_current_step(driver):
    """Detect which step the Oscar widget is currently showing."""
    text = get_body_text(driver).lower()
    if "choose make" in text or "please choose make" in text:
        return "make"
    elif "choose model" in text or "please choose model" in text:
        return "model"
    elif "choose year" in text or "please choose year" in text:
        return "year"
    elif "choose series" in text or "series chassis" in text:
        return "series"
    elif "choose engine" in text or "please choose engine" in text:
        return "engine"
    elif any(kw in text for kw in ["headlight", "park", "indicator", "fog", "interior",
                                     "globe", "low beam", "high beam", "tail", "brake",
                                     "reverse", "number plate"]):
        return "results"
    return "unknown"


def extract_make_data(driver, make_name):
    """Extract all globe data for a specific make."""
    all_rows = []

    if not switch_to_oscar(driver):
        print("    Could not switch to Oscar iframe")
        return all_rows

    if not click_item_by_text(driver, make_name):
        print(f"    Could not click make: {make_name}")
        return all_rows

    step = detect_current_step(driver)
    if step != "model":
        print(f"    Expected 'model' step but got '{step}'")
        return all_rows

    body_text = get_body_text(driver)
    lines = body_text.strip().split('\n')
    models = []
    in_all = False
    for line in lines:
        line = line.strip()
        if line == '- All Models -':
            in_all = True
            continue
        if in_all and line and line not in ['Go Back', 'Start Over', 'Part # Search',
                                              'Vin', 'Rego', 'Options', 'Desktop site',
                                              'Please choose model', '- Popular Models -']:
            models.append(line)
        elif not in_all and line not in ['Go Back', 'Start Over', 'Part # Search',
                                          'Vin', 'Rego', 'Options', 'Desktop site',
                                          'Please choose model', '- Popular Models -',
                                          '- All Models -'] and line:
            pass

    if not models:
        models = [l.strip() for l in lines
                  if l.strip() and l.strip() not in ['Go Back', 'Start Over', 'Part # Search',
                                                       'Vin', 'Rego', 'Options', 'Desktop site',
                                                       'Please choose model', '- Popular Models -',
                                                       '- All Models -']]

    print(f"    Found {len(models)} model(s)")

    for i, model in enumerate(models):
        print(f"\n    [{i+1}/{len(models)}] {model}")
        try:
            if not switch_to_oscar(driver):
                continue

            current_step = detect_current_step(driver)
            if current_step != "model":
                click_start_over(driver)
                time.sleep(1)
                if not switch_to_oscar(driver):
                    continue
                click_item_by_text(driver, make_name)
                time.sleep(1)

            if not click_item_by_text(driver, model):
                print(f"      Could not click model: {model}")
                continue

            step = detect_current_step(driver)

            if step == "year":
                click_item_by_text(driver, "ALL")
                step = detect_current_step(driver)

            if step == "series":
                click_item_by_text(driver, "SHOW ALL")
                step = detect_current_step(driver)

            if step == "engine":
                engine_text = get_body_text(driver)
                engine_lines = engine_text.strip().split('\n')
                engines = [l.strip() for l in engine_lines
                           if l.strip() and l.strip() not in ['Go Back', 'Start Over',
                                                                'Part # Search', 'Vin', 'Rego',
                                                                'Options', 'Desktop site',
                                                                'Please choose engine']]

                print(f"      {len(engines)} engine(s)")

                for j, engine in enumerate(engines):
                    print(f"      [{j+1}/{len(engines)}] {engine}")

                    if not switch_to_oscar(driver):
                        continue

                    if not click_item_by_text(driver, engine):
                        print(f"        Could not click engine: {engine}")
                        continue

                    step = detect_current_step(driver)
                    if step == "results" or step == "unknown":
                        results = parse_globe_results(driver)
                        for result_row in results:
                            row = {
                                "make": make_name,
                                "model": model,
                                "engine": engine,
                                "position": result_row[0] if len(result_row) > 0 else "",
                                "globe_type": result_row[1] if len(result_row) > 1 else "",
                                "narva_part": result_row[2] if len(result_row) > 2 else "",
                                "notes": result_row[3] if len(result_row) > 3 else "",
                            }
                            all_rows.append(row)
                        print(f"        {len(results)} globe position(s)")

                    click_go_back(driver)
                    time.sleep(0.5)

            elif step == "results" or step == "unknown":
                results = parse_globe_results(driver)
                for result_row in results:
                    row = {
                        "make": make_name,
                        "model": model,
                        "engine": "",
                        "position": result_row[0] if len(result_row) > 0 else "",
                        "globe_type": result_row[1] if len(result_row) > 1 else "",
                        "narva_part": result_row[2] if len(result_row) > 2 else "",
                        "notes": result_row[3] if len(result_row) > 3 else "",
                    }
                    all_rows.append(row)
                print(f"      {len(results)} globe position(s)")

            click_start_over(driver)
            time.sleep(1)
            if not switch_to_oscar(driver):
                continue
            click_item_by_text(driver, make_name)
            time.sleep(DELAY_BETWEEN_MODELS)

        except Exception as e:
            print(f"      ERROR: {e}")
            import traceback
            traceback.print_exc()
            try:
                driver.switch_to.default_content()
                driver.get(BASE_URL)
                time.sleep(5)
                switch_to_oscar(driver)
                click_item_by_text(driver, make_name)
                time.sleep(2)
            except Exception:
                pass

    return all_rows


def load_checkpoint(make_name):
    """Load checkpoint for a make."""
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    safe_name = make_name.replace(' ', '_').replace('/', '_')
    cp_file = os.path.join(CHECKPOINT_DIR, f"narva_{safe_name}.json")
    if os.path.exists(cp_file):
        with open(cp_file, "r") as f:
            return json.load(f)
    return {"completed_models": [], "total_rows": 0}


def save_checkpoint(make_name, completed_models, total_rows):
    """Save checkpoint for a make."""
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    safe_name = make_name.replace(' ', '_').replace('/', '_')
    cp_file = os.path.join(CHECKPOINT_DIR, f"narva_{safe_name}.json")
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
        return

    fieldnames = ["make", "model", "engine", "position", "globe_type", "narva_part", "notes"]
    file_exists = os.path.exists(filepath)

    with open(filepath, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        if not file_exists:
            writer.writeheader()
        writer.writerows(data)

    print(f"    Saved {len(data)} rows to {filepath}")


def get_all_makes(driver):
    """Get all makes from the Oscar widget."""
    if not switch_to_oscar(driver):
        return []

    body_text = get_body_text(driver)
    lines = body_text.strip().split('\n')

    makes = []
    in_all = False
    skip_words = ['Go Back', 'Start Over', 'Part # Search', 'Vin', 'Rego',
                  'Options', 'Desktop site', 'Please choose make',
                  '- Popular Makes -', '- All Makes -']

    for line in lines:
        line = line.strip()
        if line == '- All Makes -':
            in_all = True
            continue
        if in_all and line and line not in skip_words:
            makes.append(line)

    return makes


def main():
    parser = argparse.ArgumentParser(description="Narva Globe Application Guide Data Extractor")
    parser.add_argument("--make", type=str, help="Extract data for a specific make (e.g., 'TOYOTA')")
    parser.add_argument("--list-makes", action="store_true", help="List all available makes")
    parser.add_argument("--all", action="store_true", help="Extract ALL makes sequentially")
    parser.add_argument("--headless", action="store_true", help="Run headless (no browser window)")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

    print("=" * 60)
    print("  NARVA Globe Application Guide - Data Extractor")
    print("=" * 60)
    print(f"  Output directory: {OUTPUT_DIR}/")
    print(f"  Checkpoint directory: {CHECKPOINT_DIR}/")
    print()

    driver = create_driver(headless=args.headless)
    driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT * 2)

    try:
        print("  Loading Narva Globe Application Guide...")
        driver.get(BASE_URL)
        time.sleep(5)

        print("  Waiting for Oscar widget to load...")
        for _ in range(10):
            if find_oscar_iframe(driver):
                break
            time.sleep(1)

        if not find_oscar_iframe(driver):
            print("  ERROR: Could not find Oscar widget iframe")
            return

        if not switch_to_oscar(driver):
            print("  ERROR: Could not switch to Oscar iframe")
            return

        time.sleep(3)
        makes = get_all_makes(driver)
        print(f"  Found {len(makes)} makes")

        if args.list_makes:
            print(f"\n  Available Makes ({len(makes)}):")
            print("  " + "-" * 40)
            for i, make in enumerate(makes):
                print(f"  {i+1:4d}. {make}")
            return

        if args.make:
            target = args.make.strip().upper()
            found = None
            for make in makes:
                if make.upper() == target:
                    found = make
                    break
            if not found:
                matches = [m for m in makes if target in m.upper()]
                if len(matches) == 1:
                    found = matches[0]
                elif len(matches) > 1:
                    print(f"\n  Multiple matches for '{args.make}':")
                    for m in matches:
                        print(f"    - {m}")
                    return
                else:
                    print(f"\n  Make '{args.make}' not found. Use --list-makes.")
                    return

            csv_filename = f"narva_{found.replace(' ', '_').replace('/', '_')}.csv"
            print(f"\n  Extracting: {found}")
            driver.switch_to.default_content()
            switch_to_oscar(driver)
            data = extract_make_data(driver, found)
            if data:
                save_csv(data, csv_filename)
            print(f"\n  Complete: {found} - {len(data)} rows")

        elif args.all:
            print(f"\n  Will extract ALL {len(makes)} makes. Press Ctrl+C to stop.\n")
            for i, make in enumerate(makes):
                print(f"\n  >>> Make {i+1}/{len(makes)}: {make} <<<")
                csv_filename = f"narva_{make.replace(' ', '_').replace('/', '_')}.csv"
                try:
                    driver.switch_to.default_content()
                    driver.get(BASE_URL)
                    time.sleep(5)
                    switch_to_oscar(driver)
                    time.sleep(2)

                    data = extract_make_data(driver, make)
                    if data:
                        save_csv(data, csv_filename)
                    print(f"  Complete: {make} - {len(data)} rows")
                except KeyboardInterrupt:
                    print("\n\n  Interrupted. Progress saved.")
                    break
                except Exception as e:
                    print(f"  ERROR with {make}: {e}")

        else:
            print(f"\n  Select a make ({len(makes)} available):")
            for i, make in enumerate(makes):
                print(f"  {i+1:4d}. {make}")
            print()
            choice = input("  Enter number or name: ").strip()
            if choice.isdigit():
                idx = int(choice) - 1
                if 0 <= idx < len(makes):
                    make = makes[idx]
                    csv_filename = f"narva_{make.replace(' ', '_').replace('/', '_')}.csv"
                    driver.switch_to.default_content()
                    switch_to_oscar(driver)
                    data = extract_make_data(driver, make)
                    if data:
                        save_csv(data, csv_filename)
                    print(f"\n  Complete: {make} - {len(data)} rows")

    except KeyboardInterrupt:
        print("\n\n  Interrupted.")
    finally:
        print("\n  Closing browser...")
        driver.quit()
        print("  Done!")


if __name__ == "__main__":
    main()
