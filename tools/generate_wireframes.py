"""
generate_wireframes.py

Generates 6 wireframe SVG mockups for the Container Utilization Checker tool.
Outputs to: /Users/estherho/sc_product/products/container-utilization-checker/outputs/

Options:
  A - "The Calculator"  — Minimal single-column, form above result inline below
  B - "The Dashboard"   — 2-column layout (form left, result cards right)
  C - "The Stepper"     — Step-by-step guided flow (Step 1 → Step 2 → Result)

Each option has a desktop (1280 × 800) and mobile (375 × 812) variant.
"""

from pathlib import Path
import textwrap

OUTPUT_DIR = Path("/Users/estherho/sc_product/products/container-utilization-checker/outputs")

# ── Color palette ──────────────────────────────────────────────────────────────
BG        = "#FFFFFF"
BOX_FILL  = "#F0F0F0"
BOX_STROKE= "#CCCCCC"
TEXT      = "#333333"
TEXT_MUTED= "#888888"
BLUE      = "#2563EB"
BLUE_LIGHT= "#DBEAFE"
GREEN     = "#16A34A"
GREEN_LIGHT="#DCFCE7"
ORANGE    = "#EA580C"
RED       = "#DC2626"
YELLOW_BG = "#FEF9C3"
YELLOW_STR= "#CA8A04"
GRAY_DARK = "#6B7280"
GRAY_LIGHT= "#F8FAFC"
DISABLED  = "#D1D5DB"
DISABLED_T= "#9CA3AF"
BORDER    = "#E5E7EB"
PANEL_BG  = "#F8FAFC"
BLUE_BTN_T= "#FFFFFF"


# ── Low-level SVG primitives ───────────────────────────────────────────────────

def svg_open(width: int, height: int) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">\n'
        f'<rect width="{width}" height="{height}" fill="{BG}"/>\n'
    )

def svg_close() -> str:
    return "</svg>\n"

def rect(x, y, w, h, fill=BOX_FILL, stroke=BOX_STROKE, rx=4, stroke_width=1, opacity=1.0) -> str:
    op = f' opacity="{opacity}"' if opacity != 1.0 else ""
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}" rx="{rx}"{op}/>\n'
    )

def text(x, y, content, size=12, fill=TEXT, weight="normal", anchor="start",
         font="Arial, sans-serif", clip_id=None) -> str:
    clip = f' clip-path="url(#{clip_id})"' if clip_id else ""
    return (
        f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" '
        f'fill="{fill}" font-weight="{weight}" text-anchor="{anchor}"{clip}>'
        f'{content}</text>\n'
    )

def line(x1, y1, x2, y2, stroke=BOX_STROKE, stroke_width=1) -> str:
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{stroke_width}"/>\n'

def clip_def(cid, x, y, w, h) -> str:
    return f'<clipPath id="{cid}"><rect x="{x}" y="{y}" width="{w}" height="{h}"/></clipPath>\n'


# ── Composite wireframe components ─────────────────────────────────────────────

