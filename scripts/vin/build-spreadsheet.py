"""Build the VIN decoder test spreadsheet from exported breakdowns.

Usage:
  node --import ./scripts/vin/register.mjs scripts/vin/export-breakdowns.ts breakdowns.json
  python scripts/vin/build-spreadsheet.py breakdowns.json "VIN Decoder Test Results.xlsx"

Sheets:
  Summary       – pass counts per make, and the test rules
  Test VINs     – one row per VIN: result, decoded vehicle, then Pos 1 … Pos 17, each cell
                  "character — what it means"
  Position Key  – the same VINs, one row per decoded segment (long format, easy to filter)
"""
import json
import sys
from collections import Counter, defaultdict

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

src, dst = sys.argv[1], sys.argv[2]
rows = json.load(open(src, encoding="utf-8"))

HEAD = PatternFill("solid", fgColor="02070D")
HEAD_FONT = Font(bold=True, color="FFFFFF")
OK = PatternFill("solid", fgColor="E6F4EA")
BAD = PatternFill("solid", fgColor="FDECEA")
GREY = PatternFill("solid", fgColor="F3F4F6")
WRAP = Alignment(wrap_text=True, vertical="top")


def norm(s):
    return "".join(ch for ch in str(s or "").lower() if ch.isalnum())


def verdict(r):
    s, l = r["summary"], r["listing"]
    problems = []
    if not s.get("country"):
        problems.append("no country")
    if not s.get("make"):
        problems.append("make not decoded")
    if not (s.get("model") or s.get("series")):
        problems.append("model not decoded")
    if l:
        if l.get("make") and norm(l["make"]) != norm(s.get("make")):
            problems.append(f"make ≠ listing ({l['make']})")
        want = norm(str(l.get("model") or "").split(" ")[0].split("/")[0])
        if want and want not in norm(f"{s.get('model')} {s.get('series')}"):
            problems.append(f"model ≠ listing ({l['model']})")
        if l.get("year") and s.get("modelYear") and abs(int(l["year"]) - int(s["modelYear"])) > 1:
            problems.append(f"year ≠ listing ({l['year']})")
    return ("Decoded" if not problems else "Not fully decoded"), "; ".join(problems)


def cell_text(seg, pos):
    ch = r_vin[pos - 1]
    span = f"{seg['from']}–{seg['to']}" if seg["from"] != seg["to"] else str(seg["from"])
    meaning = seg["value"] or ("Filler" if seg["status"] == "filler" else "Not decoded")
    head = f"{ch} — {seg['label']}"
    if seg["from"] != seg["to"]:
        head += f" (positions {span}: {seg['chars']})"
    return f"{head}\n{meaning}"


wb = Workbook()

# ── Test VINs (wide) ─────────────────────────────────────────────────────────
ws = wb.active
ws.title = "Test VINs"
fixed = ["VIN", "Group", "Result", "Problems", "Decoded make", "Decoded model", "Series", "Model year",
         "Body", "Engine", "Plant", "Country", "Rule applied", "Listing description (ground truth)", "Listing source"]
headers = fixed + [f"Pos {i}" for i in range(1, 18)]
ws.append(headers)
for c in range(1, len(headers) + 1):
    cell = ws.cell(row=1, column=c)
    cell.fill, cell.font, cell.alignment = HEAD, HEAD_FONT, WRAP

