#!/usr/bin/env python3
"""
Sakura Filters 4WD Kit Catalogue Extractor
Extracts vehicle-to-filter application data from the CoolDrive/Publitas catalogue.
No login required — catalogue is publicly hosted on Publitas.
"""

import requests
import csv
import re
import json
import logging

# ─── Configuration ───────────────────────────────────────────────────────
CATALOGUE_BASE = "https://view.publitas.com/cooldrive-1/sakura-filters-4wd-filter-kit-catalogue-2022-2023"
SPREADS_URL = f"{CATALOGUE_BASE}/spreads.json?version=NGJhYWJmMzljNGUwOWFmMTM2YTA0ZDI4ZmQ1MDRjZTg2NjUwNTI3OQ%3D%3D&page=1"
PDF_URL = "https://view.publitas.com/62465/1567000/pdfs/b2dbf54f-95e3-4cf7-b760-ee60a7f89610.pdf"

OUTPUT_CSV = "sakura_4wd_filters.csv"
LOG_FILE = "sakura_extraction.log"

# ─── Logging ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# ─── CSV Columns ─────────────────────────────────────────────────────────
CSV_HEADERS = [
    "Manufacturer", "Model", "Series", "Engine", "Cylinders",
    "Capacity", "Fuel_Type", "Fuel_Air_Intake", "Year",
    "4WD_Filter_Kit", "Filter_Guard_Kit"
]

# Known manufacturers in the catalogue (for line parsing)
KNOWN_MANUFACTURERS = {
    "FORD", "HOLDEN", "HYUNDAI", "ISUZU", "LDV", "LEXUS", "MAZDA",
    "MERCEDES BENZ", "MITSUBISHI", "NISSAN", "SSANGYONG", "SUZUKI",
    "TOYOTA", "VOLKSWAGEN", "GREAT WALL"
}

# Known fuel types
FUEL_TYPES = {"P", "D"}

# Known intake types
INTAKE_TYPES = {
    "MPFI", "TURBO DIESEL", "DI", "CRD TWIN TURBO", "CRD TURBO",
    "DIESEL INJ", "TURBO INTERCOOLED", "GE EFI", "NA", "MPI",
    "CARTRIDGE OIL FILTER", "SPIN-ON OIL FILTER", "PANEL AIR FILTER",
    "CRD", "TURBO"
}


def fetch_page_texts():
    """Fetch all page texts from the Publitas spreads.json API."""
    logger.info("Fetching spreads.json from Publitas...")
    resp = requests.get(SPREADS_URL, timeout=30)
    resp.raise_for_status()
    spreads = resp.json()

    page_texts = []
    for spread in spreads:
        for page in spread.get("pages", []):
            text = page.get("text", "").strip()
            page_num = page.get("number", 0)
            if text and ("K-" in text or "MANUFACTURER" in text):
                page_texts.append({"page": page_num, "text": text})
                logger.info(f"  Page {page_num}: {len(text)} chars of data")

    logger.info(f"Found {len(page_texts)} pages with application data")
    return page_texts


def parse_page_text(text):
    """
    Parse a page's text content into structured rows.

    The Publitas text extraction outputs table data as newline-separated values
    where each cell is on its own line. The table columns are:
    MANUFACTURER | MODEL | SERIES | ENGINE | CYL | CAP | F | FUEL/AIR INTAKE | YEAR | 4WD FILTER KIT | FILTER GUARD KIT

    Strategy: We identify row boundaries by looking for filter kit numbers (K-xxxxx)
    and work backwards to reconstruct each row.
    """
    rows = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Remove header lines
    skip_headers = {
        "Sakura Filters Australia 4WD Kit Catalogue", "2022-2023",
        "MANUFACTURER", "MODEL", "SERIES", "ENGINE", "CYL", "CAP", "F",
        "FUEL/AIR INTAKE", "YEAR", "4WD FILTER KIT", "FILTER GUARD KIT",
        "4WD", "FILTER KITS"
    }

    # Filter out headers and empty lines
    data_lines = [l for l in lines if l not in skip_headers]

    # Approach: Build tokens list and identify rows by finding K-xxxxx patterns
    # Each row ends with a K-xxxxx kit number (and optionally an FG-xxxx or KBxxxx)
    i = 0
    current_manufacturer = ""

    while i < len(data_lines):
        line = data_lines[i]

        # Check if this line is a manufacturer name
        if line.upper() in KNOWN_MANUFACTURERS or line.upper().replace(" ", "") in {m.replace(" ", "") for m in KNOWN_MANUFACTURERS}:
            current_manufacturer = line.upper()
            i += 1
            continue

        # Check if line contains a kit number (K-xxxxx)
        kit_match = re.search(r'(K-\d{5})', line)
        if kit_match:
            # This is a kit number - could be standalone or part of a compound line
            # Collect the row data
            row = _try_parse_row(data_lines, i, current_manufacturer)
            if row:
                rows.append(row)
                current_manufacturer = row["Manufacturer"]  # Keep track
            i += 1
            continue

        # Check for FG/KB guard kit numbers on their own line
        fg_match = re.search(r'(FG-\d{4}|KB\d{4,5})', line)
        if fg_match and rows:
            # Attach to previous row if it doesn't have a guard kit
            if not rows[-1].get("Filter_Guard_Kit"):
                rows[-1]["Filter_Guard_Kit"] = fg_match.group(1)
            i += 1
            continue

        i += 1

    return rows


