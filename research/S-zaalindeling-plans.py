"""Workstream S addendum (25-09-2026): the published floor plans of both Kamers
as data, for `data/chamber-plans.json` (ADR 0018, amendment 3).

Reads the two official sources as downloaded, never a memory of them:

- Tweede Kamer: the factsheet "Zetelverdeling plenaire zaal", juni 2026,
  https://www.tweedekamer.nl/sites/default/files/2026-06/zetelverdeling%20Juni%202026%20NL.pdf
  The page is vector art. It is rendered at 400 dpi, split into seats along
  the white lines between them, and each seat takes the fractie whose legend
  colour is nearest to its pixels. The PRO seats are drawn in two colours
  (green and red); a seat that holds both is PRO. The result must equal the
  legend's seat count per fractie, or the script stops.
- Eerste Kamer: the page "Wie zit waar", https://www.eerstekamer.nl/wie_zit_waar.
  Each member is one cell (class "lid", data-fractie, the name) in the left
  or right bench block of ten rows, plus one cell in the middle (the chair).
  An empty cell (class "l-virt") keeps the column; row and column are the
  position in that markup, not a seat number.

Usage (needs PyMuPDF, numpy and scipy):

    python3 research/S-zaalindeling-plans.py TK.pdf EK.html > /tmp/plans.json

Coordinates: the Tweede Kamer seats and furniture are the centres of the
drawn shapes in PDF points of the source page (origin top left, y down); the
Eerste Kamer seats are the markup's grid, one unit per cell, with the middle
column between the blocks. Both are left exactly as the source draws them;
turning the hall for display is the renderer's job.
"""

import collections
import html
import json
import re
import sys

import numpy as np
import pymupdf
from scipy import ndimage

# Legend colours of the June 2026 factsheet, read from its filled legend bars (RGB 0..1).
TK_LEGEND = {
    "D66": (0.044, 0.695, 0.295),
    "VVD": (0.951, 0.562, 0.124),
    "PVV": (0.094, 0.307, 0.465),
    "CDA": (0.0, 0.503, 0.4),
    "JA21": (0.129, 0.227, 0.423),
    "FVD": (0.564, 0.218, 0.209),
    "Groep Markuszower": (0.368, 0.565, 0.684),
    "BBB": (0.725, 0.761, 0.312),
    "DENK": (0.218, 0.751, 0.759),
    "SGP": (0.949, 0.397, 0.131),
    "PvdD": (0.0, 0.448, 0.212),
    "ChristenUnie": (0.047, 0.617, 0.852),
    "SP": (0.934, 0.19, 0.166),
    "50PLUS": (0.571, 0.151, 0.562),
    "Volt": (0.192, 0.145, 0.398),
    "Lid Keijzer": (0.944, 0.449, 0.674),
    "PRO:green": (0.546, 0.743, 0.286),
}
TK_COUNTS = {
    "D66": 26, "VVD": 22, "PRO": 20, "PVV": 19, "CDA": 18, "JA21": 9, "FVD": 7, "Groep Markuszower": 7,
    "BBB": 3, "DENK": 3, "SGP": 3, "PvdD": 3, "ChristenUnie": 3, "SP": 3, "50PLUS": 2, "Volt": 1, "Lid Keijzer": 1,
}