by_make = defaultdict(Counter)
for r in rows:
    r_vin = r["vin"]
    s = r["summary"]
    result, problems = verdict(r)
    by_make[s.get("make") or s.get("manufacturer") or r_vin[:3]][result] += 1
    listing = r["listing"] or {}
    desc = " ".join(str(x) for x in [listing.get("make"), listing.get("description")] if x) if listing else ""
    if listing.get("note"):
        desc += f"  [NOTE: {listing['note']}]"
    # Each position shows the most specific segment covering it (the WMI/country rows cover 1–3).
    per_pos = {}
    for seg in r["segments"]:
        for p in range(seg["from"], seg["to"] + 1):
            cur = per_pos.get(p)
            # Smallest span wins: position 1 shows the region, 2 the country, 3 the WMI.
            if cur is None or (seg["to"] - seg["from"]) < (cur["to"] - cur["from"]):
                per_pos[p] = seg
    pos_cells = [cell_text(per_pos[p], p) if p in per_pos else r_vin[p - 1] for p in range(1, 18)]
    engine = s.get("engine") or (f"{s['engineLitres']}L" if s.get("engineLitres") else None)
    ws.append([r_vin, r["group"], result, problems, s.get("make"), s.get("model"), s.get("series"), s.get("modelYear"),
               s.get("body"), engine, s.get("plant"), s.get("country"), r["rule"], desc, listing.get("source") if listing else None]
              + pos_cells)
    row = ws.max_row
    ws.cell(row=row, column=3).fill = OK if result == "Decoded" else BAD
    for c in range(1, len(headers) + 1):
        ws.cell(row=row, column=c).alignment = WRAP

widths = [20, 16, 16, 30, 14, 18, 22, 10, 18, 26, 22, 14, 18, 44, 36] + [26] * 17
for i, w in enumerate(widths, 1):
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = "B2"
ws.auto_filter.ref = ws.dimensions

# ── Position Key (long) ──────────────────────────────────────────────────────
wl = wb.create_sheet("Position Key")
wl.append(["VIN", "Positions", "Characters", "What the position means", "Decoded value", "Status", "Note"])
for c in range(1, 8):
    wl.cell(row=1, column=c).fill, wl.cell(row=1, column=c).font = HEAD, HEAD_FONT
for r in rows:
    for seg in r["segments"]:
        span = f"{seg['from']}–{seg['to']}" if seg["from"] != seg["to"] else str(seg["from"])
        wl.append([r["vin"], span, seg["chars"], seg["label"], seg["value"], seg["status"], seg.get("note")])
for i, w in enumerate([20, 10, 12, 44, 44, 12, 70], 1):
    wl.column_dimensions[get_column_letter(i)].width = w
wl.freeze_panes = "B2"
wl.auto_filter.ref = wl.dimensions

# ── Summary ──────────────────────────────────────────────────────────────────
wsum = wb.create_sheet("Summary", 0)
total = len(rows)
decoded = sum(c["Decoded"] for c in by_make.values())
user_rows = [r for r in rows if r["group"] == "User-supplied"]
user_ok = sum(1 for r in user_rows if verdict(r)[0] == "Decoded")
wsum.append(["Elroco VIN decoder — test results"])
wsum["A1"].font = Font(bold=True, size=14)
wsum.append([])
wsum.append(["VINs tested", total])
wsum.append(["Fully decoded", decoded])
wsum.append(["User-supplied VINs decoded", f"{user_ok} of {len(user_rows)}"])
wsum.append(["Researched listing VINs decoded", f"{decoded - user_ok} of {total - len(user_rows)}"])
wsum.append([])
wsum.append(["A VIN counts as decoded when the decoder gives its country, make and model or series, and — where an "
             "auction listing describes the car — the make, the model name and the year (±1, since listings often "
             "quote the build or compliance year) agree with the listing."])
wsum.append([])
wsum.append(["Make", "Tested", "Decoded", "Not fully decoded"])
for c in range(1, 5):
    wsum.cell(row=wsum.max_row, column=c).fill, wsum.cell(row=wsum.max_row, column=c).font = HEAD, HEAD_FONT
for make, c in sorted(by_make.items(), key=lambda kv: -sum(kv[1].values())):
    wsum.append([make, sum(c.values()), c["Decoded"], c["Not fully decoded"]])
wsum.column_dimensions["A"].width = 40
for col in "BCD":
    wsum.column_dimensions[col].width = 18
wsum["A8"].alignment = WRAP
wsum.merge_cells("A8:D8")
wsum.row_dimensions[8].height = 60

wb.save(dst)
print(f"wrote {dst}: {total} VINs, {decoded} decoded")