def _try_parse_row(lines, kit_line_idx, last_manufacturer):
    """
    Try to reconstruct a row by looking at the kit line and preceding lines.
    The data before the kit number should contain:
    Manufacturer, Model, Series, Engine, CYL, CAP, F, Fuel/Air Intake, Year
    """
    kit_line = lines[kit_line_idx]

    # Extract the kit number(s) from this line
    kits = re.findall(r'(K-\d{5})', kit_line)
    fg_kits = re.findall(r'(FG-\d{4}|KB\d{4,5})', kit_line)

    # Some lines may have additional filter notes (e.g., "CARTRIDGE OIL FILTER", "PANEL AIR FILTER")
    # These appear between the kit number and previous data
    extra_notes = []
    for note in ["CARTRIDGE OIL FILTER", "SPIN-ON OIL FILTER", "PANEL AIR FILTER"]:
        if note in kit_line:
            extra_notes.append(note)

    row = {
        "Manufacturer": last_manufacturer,
        "Model": "",
        "Series": "",
        "Engine": "",
        "Cylinders": "",
        "Capacity": "",
        "Fuel_Type": "",
        "Fuel_Air_Intake": "",
        "Year": "",
        "4WD_Filter_Kit": kits[0] if kits else "",
        "Filter_Guard_Kit": fg_kits[0] if fg_kits else "",
    }

    # Look backwards from the kit line to find the row's data fields
    # Collect non-header, non-kit preceding lines that form this row's data
    preceding = []
    j = kit_line_idx - 1
    while j >= 0 and len(preceding) < 15:
        prev = lines[j].strip()
        if not prev:
            j -= 1
            continue
        # Stop if we hit another kit number (previous row)
        if re.search(r'K-\d{5}', prev):
            break
        # Stop if we hit a header
        if prev in {"MANUFACTURER", "FUEL/AIR INTAKE", "4WD FILTER KIT", "FILTER GUARD KIT"}:
            break
        preceding.insert(0, prev)
        j -= 1

    # The preceding lines should roughly be:
    # [Manufacturer], Model, Series, Engine, CYL, CAP, F, Intake_Type, Year
    # But Manufacturer might be missing if it's the same as the previous row

    # Try to identify fields from the collected values
    _assign_fields(row, preceding, last_manufacturer)

    return row