def tk_plan(path):
    page = pymupdf.open(path)[0]
    clip = pymupdf.Rect(40, 265, 480, 480)
    scale = 400 / 72
    pix = page.get_pixmap(dpi=400, clip=clip, alpha=False)
    rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, 3).astype(int)
    white = rgb.min(axis=2) > 225
    grey = (abs(rgb[:, :, 0] - 197) < 14) & (abs(rgb[:, :, 1] - 207) < 14) & (abs(rgb[:, :, 2] - 216) < 14)
    ink = ndimage.binary_erosion(~white & ~grey, iterations=2)
    labels, count = ndimage.label(ink)
    sizes = ndimage.sum(ink, labels, range(1, count + 1))
    legend = {name: np.array(color) * 255 for name, color in TK_LEGEND.items()}
    seats = []
    for index in range(1, count + 1):
        # Seats are about 7000 pixels at 400 dpi; the "6" badge and stray edges are under 1000.
        if sizes[index - 1] < 5000:
            continue
        ys, xs = np.where(labels == index)
        votes = collections.Counter(
            min(legend, key=lambda name: ((legend[name] - pixel) ** 2).sum()) for pixel in rgb[ys, xs][::7]
        )
        fractie = votes.most_common(1)[0][0]
        if "PRO:green" in votes:
            # Two-coloured seats are PRO; a seat in the PRO green alone is BBB, whose green is close.
            fractie = "PRO" if votes.get("SP", 0) > 0 else "BBB"
        seats.append({
            "x": round(clip.x0 + xs.mean() / scale, 1),
            "y": round(clip.y0 + ys.mean() / scale, 1),
            "fractie": fractie,
        })
    counts = collections.Counter(seat["fractie"] for seat in seats)
    if dict(counts) != TK_COUNTS:
        sys.exit(f"Tweede Kamer seats do not match the legend: {dict(counts)}")
    seats.sort(key=lambda seat: (seat["y"], seat["x"]))
    # Furniture, from the numbered legend (1 Voorzitter, 2 Griffier, 3 Kabinet vak-K, 5 Spreekgestoelte)
    # and the two grey bars of vak-K, as centre lines.
    words = {w[4]: w for w in page.get_text("words") if w[1] < 300 and w[4] in ("1", "2", "3", "5")}
    centre = lambda w: {"x": round((w[0] + w[2]) / 2, 1), "y": round((w[1] + w[3]) / 2, 1)}
    bars = []
    for drawing in page.get_drawings():
        fill, rect = drawing.get("fill"), drawing["rect"]
        if fill and abs(fill[0] - 0.773) < 0.02 and rect.x0 > 270 and rect.x1 < 395 and rect.y1 < 260 and rect.height > 50:
            points = [(pt.x, pt.y) for item in drawing["items"] for pt in item[1:] if hasattr(pt, "x")]
            top = sorted(points, key=lambda pt: pt[1])[:2]
            bottom = sorted(points, key=lambda pt: -pt[1])[:2]
            mid = lambda pair: {"x": round((pair[0][0] + pair[1][0]) / 2, 1), "y": round((pair[0][1] + pair[1][1]) / 2, 1)}
            bars.append({"from": mid(top), "to": mid(bottom)})
    bars.sort(key=lambda bar: bar["from"]["x"])
    # The grey furniture as polygons; each shape is drawn twice (a shadow copy
    # offset down and to the right), and only the first of each is kept.
    furniture = []
    seen = []
    for drawing in page.get_drawings():
        fill, rect = drawing.get("fill"), drawing["rect"]
        if not fill or abs(fill[0] - 0.773) > 0.02 or rect.y1 > 270 or rect.width < 8 or rect.height < 8:
            continue
        points = []
        for item in drawing["items"]:
            for pt in item[1:]:
                if hasattr(pt, "x") and (round(pt.x, 1), round(pt.y, 1)) not in points:
                    points.append((round(pt.x, 1), round(pt.y, 1)))
        if len(points) < 3 or any(abs(rect.x0 - x0) < 8 and abs(rect.y0 - y0) < 8 for x0, y0 in seen):
            continue
        seen.append((rect.x0, rect.y0))
        middle_x = (rect.x0 + rect.x1) / 2
        near = lambda w: rect.x0 - 2 <= (w[0] + w[2]) / 2 <= rect.x1 + 2 and rect.y0 - 2 <= (w[1] + w[3]) / 2 <= rect.y1 + 2
        kind = "desk" if near(words["1"]) else "rostrum" if near(words["5"]) else "cabinet" if 270 < middle_x < 395 and rect.height > 50 else "other"
        furniture.append({"kind": kind, "points": [{"x": x, "y": y} for x, y in points]})
    return {
        "seats": seats,
        "places": {
            "chair": centre(words["1"]),
            "clerk": centre(words["2"]),
            "rostrum": centre(words["5"]),
            "cabinet": bars,
            "furniture": furniture,
        },
    }


def ek_plan(path):
    text = open(path, encoding="utf-8").read()
    start = text.index('<div class="wiezitwaar_plattegrond')
    end = text.index('<div class="wiezitwaar_bio', start)
    body = re.sub(r"<svg.*?</svg>", "", text[start:end], flags=re.S)
    seats = []

    def cells(block_html):
        rows = re.split(r'<div class="d-flex">', block_html)[1:]
        out = []
        for row in rows:
            out.append(re.findall(r'<div (?:data-fractie="([^"]*)" class="[^"]*lid"|class="(l-virt)[^"]*")>(?:<button[^>]*><span class="visually-hidden">([^<]*)</span>)?', row))
        return out

    left = body[body.index('<div class="left bankjes">'):body.index('<div class="middle')]
    middle = body[body.index('<div class="middle'):body.index('<div class="right bankjes">')]
    right = body[body.index('<div class="right bankjes">'):]
    for block, html_block, offset in (("left", left, 0), ("right", right, 5)):
        for row_index, row in enumerate(cells(html_block)):
            for col_index, (fractie, empty, name) in enumerate(row):
                if empty:
                    continue
                seats.append({
                    "x": offset + col_index,
                    "y": row_index,
                    "block": block,
                    "fractie": fractie,
                    "name": html.unescape(name),
                })
    chair = re.search(r'data-fractie="([^"]*)" class="[^"]*lid"><button[^>]*><span class="visually-hidden">([^<]*)</span>', middle)
    seats.append({"x": 4, "y": 9, "block": "chair", "fractie": chair.group(1), "name": html.unescape(chair.group(2))})
    if len(seats) != 75:
        sys.exit(f"Eerste Kamer: {len(seats)} seats, expected 75")
    return {"seats": seats, "places": {"chair": {"x": 4, "y": 9}, "cabinet": [{"from": {"x": 3, "y": -1}, "to": {"x": 5, "y": -1}}]}}


if __name__ == "__main__":
    print(json.dumps({"tweede-kamer": tk_plan(sys.argv[1]), "eerste-kamer": ek_plan(sys.argv[2])}, ensure_ascii=False))
