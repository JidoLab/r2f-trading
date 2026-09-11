# -*- coding: utf-8 -*-
"""Stamp a hook line and date onto the live-stream thumbnail base.

Usage:
    python scripts/stamp-thumbnail.py "<hook text>" "<date label>" <out.png>

Looks for public/stream-thumb-base.png (1280x720). If it is missing, draws a
plain navy/gold base so the pipeline works on day one. Replace the base with a
designed one later (prompt in docs/youtube-live-stream-setup.md) and nothing
else changes.

Layout: text occupies the left ~58% so a chart or webcam framing on the right
of the base stays visible. Hook wraps to at most two lines and the font shrinks
until it fits. A red LIVE pill sits under the hook, the date in gold beneath.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
NAVY = (13, 33, 55)
NAVY_DARK = (7, 18, 32)
GOLD = (201, 168, 76)
RED = (214, 40, 40)
WHITE = (255, 255, 255)

FONT_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
IMPACT = os.path.join(FONT_DIR, "impact.ttf")
ARIAL_B = os.path.join(FONT_DIR, "arialbd.ttf")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "public", "stream-thumb-base.png")

TEXT_LEFT = 64
TEXT_RIGHT = int(W * 0.58)
TEXT_WIDTH = TEXT_RIGHT - TEXT_LEFT


def fallback_base() -> Image.Image:
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    # subtle vertical gradient
    for y in range(H):
        t = y / H
        c = tuple(int(NAVY[i] * (1 - t) + NAVY_DARK[i] * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    # gold rule across the bottom and a brand mark
    d.rectangle([0, H - 14, W, H], fill=GOLD)
    brand = ImageFont.truetype(ARIAL_B, 34)
    d.text((W - 64, 44), "R2F TRADING", font=brand, fill=GOLD, anchor="ra")
    return img


def wrap(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit_font(draw, text, max_w, max_lines=2, start=132, floor=64):
    size = start
    while size >= floor:
        font = ImageFont.truetype(IMPACT, size)
        lines = wrap(draw, text, font, max_w)
        if len(lines) <= max_lines and all(draw.textlength(l, font=font) <= max_w for l in lines):
            return font, lines
        size -= 6
    font = ImageFont.truetype(IMPACT, floor)
    return font, wrap(draw, text, font, max_w)[:max_lines]


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    hook, date_label, out = sys.argv[1].upper(), sys.argv[2], sys.argv[3]

    img = Image.open(BASE).convert("RGB").resize((W, H)) if os.path.exists(BASE) else fallback_base()
    d = ImageDraw.Draw(img)

    font, lines = fit_font(d, hook, TEXT_WIDTH)
    line_h = int(font.size * 1.02)
    total_h = line_h * len(lines)
    y = int(H * 0.30) - total_h // 2

    # hook lines with a hard shadow so they read over any base image
    for line in lines:
        d.text((TEXT_LEFT + 5, y + 5), line, font=font, fill=(0, 0, 0))
        d.text((TEXT_LEFT, y), line, font=font, fill=WHITE)
        y += line_h

    # LIVE pill
    y += 22
    pill_font = ImageFont.truetype(IMPACT, 52)
    label = "LIVE  NQ  TRADING"
    tw = d.textlength(label, font=pill_font)
    d.rounded_rectangle([TEXT_LEFT, y, TEXT_LEFT + tw + 44, y + 74], radius=10, fill=RED)
    d.text((TEXT_LEFT + 22, y + 8), label, font=pill_font, fill=WHITE)

    # date
    y += 96
    date_font = ImageFont.truetype(ARIAL_B, 40)
    d.text((TEXT_LEFT, y), date_label.upper(), font=date_font, fill=GOLD)

    img.save(out, "PNG", optimize=True)
    print(f"thumbnail -> {out} ({os.path.getsize(out) // 1024} KB, base={'custom' if os.path.exists(BASE) else 'fallback'})")


if __name__ == "__main__":
    main()