def _assign_fields(row, values, last_manufacturer):
    """Assign collected values to the correct fields using heuristics."""
    remaining = list(values)

    # Check first value for manufacturer
    if remaining and remaining[0].upper() in KNOWN_MANUFACTURERS:
        row["Manufacturer"] = remaining.pop(0).upper()
    elif remaining:
        # Check combined first two values
        combined = (remaining[0] + " " + remaining[1]).upper() if len(remaining) > 1 else ""
        if combined in KNOWN_MANUFACTURERS:
            row["Manufacturer"] = combined
            remaining = remaining[2:]

    # Find year (date range pattern)
    for i, val in enumerate(remaining):
        if re.match(r'^\d{2}/?\d{0,4}[-/]\d{2,4}$|^\d{4}[-/]\d{4}$|^\d{4}[-/]ON$|^\d{4}$', val):
            row["Year"] = val
            remaining.pop(i)
            break

    # Find fuel/air intake type
    for i, val in enumerate(remaining):
        if val.upper() in INTAKE_TYPES or "TURBO" in val.upper() or "DIESEL" in val.upper() or "MPFI" in val.upper() or "MPI" in val.upper() or "CRD" in val.upper() or "EFI" in val.upper():
            row["Fuel_Air_Intake"] = val
            remaining.pop(i)
            break

    # Find fuel type (P or D, single char)
    for i, val in enumerate(remaining):
        if val in FUEL_TYPES:
            row["Fuel_Type"] = val
            remaining.pop(i)
            break

    # Find cylinders (single digit 3-8)
    for i, val in enumerate(remaining):
        if re.match(r'^[3-8]$', val):
            row["Cylinders"] = val
            remaining.pop(i)
            break

    # Find capacity (decimal number like 2.5, 3.0, 3.2)
    for i, val in enumerate(remaining):
        if re.match(r'^\d+\.\d+$', val):
            row["Capacity"] = val
            remaining.pop(i)
            break

    # Remaining values should be Model, Series, Engine (in order)
    if len(remaining) >= 3:
        row["Model"] = remaining[0]
        row["Series"] = remaining[1]
        row["Engine"] = remaining[2]
    elif len(remaining) == 2:
        row["Model"] = remaining[0]
        row["Series"] = remaining[1]
    elif len(remaining) == 1:
        row["Model"] = remaining[0]


def download_pdf(output_path="sakura_4wd_catalogue.pdf"):
    """Download the catalogue PDF for reference or advanced table extraction."""
    logger.info(f"Downloading PDF from {PDF_URL}...")
    resp = requests.get(PDF_URL, stream=True, timeout=60)
    resp.raise_for_status()
    with open(output_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    logger.info(f"PDF saved to {output_path}")
    return output_path


def extract_with_tabula(pdf_path, output_csv=None):
    """
    Advanced extraction using tabula-py for better table parsing.
    Requires: pip install tabula-py (and Java runtime)
    """
    try:
        import tabula
        logger.info("Extracting tables with tabula-py...")

        # Pages 10-17 contain the application tables
        tables = tabula.read_pdf(
            pdf_path,
            pages="10-17",
            multiple_tables=True,
            lattice=True,  # Use line detection for table borders
            pandas_options={"header": None}
        )

        all_rows = []
        expected_cols = [
            "Manufacturer", "Model", "Series", "Engine", "Cylinders",
            "Capacity", "Fuel_Type", "Fuel_Air_Intake", "Year",
            "4WD_Filter_Kit", "Filter_Guard_Kit"
        ]

        for table in tables:
            # Skip header rows
            for _, row in table.iterrows():
                values = [str(v).strip() if str(v) != "nan" else "" for v in row.values]
                # Skip header rows
                if "MANUFACTURER" in values or not any(v for v in values):
                    continue
                if len(values) >= 9:
                    row_dict = {}
                    for i, col in enumerate(expected_cols):
                        row_dict[col] = values[i] if i < len(values) else ""
                    all_rows.append(row_dict)

        logger.info(f"Extracted {len(all_rows)} rows via tabula")

        if output_csv:
            with open(output_csv, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=expected_cols)
                writer.writeheader()
                writer.writerows(all_rows)
            logger.info(f"Saved to {output_csv}")

        return all_rows

    except ImportError:
        logger.warning("tabula-py not installed. Install with: pip install tabula-py")
        logger.warning("Also requires Java runtime. Falling back to text-based extraction.")
        return None


def extract_from_publitas_text():
    """Extract data from Publitas text layer (no Java/tabula needed)."""
    page_texts = fetch_page_texts()

    all_rows = []
    for page_data in page_texts:
        rows = parse_page_text(page_data["text"])
        all_rows.extend(rows)
        logger.info(f"  Page {page_data['page']}: parsed {len(rows)} rows")

    logger.info(f"Total rows extracted: {len(all_rows)}")

    # Write CSV
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerows(all_rows)

    logger.info(f"Saved to {OUTPUT_CSV}")
    return all_rows


# ─── Main ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    method = sys.argv[1] if len(sys.argv) > 1 else "text"

    if method == "pdf":
        # Method 1: Download PDF and extract with tabula (best accuracy)
        pdf_path = download_pdf()
        rows = extract_with_tabula(pdf_path, OUTPUT_CSV)
        if rows is None:
            logger.info("Falling back to text extraction...")
            extract_from_publitas_text()
    elif method == "download":
        # Just download the PDF
        download_pdf()
    else:
        # Method 2: Extract from Publitas text layer (no Java needed)
        extract_from_publitas_text()
