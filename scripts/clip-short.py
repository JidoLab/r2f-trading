# -*- coding: utf-8 -*-
"""Cut a Short from a stream recording (or a replay) and optionally upload it.

    python scripts/clip-short.py <source> <start> --title "Hook text" [options]

    source   local recording (C:\\Stream\\recordings\\2026-09-22.mp4) or a
             YouTube video id / URL (needs --cookies, see below)
    start    hh:mm:ss or mm:ss into the source

Options:
    --len 45             clip length in seconds (max 60)
    --title "..."        the words on screen and the YouTube title
    --upload             upload to YouTube as a Short (public unless --unlisted)
    --unlisted
    --cookies FILE       Netscape cookies.txt for replay downloads. YouTube
                         bot-checks yt-dlp, so download the replay only if a
                         local recording is not available. Export cookies with
                         the "Get cookies.txt LOCALLY" browser extension.
    --out FILE           output path (default .tmp/clips/<timestamp>.mp4)

Output: 1080x1920, navy frame, the hook in Impact at the top, the 16:9 video
in the middle, "LIVE EVERY WEEKDAY, 8 AM LONDON  r2ftrading.com/live" at the
bottom. 30 fps, H.264, AAC. Runs in about a minute on a 45 s clip.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = os.path.join(ROOT, ".tmp", "clips")
W, H = 1080, 1920
NAVY = (11, 26, 43)
GOLD = (201, 168, 76)
WHITE = (255, 255, 255)
MUTED = (170, 180, 195)
FONT_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
IMPACT = os.path.join(FONT_DIR, "impact.ttf")
ARIAL_B = os.path.join(FONT_DIR, "arialbd.ttf")
VIDEO_TOP = 620          # y of the 1080x608 video window
VIDEO_H = 608
SITE = "https://www.r2ftrading.com"


def env(key: str) -> str:
    with open(os.path.join(ROOT, ".env.local"), encoding="utf-8") as f:
        for line in f:
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip()
    raise SystemExit(f"{key} missing from .env.local")


def to_seconds(t: str) -> float:
    parts = [float(p) for p in t.split(":")]
    while len(parts) < 3:
        parts.insert(0, 0)
    return parts[0] * 3600 + parts[1] * 60 + parts[2]


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"command failed: {' '.join(cmd[:3])}...\n{r.stderr[-1200:]}")


def fetch_source(source: str, start: float, length: int, cookies: str | None) -> str:
    """Return a local file holding just the wanted section."""
    os.makedirs(TMP, exist_ok=True)
    cut = os.path.join(TMP, "src-cut.mp4")
    if os.path.exists(source):
        run(["ffmpeg", "-y", "-v", "error", "-ss", str(start), "-t", str(length), "-i", source,
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "160k", cut])
        return cut
    m = re.search(r"(?:v=|youtu\.be/|^)([A-Za-z0-9_-]{11})(?:$|&|\?)", source)
    if not m:
        raise SystemExit("source is neither a file nor a YouTube id/url")
    vid = m.group(1)
    end = start + length
    cmd = ["yt-dlp", "-q", "--no-warnings", "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
           "--download-sections", f"*{start}-{end}", "--force-keyframes-at-cuts", "-o", cut]
    if cookies:
        cmd += ["--cookies", cookies]
    cmd.append(f"https://www.youtube.com/watch?v={vid}")
    if os.path.exists(cut):
        os.remove(cut)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(cut):
        hint = " YouTube refused the download; pass --cookies cookies.txt or use the local XSplit recording." if "Sign in" in r.stderr else ""
        raise SystemExit(f"yt-dlp failed: {r.stderr[-600:]}{hint}")
    return cut


def fit_lines(draw: ImageDraw.ImageDraw, text: str, max_w: int, start: int = 118, floor: int = 64, max_lines: int = 4):
    size = start
    while size >= floor:
        font = ImageFont.truetype(IMPACT, size)
        words, lines, cur = text.upper().split(), [], ""
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
        if len(lines) <= max_lines:
            return font, lines
        size -= 6
    font = ImageFont.truetype(IMPACT, floor)
    return font, lines[:max_lines]


def make_frame(title: str) -> str:
    """Transparent overlay: title above the video window, footer below it."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font, lines = fit_lines(d, title, W - 120)
    line_h = int(font.size * 1.06)
    block_h = line_h * len(lines)
    y = max(80, (VIDEO_TOP - block_h) // 2 - 20)
    for line in lines:
        d.text((W // 2 + 5, y + 5), line, font=font, fill=(0, 0, 0, 255), anchor="ma")
        d.text((W // 2, y), line, font=font, fill=WHITE + (255,), anchor="ma")
        y += line_h
    # gold rule above the video, thin
    d.rectangle([60, VIDEO_TOP - 14, W - 60, VIDEO_TOP - 10], fill=GOLD + (255,))
    # footer
    fy = VIDEO_TOP + VIDEO_H + 90
    d.text((W // 2, fy), "LIVE EVERY WEEKDAY", font=ImageFont.truetype(IMPACT, 72), fill=GOLD + (255,), anchor="ma")
    d.text((W // 2, fy + 90), "8 AM LONDON  |  2 PM BANGKOK", font=ImageFont.truetype(ARIAL_B, 40), fill=WHITE + (255,), anchor="ma")
    d.text((W // 2, fy + 160), "r2ftrading.com/live", font=ImageFont.truetype(ARIAL_B, 46), fill=WHITE + (255,), anchor="ma")
    d.text((W // 2, H - 120), "R2F TRADING", font=ImageFont.truetype(ARIAL_B, 34), fill=MUTED + (255,), anchor="ma")
    d.text((W // 2, H - 70), "Not financial advice", font=ImageFont.truetype(ARIAL_B, 26), fill=MUTED + (255,), anchor="ma")
    path = os.path.join(TMP, "frame.png")
    img.save(path)
    return path


def render(src: str, frame: str, out: str) -> None:
    navy = "0x%02x%02x%02x" % NAVY
    filt = (
        f"[0:v]scale=1080:-2:flags=lanczos,fps=30,"
        f"pad=1080:1920:0:{VIDEO_TOP}:{navy}[base];"
        f"[base][1:v]overlay=0:0:format=auto[v]"
    )
    run(["ffmpeg", "-y", "-v", "error", "-i", src, "-loop", "1", "-i", frame, "-filter_complex", filt,
         "-map", "[v]", "-map", "0:a?", "-shortest", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out])


def upload(path: str, title: str, unlisted: bool) -> str:
    tok = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=urllib.parse.urlencode({"client_id": env("YOUTUBE_CLIENT_ID"), "client_secret": env("YOUTUBE_CLIENT_SECRET"),
                                     "refresh_token": env("YOUTUBE_REFRESH_TOKEN"), "grant_type": "refresh_token"}).encode())))["access_token"]
    description = (
        f"{title}\n\nFrom the live NQ session. Harvest trades the London open every weekday using ICT concepts, entries and stops out loud.\n\n"
        f"Watch live, schedule in your time zone: {SITE}/live\nFree ICT Funded-Trader Playbook: {SITE}/free-class\n\n"
        "Futures trading carries substantial risk. Nothing here is financial advice.\n\n#Shorts #nq #ict #livetrading #daytrading"
    )
    meta = {
        "snippet": {"title": (title[:90] + " #Shorts"), "description": description, "categoryId": "27",
                    "tags": ["nq", "ict", "live trading", "day trading", "nasdaq futures", "ict concepts", "shorts"], "defaultLanguage": "en"},
        "status": {"privacyStatus": "unlisted" if unlisted else "public", "selfDeclaredMadeForKids": False},
    }
    size = os.path.getsize(path)
    init = urllib.request.Request(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        data=json.dumps(meta).encode(), method="POST",
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8",
                 "X-Upload-Content-Length": str(size), "X-Upload-Content-Type": "video/mp4"})
    with urllib.request.urlopen(init) as r:
        location = r.headers["Location"]
    with open(path, "rb") as f:
        data = f.read()
    put = urllib.request.Request(location, data=data, method="PUT",
                                 headers={"Authorization": f"Bearer {tok}", "Content-Type": "video/mp4", "Content-Length": str(size)})
    with urllib.request.urlopen(put) as r:
        j = json.load(r)
    return j["id"]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source")
    ap.add_argument("start")
    ap.add_argument("--title", required=True)
    ap.add_argument("--len", type=int, default=45)
    ap.add_argument("--upload", action="store_true")
    ap.add_argument("--unlisted", action="store_true")
    ap.add_argument("--cookies")
    ap.add_argument("--out")
    a = ap.parse_args()
    if a.len > 60:
        raise SystemExit("Shorts are 60 seconds or less")

    os.makedirs(TMP, exist_ok=True)
    out = a.out or os.path.join(TMP, time.strftime("short-%Y%m%d-%H%M%S") + ".mp4")
    t0 = time.time()
    src = fetch_source(a.source, to_seconds(a.start), a.len, a.cookies)
    frame = make_frame(a.title)
    render(src, frame, out)
    print(f"short -> {out} ({os.path.getsize(out) // 1024} KB, {time.time() - t0:.0f}s)")
    if a.upload:
        vid = upload(out, a.title, a.unlisted)
        print(f"uploaded: https://www.youtube.com/shorts/{vid} ({'unlisted' if a.unlisted else 'public'})")


if __name__ == "__main__":
    main()
