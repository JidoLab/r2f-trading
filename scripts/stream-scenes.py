# -*- coding: utf-8 -*-
"""Generate the static XSplit scene images for the live stream.

    python scripts/stream-scenes.py

Writes 1920x1080 PNGs to public/stream/: starting-soon, break, ending, plus a
transparent lower-third badge (playbook link) for the Live scene. Same navy and
gold as the thumbnails so everything matches.
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
NAVY = (13, 33, 55)
NAVY_DARK = (7, 18, 32)
GOLD = (201, 168, 76)
WHITE = (255, 255, 255)
GREY = (170, 180, 195)
RED = (214, 40, 40)

FONT_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
IMPACT = os.path.join(FONT_DIR, "impact.ttf")
ARIAL_B = os.path.join(FONT_DIR, "arialbd.ttf")
ARIAL = os.path.join(FONT_DIR, "arial.ttf")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "stream")


def base():
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(NAVY[i] * (1 - t) + NAVY_DARK[i] * t) for i in range(3)))
    # faint grid so it reads as a trading brand, not a blank slide
    for x in range(0, W, 120):
        d.line([(x, 0), (x, H)], fill=(18, 40, 64))
    for y in range(0, H, 120):
        d.line([(0, y), (W, y)], fill=(18, 40, 64))
    d.rectangle([0, H - 18, W, H], fill=GOLD)
    d.text((W - 90, 60), "R2F TRADING", font=ImageFont.truetype(ARIAL_B, 44), fill=GOLD, anchor="ra")
    return img, d


def centered(d, y, text, font, fill):
    d.text((W // 2 + 6, y + 6), text, font=font, fill=(0, 0, 0), anchor="ma")
    d.text((W // 2, y), text, font=font, fill=fill, anchor="ma")


def footer(d):
    d.text((W // 2, H - 90), "t.me/Road2Funded    |    r2ftrading.com", font=ImageFont.truetype(ARIAL_B, 40), fill=GREY, anchor="ma")


def starting_soon():
    img, d = base()
    centered(d, 250, "NQ LIVE", ImageFont.truetype(IMPACT, 260), WHITE)
    centered(d, 540, "LONDON SESSION", ImageFont.truetype(IMPACT, 110), GOLD)
    pill_font = ImageFont.truetype(IMPACT, 56)
    label = "STARTING SHORTLY"
    tw = d.textlength(label, font=pill_font)
    x0 = (W - tw) // 2 - 30
    d.rounded_rectangle([x0, 720, x0 + tw + 60, 800], radius=12, fill=RED)
    d.text((W // 2, 730), label, font=pill_font, fill=WHITE, anchor="ma")
    footer(d)
    img.save(os.path.join(OUT, "starting-soon.png"), optimize=True)


def brb():
    img, d = base()
    centered(d, 330, "BACK IN A", ImageFont.truetype(IMPACT, 200), WHITE)
    centered(d, 550, "FEW MINUTES", ImageFont.truetype(IMPACT, 200), GOLD)
    centered(d, 800, "Mic is off. Chart is still running.", ImageFont.truetype(ARIAL, 44), GREY)
    footer(d)
    img.save(os.path.join(OUT, "break.png"), optimize=True)


def ending():
    img, d = base()
    centered(d, 150, "THANKS FOR WATCHING", ImageFont.truetype(IMPACT, 150), WHITE)
    lab = ImageFont.truetype(ARIAL_B, 40)
    val = ImageFont.truetype(ARIAL_B, 58)
    rows = [
        ("FREE ICT PLAYBOOK", "r2ftrading.com/free-class"),
        ("FREE 15 MIN CALL", "r2ftrading.com/contact"),
        ("SAME TIME TOMORROW", "London session, 8 AM London / 2 PM Bangkok"),
    ]
    y = 400
    for k, v in rows:
        d.text((W // 2, y), k, font=lab, fill=GOLD, anchor="ma")
        d.text((W // 2, y + 52), v, font=val, fill=WHITE, anchor="ma")
        y += 190
    footer(d)
    img.save(os.path.join(OUT, "ending.png"), optimize=True)


def badge():
    # transparent lower third for the Live scene, bottom left
    bw, bh = 640, 78
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=14, fill=(7, 18, 32, 215), outline=GOLD + (255,), width=2)
    d.text((22, 16), "FREE PLAYBOOK", font=ImageFont.truetype(ARIAL_B, 26), fill=GOLD)
    d.text((22, 44), "r2ftrading.com/free-class", font=ImageFont.truetype(ARIAL_B, 24), fill=WHITE)
    d.rectangle([bw - 150, 18, bw - 22, 60], fill=RED + (255,))
    d.text((bw - 86, 24), "LIVE", font=ImageFont.truetype(IMPACT, 32), fill=WHITE, anchor="ma")
    img.save(os.path.join(OUT, "badge.png"), optimize=True)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    starting_soon(); brb(); ending(); badge()
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, "KB")