def header_bar(width: int, height: int = 56, logo_text: str = "DockToAI",
               show_hamburger: bool = False) -> str:
    out = rect(0, 0, width, height, fill=BG, stroke=BORDER, rx=0)
    out += text(20, height // 2 + 5, logo_text, size=16, fill=BLUE, weight="bold")
    if show_hamburger:
        # hamburger lines
        hx, hy = width - 36, height // 2 - 6
        for i in range(3):
            out += line(hx, hy + i * 6, hx + 20, hy + i * 6, stroke=TEXT, stroke_width=2)
    else:
        # nav items
        nav_x = width - 260
        for i, nav in enumerate(["Features", "Pricing", "Contact", "Login"]):
            out += text(nav_x + i * 64, height // 2 + 5, nav, size=12, fill=GRAY_DARK)
    return out

def input_box(x, y, w, h=36, label: str = "", label_above: bool = False) -> str:
    out = ""
    if label_above:
        out += text(x, y - 6, label, size=10, fill=TEXT_MUTED)
    out += rect(x, y, w, h, fill=BG, stroke=BOX_STROKE)
    if label and not label_above:
        out += text(x + 8, y + h // 2 + 4, label, size=11, fill=TEXT_MUTED)
    return out

def pill_toggle(x, y, options: list[tuple[str, bool]], pill_w=52, pill_h=28) -> str:
    """Render a pill/toggle group. (label, selected)."""
    out = rect(x, y, len(options) * pill_w + 4, pill_h + 4,
               fill=BOX_FILL, stroke=BOX_STROKE, rx=16)
    for i, (label, selected) in enumerate(options):
        px = x + 2 + i * pill_w
        py = y + 2
        fill = BLUE if selected else "transparent"
        stroke = BLUE if selected else "transparent"
        txt_fill = BLUE_BTN_T if selected else GRAY_DARK
        out += rect(px, py, pill_w, pill_h, fill=fill, stroke=stroke, rx=14)
        out += text(px + pill_w // 2, py + pill_h // 2 + 4, label,
                    size=11, fill=txt_fill, weight="bold" if selected else "normal",
                    anchor="middle")
    return out

def primary_button(x, y, w, h=40, label="Button", disabled=False) -> str:
    fill = DISABLED if disabled else BLUE
    txt_fill = DISABLED_T if disabled else BLUE_BTN_T
    out = rect(x, y, w, h, fill=fill, stroke=fill, rx=6)
    out += text(x + w // 2, y + h // 2 + 5, label, size=13,
                fill=txt_fill, weight="bold", anchor="middle")
    return out

def secondary_button(x, y, w, h=36, label="Button", disabled=False) -> str:
    fill = DISABLED if disabled else BOX_FILL
    stroke = DISABLED if disabled else BOX_STROKE
    txt_fill = DISABLED_T if disabled else TEXT
    out = rect(x, y, w, h, fill=fill, stroke=stroke, rx=6)
    out += text(x + w // 2, y + h // 2 + 5, label, size=12,
                fill=txt_fill, anchor="middle")
    return out

def progress_bar(x, y, w, h=18, percent=72, fill_color=BLUE,
                 label="", value_label="") -> str:
    out = rect(x, y, w, h, fill=BOX_FILL, stroke=BOX_STROKE, rx=4)
    filled_w = max(4, int(w * percent / 100))
    out += rect(x, y, filled_w, h, fill=fill_color, stroke=fill_color, rx=4)
    if label:
        out += text(x, y - 5, label, size=10, fill=TEXT_MUTED)
    if value_label:
        out += text(x + w + 6, y + h // 2 + 4, value_label, size=10, fill=TEXT_MUTED)
    return out

def verdict_badge(x, y, w, h=48, verdict="FITS", color=GREEN) -> str:
    out = rect(x, y, w, h, fill=f"{color}22", stroke=color, rx=8)
    symbol = "✓" if color == GREEN else ("!" if color == ORANGE else "✗")
    out += text(x + 16, y + h // 2 + 6, f"{symbol} {verdict}",
                size=20, fill=color, weight="bold")
    return out

def card(x, y, w, h, fill=BG, stroke=BORDER, rx=8) -> str:
    return rect(x, y, w, h, fill=fill, stroke=stroke, rx=rx)

def disclaimer_bar(x, y, w, h=32) -> str:
    out = rect(x, y, w, h, fill=YELLOW_BG, stroke=YELLOW_STR, rx=4)
    out += text(x + 10, y + h // 2 + 4,
                "⚠  Planning estimate only. Confirm with your forwarder before booking.",
                size=10, fill=YELLOW_STR)
    return out

def section_label(x, y, label: str, size=11) -> str:
    return text(x, y, label.upper(), size=size, fill=TEXT_MUTED, weight="bold")

def label_value_row(x, y, label: str, value: str, w=320, size=11) -> str:
    out = text(x, y, label, size=size, fill=TEXT_MUTED)
    out += text(x + w, y, value, size=size, fill=TEXT, weight="bold", anchor="end")
    return out

def step_indicator(x, y, steps: list[tuple[str, str]], total_w=600) -> str:
    """steps: list of (label, state) where state in 'done','active','todo'"""
    n = len(steps)
    seg_w = total_w // n
    out = ""
    for i, (label, state) in enumerate(steps):
        cx = x + i * seg_w + seg_w // 2
        cy = y + 14
        if state == "done":
            fill, stroke, txt_fill = GREEN, GREEN, BLUE_BTN_T
        elif state == "active":
            fill, stroke, txt_fill = BLUE, BLUE, BLUE_BTN_T
        else:
            fill, stroke, txt_fill = BOX_FILL, BOX_STROKE, TEXT_MUTED
        # circle
        out += f'<circle cx="{cx}" cy="{cy}" r="14" fill="{fill}" stroke="{stroke}" stroke-width="2"/>\n'
        out += text(cx, cy + 5, str(i + 1), size=12, fill=txt_fill, weight="bold", anchor="middle")
        out += text(cx, cy + 30, label, size=10, fill=txt_fill if state != "todo" else TEXT_MUTED,
                    anchor="middle")
        # connector line
        if i < n - 1:
            out += line(cx + 14, cy, cx + seg_w - 14, cy,
                        stroke=GREEN if state == "done" else BOX_STROKE, stroke_width=2)
    return out

def watermark_label(width, height, label: str) -> str:
    """Bottom-right corner label identifying the wireframe."""
    return text(width - 10, height - 8, label, size=9, fill=DISABLED_T, anchor="end")


# ══════════════════════════════════════════════════════════════════════════════
# OPTION A — THE CALCULATOR
# ══════════════════════════════════════════════════════════════════════════════

def option_a_desktop() -> str:
    W, H = 1280, 800
    parts = [svg_open(W, H)]
    # defs
    parts.append("<defs>")
    parts.append(clip_def("a_clip_dim", 320, 180, 640, 50))
    parts.append("</defs>\n")

    # Header
    parts.append(header_bar(W, 56))

    # Centered column
    cx = (W - 640) // 2  # 320
    y = 80

    # Title
    parts.append(text(cx, y + 28, "Container Utilization Checker",
                       size=28, fill=TEXT, weight="bold"))
    parts.append(text(cx, y + 52, "Check if your shipment fits before you book.",
                       size=14, fill=TEXT_MUTED))

    # ── Form Card ──
    y = 146
    parts.append(card(cx, y, 640, 272))

    # Carton Dimensions
    fy = y + 20
    parts.append(section_label(cx + 20, fy + 14, "Carton Dimensions"))
    fy += 32
    for i, lbl in enumerate(["Length (cm)", "Width (cm)", "Height (cm)"]):
        parts.append(input_box(cx + 20 + i * 185, fy, 168, 36, label=lbl))
    parts.append(pill_toggle(cx + 20 + 3 * 185 + 8, fy + 4,
                              [("cm", True), ("in", False)], pill_w=36, pill_h=28))

    # Qty & Weight
    fy += 56
    parts.append(section_label(cx + 20, fy + 14, "Quantity & Weight"))
    fy += 32
    parts.append(input_box(cx + 20, fy, 220, 36, label="Quantity (cartons)"))
    parts.append(input_box(cx + 260, fy, 220, 36, label="Weight per carton"))
    parts.append(pill_toggle(cx + 500, fy + 4,
                              [("kg", True), ("lb", False)], pill_w=36, pill_h=28))

    # Container type + stackable
    fy += 56
    parts.append(section_label(cx + 20, fy + 14, "Container Type"))
    fy += 26
    for i, (lbl, sel) in enumerate([("20GP", False), ("40GP", True), ("40HQ", False)]):
        bx = cx + 20 + i * 120
        bfill = BLUE_LIGHT if sel else BOX_FILL
        bstroke = BLUE if sel else BOX_STROKE
        parts.append(rect(bx, fy, 108, 32, fill=bfill, stroke=bstroke, rx=6))
        parts.append(text(bx + 54, fy + 20, lbl, size=12,
                          fill=BLUE if sel else TEXT, weight="bold" if sel else "normal",
                          anchor="middle"))
    # Stackable
    parts.append(text(cx + 400, fy + 20, "Stackable:", size=12, fill=TEXT_MUTED))
    parts.append(pill_toggle(cx + 468, fy + 2,
                              [("Yes", True), ("No", False)], pill_w=44, pill_h=28))

    # CTA button
    fy += 52
    parts.append(primary_button(cx + 20, fy, 600, 44, "CHECK MY CONTAINER  →"))

    # ── Result Card ──
    ry = y + 272 + 20
    parts.append(card(cx, ry, 640, 280, stroke=GREEN))
    # green left accent bar
    parts.append(rect(cx, ry, 4, 280, fill=GREEN, stroke=GREEN, rx=2))

    parts.append(disclaimer_bar(cx + 16, ry + 12, 608, 32))

    # Verdict
    parts.append(verdict_badge(cx + 16, ry + 56, 200, 48, "FITS", GREEN))
    parts.append(text(cx + 232, ry + 88, "Best: 40GP  |  Use this container",
                       size=14, fill=TEXT))

    # Progress bars
    parts.append(section_label(cx + 16, ry + 124, "Volume Utilization"))
    parts.append(progress_bar(cx + 80, ry + 128, 460, 18, 72, BLUE,
                               value_label="72.1% — Healthy"))
    parts.append(section_label(cx + 16, ry + 162, "Payload Utilization"))
    parts.append(progress_bar(cx + 80, ry + 166, 460, 18, 22, BLUE,
                               value_label="22.0% — OK"))

    # Rule + details
    parts.append(rect(cx + 16, ry + 196, 608, 26, fill=GREEN_LIGHT, stroke=GREEN, rx=4))
    parts.append(text(cx + 24, ry + 213, "Healthy planning range. No flags.",
                       size=11, fill=GREEN, weight="bold"))
    parts.append(text(cx + 16, ry + 238,
                       "Total: 48.0 CBM  |  14,400 kg  |  Container: 67.0 CBM / 26,700 kg",
                       size=11, fill=TEXT_MUTED))

    # Disabled buttons
    parts.append(secondary_button(cx + 16, ry + 254, 295, 34,
                                    "Generate supplier email  [Coming v1.1]", disabled=True))
    parts.append(secondary_button(cx + 327, ry + 254, 295, 34,
                                    "Download report  [Coming v1.1]", disabled=True))

    parts.append(watermark_label(W, H, "Option A — Desktop  1280×800"))
    parts.append(svg_close())
    return "".join(parts)


def option_a_mobile() -> str:
    W, H = 375, 812
    parts = [svg_open(W, H)]

    # Header
    parts.append(header_bar(W, 48, show_hamburger=True))

    y = 56
    # Title
    parts.append(text(16, y + 24, "Container Utilization Checker",
                       size=18, fill=TEXT, weight="bold"))
    parts.append(text(16, y + 42, "Check if your shipment fits.",
                       size=12, fill=TEXT_MUTED))

    # ── Form card ──
    y = 110
    parts.append(card(8, y, 359, 248))

    fy = y + 16
    parts.append(section_label(20, fy, "Carton Dimensions", size=10))
    fy += 18
    box_w = 98
    for i, lbl in enumerate(["Length", "Width", "Height"]):
        parts.append(input_box(16 + i * (box_w + 6), fy, box_w, 34, label=lbl))
    # unit toggle below
    parts.append(pill_toggle(16, fy + 42, [("cm", True), ("in", False)], pill_w=40, pill_h=26))

    # Qty & Weight
    fy += 82
    parts.append(input_box(16, fy, 158, 34, label="Quantity"))
    parts.append(input_box(184, fy, 100, 34, label="Weight"))
    parts.append(pill_toggle(292, fy + 4, [("kg", True), ("lb", False)], pill_w=34, pill_h=26))

    # Container select (full width dropdown style)
    fy += 48
    parts.append(input_box(16, fy, 343, 34, label="Container: 40GP  ▾"))

    # Stackable toggle
    fy += 46
    parts.append(text(16, fy + 16, "Stackable:", size=11, fill=TEXT_MUTED))
    parts.append(pill_toggle(96, fy, [("Yes", True), ("No", False)], pill_w=44, pill_h=28))

    # CTA
    fy += 44
    parts.append(primary_button(16, fy, 343, 42, "CHECK MY CONTAINER"))

    # ── Result card ──
    ry = y + 248 + 12
    parts.append(card(8, ry, 359, 280, stroke=GREEN))
    parts.append(rect(8, ry, 4, 280, fill=GREEN, stroke=GREEN, rx=2))

    # Disclaimer compact
    parts.append(rect(20, ry + 10, 335, 24, fill=YELLOW_BG, stroke=YELLOW_STR, rx=3))
    parts.append(text(28, ry + 26, "⚠  Planning estimate only.",
                       size=9, fill=YELLOW_STR))

    # Verdict full-width
    parts.append(rect(20, ry + 42, 335, 44, fill=GREEN_LIGHT, stroke=GREEN, rx=6))
    parts.append(text(187, ry + 70, "✓  FITS  —  40GP",
                       size=18, fill=GREEN, weight="bold", anchor="middle"))

    # Progress bars
    parts.append(text(20, ry + 104, "Volume", size=10, fill=TEXT_MUTED))
    parts.append(progress_bar(80, ry + 92, 238, 16, 72, BLUE,
                               value_label="72.1% Healthy"))
    parts.append(text(20, ry + 130, "Payload", size=10, fill=TEXT_MUTED))
    parts.append(progress_bar(80, ry + 118, 238, 16, 22, BLUE,
                               value_label="22.0%"))

    # Action text
    parts.append(rect(20, ry + 142, 335, 24, fill=GREEN_LIGHT, stroke=GREEN, rx=4))
    parts.append(text(28, ry + 158, "Healthy planning range.",
                       size=10, fill=GREEN, weight="bold"))

    # Detail text
    parts.append(text(20, ry + 178, "48.0 CBM  /  14,400 kg",
                       size=10, fill=TEXT_MUTED))

    # Disabled buttons stacked
    parts.append(secondary_button(20, ry + 194, 335, 32,
                                    "Generate supplier email  [v1.1]", disabled=True))
    parts.append(secondary_button(20, ry + 234, 335, 32,
                                    "Download report  [v1.1]", disabled=True))

    parts.append(watermark_label(W, H, "Option A — Mobile  375×812"))
    parts.append(svg_close())
    return "".join(parts)


# ══════════════════════════════════════════════════════════════════════════════
# OPTION B — THE DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

def option_b_desktop() -> str:
    W, H = 1280, 800
    parts = [svg_open(W, H)]

    # Header
    parts.append(header_bar(W, 56))

    # Left panel
    LP_W = 400
    LP_X = 0
    LP_Y = 56
    LP_H = H - 56

    parts.append(rect(LP_X, LP_Y, LP_W, LP_H, fill=BG, stroke=BORDER, rx=0))
    parts.append(line(LP_X + LP_W, LP_Y, LP_X + LP_W, H, stroke=BORDER, stroke_width=1))

    lx = LP_X + 24
    ly = LP_Y + 24

    parts.append(text(lx, ly + 16, "Container Calculator", size=18, fill=TEXT, weight="bold"))
    ly += 42

    # Dimension row
    parts.append(section_label(lx, ly, "Carton Dimensions"))
    ly += 18
    for i, lbl in enumerate(["Length", "Width", "Height"]):
        parts.append(input_box(lx + i * 108, ly, 96, 34, label=lbl))
    parts.append(pill_toggle(lx + 3 * 108 + 6, ly + 3,
                              [("cm", True), ("in", False)], pill_w=36, pill_h=28))
    ly += 54

    # Qty + Weight
    parts.append(section_label(lx, ly, "Quantity & Weight"))
    ly += 18
    parts.append(input_box(lx, ly, 160, 34, label="Quantity"))
    parts.append(input_box(lx + 172, ly, 150, 34, label="Weight"))
    parts.append(pill_toggle(lx + 334, ly + 3,
                              [("kg", True), ("lb", False)], pill_w=28, pill_h=28))
    ly += 54

    # Container type radio cards
    parts.append(section_label(lx, ly, "Container Type"))
    ly += 18
    for i, (lbl, sel) in enumerate([("20GP", False), ("40GP", True), ("40HQ", False)]):
        bx = lx + i * 116
        bfill = BLUE_LIGHT if sel else BOX_FILL
        bstroke = BLUE if sel else BOX_STROKE
        parts.append(card(bx, ly, 106, 54, fill=bfill, stroke=bstroke))
        parts.append(text(bx + 53, ly + 22, lbl, size=13, fill=BLUE if sel else TEXT,
                          weight="bold" if sel else "normal", anchor="middle"))
        parts.append(text(bx + 53, ly + 40, "●" if sel else "○", size=12,
                          fill=BLUE if sel else TEXT_MUTED, anchor="middle"))
    ly += 70

    # Stackable
    parts.append(text(lx, ly + 18, "Stackable:", size=12, fill=TEXT_MUTED))
    parts.append(pill_toggle(lx + 80, ly, [("Yes", True), ("No", False)], pill_w=48, pill_h=32))
    ly += 52

    # Calculate button
    parts.append(primary_button(lx, ly, LP_W - 48, 44, "Calculate"))

    # Right panel
    RP_X = LP_W
    RP_Y = LP_Y
    RP_W = W - LP_W
    RP_H = LP_H
    parts.append(rect(RP_X, RP_Y, RP_W, RP_H, fill=PANEL_BG, stroke="none", rx=0))

    rx = RP_X + 28
    ry = RP_Y + 24

    parts.append(text(rx, ry + 16, "Results", size=18, fill=TEXT, weight="bold"))
    ry += 42

    # 3 stat cards
    card_w = (RP_W - 56 - 24) // 3
    for i, (title, value, sub, color) in enumerate([
        ("Verdict",   "✓ FITS",  "40GP Recommended", GREEN),
        ("Volume",    "72.1%",   "Healthy",           BLUE),
        ("Payload",   "22.0%",   "OK",                ORANGE),
    ]):
        cx2 = rx + i * (card_w + 12)
        parts.append(card(cx2, ry, card_w, 80, fill=BG, stroke=color))
        parts.append(text(cx2 + 10, ry + 18, title, size=10, fill=TEXT_MUTED))
        parts.append(text(cx2 + 10, ry + 46, value, size=18, fill=color, weight="bold"))
        parts.append(text(cx2 + 10, ry + 66, sub, size=11, fill=TEXT_MUTED))
    ry += 96

    # Progress bars section
    parts.append(section_label(rx, ry, "Utilization"))
    ry += 18
    parts.append(text(rx, ry + 14, "Volume", size=11, fill=TEXT_MUTED))
    parts.append(progress_bar(rx + 80, ry, RP_W - 140, 20, 72, BLUE,
                               value_label="72.1%"))
    ry += 36
    parts.append(text(rx, ry + 14, "Payload", size=11, fill=TEXT_MUTED))
    parts.append(progress_bar(rx + 80, ry, RP_W - 140, 20, 22, ORANGE,
                               value_label="22.0%"))
    ry += 48

    # Action recommendation
    parts.append(rect(rx, ry, RP_W - 56, 40, fill=BLUE_LIGHT, stroke=BLUE, rx=6))
    parts.append(text(rx + 12, ry + 25, "Healthy planning range. Ready to proceed.",
                       size=12, fill=BLUE, weight="bold"))
    ry += 52

    # Detail table
    parts.append(section_label(rx, ry, "Details"))
    ry += 18
    table_rows = [
        ("Total Volume",       "48.0 m³"),
        ("Total Weight",       "14,400 kg"),
        ("Container Volume",   "67.0 m³"),
        ("Container Payload",  "26,700 kg"),
    ]
    for label, value in table_rows:
        parts.append(rect(rx, ry, RP_W - 56, 28, fill=BG, stroke=BORDER, rx=3))
        parts.append(text(rx + 10, ry + 18, label, size=11, fill=TEXT_MUTED))
        parts.append(text(rx + RP_W - 72, ry + 18, value, size=11, fill=TEXT,
                          weight="bold", anchor="end"))
        ry += 30

    # Disclaimer
    parts.append(text(rx, ry + 10,
                       "Planning estimate only. Confirm with your forwarder before booking.",
                       size=9, fill=TEXT_MUTED))

    parts.append(watermark_label(W, H, "Option B — Desktop  1280×800"))
    parts.append(svg_close())
    return "".join(parts)


def option_b_mobile() -> str:
    W, H = 375, 812
    parts = [svg_open(W, H)]

    # Header
    parts.append(header_bar(W, 48, show_hamburger=True))

    y = 56

    # Form section card
    parts.append(card(8, y, 359, 228))
    fy = y + 14

    parts.append(text(20, fy + 14, "Container Calculator", size=14, fill=TEXT, weight="bold"))
    fy += 36

    # Dimension inputs
    parts.append(section_label(20, fy, "Carton Dimensions", size=10))
    fy += 16
    for i, lbl in enumerate(["L", "W", "H"]):
        parts.append(input_box(20 + i * 90, fy, 78, 32, label=lbl))
    parts.append(pill_toggle(20 + 3 * 90 + 4, fy + 2,
                              [("cm", True), ("in", False)], pill_w=32, pill_h=28))
    fy += 50

    # Qty + Weight
    parts.append(input_box(20, fy, 156, 32, label="Qty"))
    parts.append(input_box(184, fy, 100, 32, label="Weight"))
    parts.append(pill_toggle(292, fy + 2, [("kg", True), ("lb", False)],
                              pill_w=28, pill_h=28))
    fy += 48

    # Container + stackable row
    parts.append(input_box(20, fy, 180, 32, label="40GP  ▾"))
    parts.append(pill_toggle(210, fy + 2, [("Yes", True), ("No", False)],
                              pill_w=44, pill_h=28))
    fy += 46

    parts.append(primary_button(20, fy, 335, 38, "Calculate"))

    # Stats (2x2 + 1 grid)
    sy = y + 228 + 12
    parts.append(text(16, sy + 14, "Results", size=14, fill=TEXT, weight="bold"))
    sy += 28
    stat_data = [
        ("✓ FITS",   GREEN),
        ("40GP",     BLUE),
        ("Vol 72%",  BLUE),
        ("Wt 22%",   ORANGE),
    ]
    for i, (lbl, color) in enumerate(stat_data):
        cx2 = 8 + (i % 2) * 184
        cy2 = sy + (i // 2) * 70
        parts.append(card(cx2, cy2, 176, 60, fill=BG, stroke=color))
        parts.append(text(cx2 + 88, cy2 + 36, lbl, size=15, fill=color,
                          weight="bold", anchor="middle"))
    sy += 148

    # Progress bars
    parts.append(text(16, sy + 14, "Volume", size=10, fill=TEXT_MUTED))
    parts.append(progress_bar(72, sy + 2, 263, 18, 72, BLUE, value_label="72.1%"))
    sy += 30
    parts.append(text(16, sy + 14, "Payload", size=10, fill=TEXT_MUTED))
    parts.append(progress_bar(72, sy + 2, 263, 18, 22, ORANGE, value_label="22.0%"))
    sy += 36

    # Action box
    parts.append(rect(8, sy, 359, 30, fill=BLUE_LIGHT, stroke=BLUE, rx=4))
    parts.append(text(16, sy + 19, "Healthy planning range.", size=11, fill=BLUE, weight="bold"))
    sy += 40

    # Detail section header (collapsed accordion)
    parts.append(rect(8, sy, 359, 32, fill=BOX_FILL, stroke=BOX_STROKE, rx=4))
    parts.append(text(20, sy + 20, "Show supporting details  ▼",
                       size=11, fill=TEXT_MUTED))

    parts.append(watermark_label(W, H, "Option B — Mobile  375×812"))
    parts.append(svg_close())
    return "".join(parts)


# ══════════════════════════════════════════════════════════════════════════════
# OPTION C — THE STEPPER
# ══════════════════════════════════════════════════════════════════════════════

def option_c_desktop() -> str:
    W, H = 1280, 800
    parts = [svg_open(W, H)]

    # Header
    parts.append(header_bar(W, 56))

    # Step indicator bar
    bar_y = 56
    parts.append(rect(0, bar_y, W, 64, fill=PANEL_BG, stroke=BORDER, rx=0))
    parts.append(step_indicator(
        (W - 600) // 2, bar_y + 8,
        [("Dimensions", "done"), ("Container", "done"), ("Results", "active")],
        total_w=600
    ))

    # Main content centered
    cx = (W - 720) // 2
    y = 140

    # ── Result card ──
    parts.append(card(cx, y, 720, 80, fill=GREEN_LIGHT, stroke=GREEN))
    parts.append(text(W // 2, y + 36,
                       "✓  YOUR SHIPMENT FITS",
                       size=28, fill=GREEN, weight="bold", anchor="middle"))
    parts.append(text(W // 2, y + 62,
                       "Best option: 40GP  —  Book this container",
                       size=13, fill=TEXT_MUTED, anchor="middle"))

    y += 96

    # 2 metric cards
    card_w = (720 - 16) // 2
    metrics = [
        ("Volume Utilization",  "72.1%", "Healthy — within recommended range", BLUE),
        ("Payload Utilization", "22.0%", "OK — well under maximum weight",      ORANGE),
    ]
    for i, (title, value, sub, color) in enumerate(metrics):
        mx = cx + i * (card_w + 16)
        parts.append(card(mx, y, card_w, 80, fill=BG, stroke=color))
        parts.append(progress_bar(mx + 10, y + 14, card_w - 80, 14,
                                    int(float(value[:-1])), color))
        parts.append(text(mx + card_w - 12, y + 27, value, size=16,
                          fill=color, weight="bold", anchor="end"))
        parts.append(text(mx + 10, y + 48, title, size=11, fill=TEXT))
        parts.append(text(mx + 10, y + 66, sub, size=10, fill=TEXT_MUTED))

    y += 96

    # Action card
    parts.append(card(cx, y, 720, 48, fill=BLUE_LIGHT, stroke=BLUE))
    parts.append(text(cx + 16, y + 18, "Healthy planning range. Ready to book.",
                       size=13, fill=BLUE, weight="bold"))
    parts.append(text(cx + 16, y + 36, "Volume and payload utilization are both in optimal range.",
                       size=11, fill=BLUE))
    y += 64

    # Detail accordion (collapsed)
    parts.append(rect(cx, y, 720, 38, fill=BOX_FILL, stroke=BOX_STROKE, rx=6))
    parts.append(text(cx + 16, y + 24, "Show supporting details  ▼",
                       size=12, fill=TEXT_MUTED))
    parts.append(text(cx + 690, y + 24, "48.0 CBM  /  14,400 kg",
                       size=11, fill=TEXT_MUTED, anchor="end"))
    y += 54

    # Disclaimer
    parts.append(disclaimer_bar(cx, y, 720, 30))
    y += 46

    # Button row
    parts.append(secondary_button(cx, y, 340, 40, "←  Back / Recalculate"))
    parts.append(secondary_button(cx + 356, y, 364, 40,
                                    "Download Report  [Coming v1.1]", disabled=True))

    y += 58

    # Step progress dots
    for i, (state, color) in enumerate([(GREEN, GREEN), (GREEN, GREEN), (BLUE, BLUE)]):
        dx = W // 2 - 24 + i * 24
        parts.append(f'<circle cx="{dx}" cy="{y}" r="7" fill="{color}" stroke="{color}" stroke-width="2"/>\n')
        if i < 2:
            parts.append(line(dx + 7, y, dx + 17, y, stroke=GREEN, stroke_width=2))

    parts.append(watermark_label(W, H, "Option C — Desktop  1280×800"))
    parts.append(svg_close())
    return "".join(parts)


def option_c_mobile() -> str:
    W, H = 375, 812
    parts = [svg_open(W, H)]

    # Header + step dots
    parts.append(header_bar(W, 48, show_hamburger=True))

    # Step dots (3 dots, step 3 active)
    dot_y = 70
    dot_cx = W // 2 - 24
    for i, (fill, stroke) in enumerate([(GREEN, GREEN), (GREEN, GREEN), (BLUE, BLUE)]):
        parts.append(f'<circle cx="{dot_cx + i * 24}" cy="{dot_y}" r="8" fill="{fill}" stroke="{stroke}" stroke-width="2"/>\n')
        parts.append(text(dot_cx + i * 24, dot_y + 5, str(i + 1),
                          size=9, fill=BLUE_BTN_T, anchor="middle"))
        if i < 2:
            parts.append(line(dot_cx + i * 24 + 8, dot_y,
                              dot_cx + i * 24 + 16, dot_y, stroke=GREEN, stroke_width=2))

    y = 90

    # Big verdict
    parts.append(rect(8, y, 359, 72, fill=GREEN_LIGHT, stroke=GREEN, rx=8))
    parts.append(text(W // 2, y + 38, "✓  FITS", size=36, fill=GREEN,
                       weight="bold", anchor="middle"))
    parts.append(text(W // 2, y + 60, "40GP  —  Recommended",
                       size=12, fill=TEXT_MUTED, anchor="middle"))
    y += 82

    # Volume bar
    parts.append(text(16, y + 14, "Volume", size=11, fill=TEXT_MUTED))
    parts.append(progress_bar(80, y, 255, 20, 72, BLUE, value_label="72.1%"))
    parts.append(text(W - 12, y + 14, "HEALTHY", size=9, fill=GREEN,
                       weight="bold", anchor="end"))
    y += 36

    # Payload bar
    parts.append(text(16, y + 14, "Payload", size=11, fill=TEXT_MUTED))
    parts.append(progress_bar(80, y, 255, 20, 22, ORANGE, value_label="22.0%"))
    y += 40

    # Action card
    parts.append(card(8, y, 359, 44, fill=BLUE_LIGHT, stroke=BLUE))
    parts.append(text(20, y + 18, "Healthy planning range.", size=12,
                       fill=BLUE, weight="bold"))
    parts.append(text(20, y + 34, "Ready to book your 40GP container.", size=10, fill=BLUE))
    y += 56

    # Detail accordion
    parts.append(rect(8, y, 359, 36, fill=BOX_FILL, stroke=BOX_STROKE, rx=4))
    parts.append(text(20, y + 22, "Show supporting details  ▼",
                       size=11, fill=TEXT_MUTED))
    y += 46

    # Disclaimer compact
    parts.append(rect(8, y, 359, 26, fill=YELLOW_BG, stroke=YELLOW_STR, rx=3))
    parts.append(text(16, y + 17, "⚠  Planning estimate only. Verify with forwarder.",
                       size=9, fill=YELLOW_STR))
    y += 36

    # Recalculate button
    parts.append(secondary_button(8, y, 359, 40, "←  Recalculate"))
    y += 50

    # Download Report (disabled)
    parts.append(secondary_button(8, y, 359, 40,
                                    "Download Report  [Coming v1.1]", disabled=True))

    parts.append(watermark_label(W, H, "Option C — Mobile  375×812"))
    parts.append(svg_close())
    return "".join(parts)


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    wireframes = {
        "option-a-desktop.svg": option_a_desktop,
        "option-a-mobile.svg":  option_a_mobile,
        "option-b-desktop.svg": option_b_desktop,
        "option-b-mobile.svg":  option_b_mobile,
        "option-c-desktop.svg": option_c_desktop,
        "option-c-mobile.svg":  option_c_mobile,
    }

    for filename, generator in wireframes.items():
        path = OUTPUT_DIR / filename
        svg_content = generator()
        path.write_text(svg_content, encoding="utf-8")
        size_kb = len(svg_content) / 1024
        print(f"  ✓  {filename}  ({size_kb:.1f} KB)  →  {path}")

    print(f"\nAll 6 wireframes saved to:\n  {OUTPUT_DIR}\n")


if __name__ == "__main__":
    main()
