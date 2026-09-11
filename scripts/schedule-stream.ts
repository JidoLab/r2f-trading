/**
 * Create today's scheduled YouTube live broadcast for R2F Trading.
 *
 *   npm run yt-schedule-stream                  dry run: prints the plan, creates nothing
 *   npm run yt-schedule-stream -- --live         actually creates it
 *   npm run yt-schedule-stream -- --live --hook "Fed day, no chasing"
 *   npm run yt-schedule-stream -- --live --at 2026-09-15T13:00:00Z
 *
 * What it does, in order:
 *   1. Finds (or on first run creates) ONE persistent RTMP stream called
 *      "R2F XSplit persistent". XSplit points at this key permanently, so the
 *      key never has to be copied again. The key is printed on first creation.
 *   2. Creates a public scheduled broadcast with the templated title,
 *      description (carrying the standard CTA block), low latency, DVR on,
 *      auto-start and auto-stop on, and binds it to that stream. With
 *      auto-start, pressing Stream in XSplit is the only thing left to do.
 *   3. Sets category to Education and the search tags via videos.update.
 *   4. Stamps the day's thumbnail with scripts/stamp-thumbnail.py and uploads it.
 *
 * Why the title is pre-stream generic: the hook (what happened) is only known
 * afterwards. Edit the title in Studio when the stream ends. The date stays.
 *
 * Quota: about 200 units per run against 10,000/day. Safe to run daily.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const STREAM_TITLE = "R2F XSplit persistent";
// 13:00 UTC = 8:00 PM Bangkok = 30 min before the 9:30 ET New York open while
// US daylight time is in effect (until 1 Nov 2026). After that use 14.
const DEFAULT_START_HOUR_UTC = 13;

const MARKER = "FREE: The ICT Funded-Trader Playbook";
const CTA = `==============================
FREE: The ICT Funded-Trader Playbook
The 3 setups that actually work, the pre-trade checklist, and the risk rules that pass funded challenges. Instant download.
https://www.r2ftrading.com/free-class

1-on-1 ICT COACHING WITH HARVEST WRIGHT
10+ years trading ICT concepts. Book a free 15-minute discovery call, no pitch:
https://www.r2ftrading.com/contact

More free guides and breakdowns:
https://www.r2ftrading.com/learn`;

const TAGS = [
  "nq live trading", "live day trading", "nasdaq futures", "ict live trading",
  "ict concepts", "day trading live", "futures trading live", "smart money concepts",
  "new york open", "nq futures", "live trading", "r2f trading",
];

function env(key: string): string {
  const line = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8")
    .split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} missing from .env.local`);
  return line.slice(key.length + 1).trim();
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function nextWeekdayAt(hourUtc: number): Date {
  const d = new Date();
  d.setUTCHours(hourUtc, 0, 0, 0);
  if (d.getTime() < Date.now() + 15 * 60 * 1000) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
}

function buildTitle(hook: string | undefined, d: Date): string {
  const base = hook
    ? `${hook} | NQ Live Trading | ICT | ${dateLabel(d)}`
    : `NQ Live Trading: New York Open | ICT Concepts | ${dateLabel(d)}`;
  return base.slice(0, 100);
}

function buildDescription(d: Date): string {
  return `Live NQ futures trading at the New York open, every weekday, using ICT concepts. Real entries, real stops, wins and losses on the chart as they happen. No hindsight replays.

Stream starts 30 minutes before the 9:30 ET open and runs through the New York AM session.

What I cover live:
- Higher timeframe bias and the levels that matter today
- Where the liquidity is resting and which side I expect to get taken
- Live entries with the reasoning said out loud, and the ones I skip
- Risk per trade, stop placement, and why

Ask questions in chat. I answer between setups.

Telegram: https://t.me/Road2Funded
TradingView: https://www.tradingview.com/u/Road_2_Funded/
Site: https://www.r2ftrading.com

${CTA}

Risk disclosure: Futures and forex trading carry substantial risk and are not suitable for every investor. You can lose more than your initial deposit. Nothing on this stream is financial advice. Past performance does not indicate future results. Trade only with risk capital.

#nq #livetrading #ict #daytrading #futures`;
}

async function token(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("YOUTUBE_CLIENT_ID"), client_secret: env("YOUTUBE_CLIENT_SECRET"),
      refresh_token: env("YOUTUBE_REFRESH_TOKEN"), grant_type: "refresh_token",
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("token refresh failed: " + JSON.stringify(j));
  return j.access_token;
}

async function yt(tok: string, method: string, url: string, body?: unknown, raw?: { bytes: Buffer; type: string }) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": raw ? raw.type : "application/json",
    },
    body: raw ? new Uint8Array(raw.bytes) : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let j: { error?: { message?: string; errors?: { reason?: string }[] } } = {};
  try { j = JSON.parse(text); } catch { /* thumbnails.set can return empty */ }
  if (!res.ok) {
    const reason = j.error?.errors?.[0]?.reason;
    throw new Error(`${method} ${url.split("?")[0]} -> ${res.status} ${reason || ""} ${j.error?.message || text.slice(0, 200)}`);
  }
  return j as Record<string, unknown>;
}

