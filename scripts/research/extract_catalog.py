"""Extract 13-5/8" 10,000 psi U BOP part data from the Cameron U/UM parts catalog.

Part numbers are copied programmatically from the PDF tables so that no value is
retyped by hand. Every record carries its source id and page number.

Usage:  python scripts/research/extract_catalog.py
Needs:  PyMuPDF (import fitz) >= 1.23 for Page.find_tables()
"""
import json
import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "sources" / "pdf" / "cameron-u-um-bop-parts-catalog-2014.pdf"
OUT = ROOT / "data" / "extracted" / "cameron-catalog-13-5-8-10k.json"
SOURCE_ID = "SRC-CAM-CAT-2014"

# Items that the exploded view (catalog p.9, drawing SD17500) marks with "*"
# = recommended spare parts. Read visually from the rendered page.
RECOMMENDED_SPARES = {18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 42}
# Items that do not appear as balloons on the SD17500 exploded view.
NOT_IN_DRAWING = {39, 43}


def clean(cell):
    return re.sub(r"\s+", " ", (cell or "").replace("\n", " ")).strip()


def table_rows(page_no):
    page = DOC[page_no - 1]
    rows = []
    for table in page.find_tables().tables:
        for row in table.extract():
            cells = [clean(c) for c in row]
            if any(cells):
                rows.append(cells)
    return rows


def bonnet_parts():
    """Page 12: 'U BOP Part Numbers 13-5/8" 3,000 - 13-5/8" 15,000 psi WP'. Column 6 = 10,000 psi Model II."""
    parts = []
    for cells in table_rows(12):
        if not cells[0].isdigit():
            continue
        item = int(cells[0])
        pn_10k = cells[6]
        parts.append({
            "item": item,
            "description": cells[1],
            "qtySingle": cells[2],
            "qtyDouble": cells[3],
            "partNumber10k": None if pn_10k.startswith("--") else pn_10k,
            "partNumberAllColumns": {
                "3000psi_ModelII": cells[4], "5000psi_ModelII": cells[5],
                "10000psi_ModelII": cells[6], "15000psi_ModelB": cells[7],
            },
            "inExplodedView": item not in NOT_IN_DRAWING,
            "drawingRef": None if item in NOT_IN_DRAWING else {"sourceId": SOURCE_ID, "page": 9, "drawing": "SD17500", "balloon": item},
            "recommendedSpare": item in RECOMMENDED_SPARES,
            "source": {"sourceId": SOURCE_ID, "page": 12},
        })
    return parts


def rows_matching(page_no, pattern):
    rx = re.compile(pattern)
    return [{"page": page_no, "cells": c} for c in table_rows(page_no) if any(rx.search(x) for x in c)]


def header_rows(page_no, n):
    return [{"page": page_no, "cells": c} for c in table_rows(page_no)[:n]]


def rows_in_titled_table(page_no, title, pattern):
    """Rows matching pattern in the table whose title row contains `title` (splits stacked tables)."""
    rx = re.compile(pattern)
    out = []
    for table in DOC[page_no - 1].find_tables().tables:
        rows = [[clean(c) for c in row] for row in table.extract()]
        if not rows or title not in rows[0][0]:
            continue
        out += [{"page": page_no, "cells": c} for c in rows[1:] if any(rx.search(x) for x in c)]
    if not out:
        sys.exit(f"No rows for table '{title}' on p.{page_no}")
    return out


def rows_after_title_row(page_no, title, pattern):
    """Rows matching pattern after a title row inside one table (p.7 stacks two tables in one grid)."""
    rows = table_rows(page_no)
    start = next((i for i, c in enumerate(rows) if c[0].startswith(title)), None)
    if start is None:
        sys.exit(f"Title row not found on p.{page_no}: {title}")
    rx = re.compile(pattern)
    return [{"page": page_no, "cells": c} for c in rows[start + 1:] if rx.search(c[0])]