async function main() {
  const live = process.argv.includes("--live");
  const hook = arg("--hook");
  const at = arg("--at");
  const start = at ? new Date(at) : nextWeekdayAt(DEFAULT_START_HOUR_UTC);
  if (isNaN(start.getTime())) throw new Error("bad --at value");

  const title = buildTitle(hook, start);
  const description = buildDescription(start);
  const label = dateLabel(start);

  console.log(live ? "MODE: LIVE (will create)" : "MODE: DRY RUN (nothing is created; add --live)");
  console.log(`start : ${start.toISOString()}  (${start.toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })} Bangkok)`);
  console.log(`title : ${title}  (${title.length} chars)`);
  console.log(`desc  : ${description.split("\n")[0].slice(0, 80)}...  [CTA block ${description.includes(MARKER) ? "present" : "MISSING"}]`);

  const tok = await token();

  // 1. persistent stream
  //
  // liveStreams.list with mine=true returns 500 on this channel whenever the
  // part includes snippet or cdn, yet every one of the 14 old stream objects
  // reads fine when fetched by id. So: list ids (works), fetch each stream
  // individually, tolerate any that 500. Once the persistent stream exists its
  // id is cached in data/youtube-stream.json so later runs skip the listing.
  type Stream = { id: string; snippet: { title: string }; cdn: { ingestionInfo: { streamName: string; ingestionAddress: string } } };
  const cachePath = path.join(process.cwd(), "data", "youtube-stream.json");
  let stream: Stream | undefined;

  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as { id: string };
    try {
      const one = await yt(tok, "GET", `https://www.googleapis.com/youtube/v3/liveStreams?part=id,snippet,cdn&id=${cached.id}`) as { items?: Stream[] };
      stream = one.items?.[0];
    } catch { /* fall through to scan */ }
  }

  if (!stream) {
    const ids = await yt(tok, "GET", "https://www.googleapis.com/youtube/v3/liveStreams?part=id&mine=true&maxResults=50") as { items?: { id: string }[] };
    let broken = 0;
    for (const { id } of ids.items || []) {
      try {
        const one = await yt(tok, "GET", `https://www.googleapis.com/youtube/v3/liveStreams?part=id,snippet,cdn&id=${id}`) as { items?: Stream[] };
        const s = one.items?.[0];
        if (s?.snippet.title === STREAM_TITLE) { stream = s; break; }
      } catch (e) {
        if (String(e).includes("500")) broken++; else throw e;
      }
    }
    console.log(`stream: scanned ${(ids.items || []).length} existing stream objects${broken ? ` (${broken} unreadable, skipped)` : ""}`);
  }

  if (!stream) {
    console.log(`stream: none named "${STREAM_TITLE}" yet`);
    if (!live) {
      console.log("        would create a persistent 1080p/30fps RTMP stream and print its key");
    } else {
      stream = await yt(tok, "POST", "https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,contentDetails,status", {
        snippet: { title: STREAM_TITLE },
        cdn: { frameRate: "30fps", ingestionType: "rtmp", resolution: "1080p" },
        contentDetails: { isReusable: true },
      }) as unknown as Stream;
      console.log("        CREATED. Paste these into XSplit once (Custom RTMP) and keep the key private:");
      console.log(`        server : ${stream.cdn.ingestionInfo.ingestionAddress}`);
      console.log(`        key    : ${stream.cdn.ingestionInfo.streamName}`);
    }
  } else {
    console.log(`stream: reusing "${STREAM_TITLE}" (${stream.id})`);
  }
  if (stream) fs.writeFileSync(cachePath, JSON.stringify({ id: stream.id, title: STREAM_TITLE }, null, 2) + "\n");

  // 2. thumbnail (stamped locally either way so the dry run shows the file)
  const outDir = path.join(process.cwd(), ".tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const thumb = path.join(outDir, `stream-thumb-${start.toISOString().slice(0, 10)}.png`);
  execSync(`python "${path.join("scripts", "stamp-thumbnail.py")}" "${(hook || "New York Open Live").replace(/"/g, "")}" "${label}" "${thumb}"`, { stdio: "inherit" });

  if (!live) {
    console.log("\nDry run complete. Re-run with --live to create the broadcast.");
    return;
  }

  // 3. broadcast
  const bc = await yt(tok, "POST", "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails", {
    snippet: { title, description, scheduledStartTime: start.toISOString() },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    contentDetails: {
      enableAutoStart: true, enableAutoStop: true, enableDvr: true, recordFromStart: true,
      latencyPreference: "low", enableEmbed: true,
    },
  }) as { id: string };
  console.log(`broadcast: created ${bc.id}`);

  // 4. bind to the persistent stream
  await yt(tok, "POST", `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?part=id&id=${bc.id}&streamId=${stream!.id}`);
  console.log("bound to persistent stream");

  // 5. category + tags. videos.update replaces the snippet wholesale, so title
  //    and description are resent to keep them.
  await yt(tok, "PUT", "https://www.googleapis.com/youtube/v3/videos?part=snippet", {
    id: bc.id, snippet: { title, description, categoryId: "27", tags: TAGS },
  });
  console.log("category Education + tags set");

  // 6. thumbnail
  await yt(tok, "POST", `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${bc.id}&uploadType=media`,
    undefined, { bytes: fs.readFileSync(thumb), type: "image/png" });
  console.log("thumbnail uploaded");

  console.log(`\nDone. https://youtu.be/${bc.id}`);
  console.log("At stream time: open XSplit, press Stream. Auto-start takes it from there.");
  console.log("After: edit the title in Studio to say what happened, then npm run fix-yt-descriptions.");
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