def isr_lower_rows():
    """p.52 lower-ram ISR table. find_tables misses its bore-size column, so the label is read from the
    text to the left of each row and prepended as the first cell."""
    page = DOC[51]
    out = []
    for table in page.find_tables().tables:
        header = " ".join(clean(c) for row in table.extract()[:4] for c in row)
        if "Lower Ram" not in header:
            continue
        for row, cells in zip(table.rows, table.extract()):
            cells = [clean(c) for c in cells]
            if not re.match(r"^\d{6,7}-", cells[0]):
                continue
            left = fitz.Rect(page.rect.x0, row.bbox[1], row.bbox[0], row.bbox[3])
            label = clean(page.get_textbox(left))
            out.append({"page": 52, "cells": [label, *cells]})
    return [r for r in out if r["cells"][0].startswith("13-5/8")]


def main():
    if not PDF.exists():
        sys.exit(f"Missing source PDF: {PDF}")
    result = {
        "sourceId": SOURCE_ID,
        "pdf": PDF.name,
        "scope": '13-5/8" 10,000 psi WP U BOP (Model II column where the catalog distinguishes models)',
        "bonnetAndBodyParts": bonnet_parts(),
        "operatingData": header_rows(7, 3) + rows_matching(7, r"^13-5/8\" Except"),
        "largeBoreOperatingData": rows_after_title_row(7, "Large Bore Shear Bonnet Operating Data", r"^13-5/8\" Except"),
        "bonnetRebuildKits": rows_matching(16, r"^13-5/8"),
        "liftingPlates": rows_matching(17, r"^13-5/8"),
        "largeBoreShearBonnet": header_rows(18, 30),
        "largeBoreShearBonnetKits": rows_matching(19, r"^13-5/8"),
        "tandemBoosterComposite": header_rows(21, 40),
        "standardAccessories": rows_matching(40, r"^13-5/8\" 10,000"),
        "pipeRams": header_rows(43, 60),
        "shearingBlindRams": rows_matching(48, r"13-5/8\" 5,000|Description|BOP Bore"),
        "h2sShearingBlindRams": rows_matching(49, r"13-5/8\" 5,000|BOP Bore|Pressure"),
        "severeServiceH2sShearRams": rows_matching(50, r"13-5/8\" 5,000"),
        "isrShearRams": rows_matching(52, r"^13-5/8"),
        "isrShearRamsLower": isr_lower_rows(),
        "variableBoreRams": rows_matching(54, r"^13-5/8\" 3,000|BOP Size"),
        "variableBoreRamsHighTemp": rows_in_titled_table(54, "Extended Range High Temperature", r"^13-5/8"),
        "flexpackerNr": rows_in_titled_table(55, "FLEXPACKER-NR Sizes", r"^13-5/8"),
        "flexpackers": rows_matching(55, r"^13-5/8"),
        "wearPadsAndCamlastSeals": rows_matching(59, r"^13-5/8|Size|Bore Size"),
        "bonnetSealCarriers": rows_matching(60, r"13-5/8|Type"),
        "knownPrintAnomalies": [
            "p.12 item 12 Bolt, Bonnet: 3,000 psi column prints 201081-06-01, 10,000 psi column prints 2010181-06-01.",
            "p.12 item 13 Stud: 10,000 psi column prints 219061-14-06-01; the other three columns print 219065-...",
            "p.12 item 39 Packing, Plastic: 10,000 psi column prints 07650-25; other columns print 007650-25 (probable missing leading zero).",
            "p.12 header prints '3,000 pasi' (typo in source).",
            "p.49 first 13-5/8 row prints '44781-01-00-01' split across cells; p.50 shows 644781-03-00-01 for severe service.",
            "p.59 13-5/8 right wear pad prints '20112277-02' (left is 2011277-01).",
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT} with {len(result['bonnetAndBodyParts'])} bonnet/body items")


if __name__ == "__main__":
    DOC = fitz.open(PDF)
    main()
