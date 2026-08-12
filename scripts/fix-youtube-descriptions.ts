/**
 * Repair YouTube video descriptions across the whole channel.
 *
 * Run:  npm run fix-yt-descriptions
 *
 * What it fixes (from the 2026-08-10 channel audit of all 217 videos):
 *   1. road2fundedtrading.com is dead and returns nothing. 35 videos carrying
 *      8,071 lifetime views (40% of the channel) linked to it, including the
 *      top video at 4,824 views. Repointed to r2ftrading.com.
 *   2. The retired Whop program link (54 videos, 4,891 views) is presented as
 *      "Join my private coaching", so it now points at /coaching.
 *   3. No video mentioned the lead magnet and 144 had no site link at all, so
 *      a single CTA block is appended once per description.
 *
 * Safety:
 *   - videos.update REPLACES the whole snippet. Title, categoryId, tags and
 *     the language fields are read back and resent unchanged; omitting tags
 *     would silently wipe them.
 *   - Idempotent by diffing live text against desired text, so re-running only
 *     touches what still needs changing. Safe to run repeatedly.
 *   - defaultAudioLanguage "zxx" (no linguistic content) is readable but the
 *     API rejects it on write, so it is omitted from the payload.
 *   - Original metadata for every video is in data/youtube-metadata-backup.json.
 *
 * Quota: videos.update costs 50 units against a 10,000/day default, so about
 * 199 videos land per day. Highest-view videos go first; re-run the next day
 * (quota resets at midnight Pacific) to finish the remainder.
 */
import fs from "fs";
import path from "path";

const DEAD_DOMAIN = "road2fundedtrading.com";
const WHOP = "https://whop.com/r2f-2/";
const WHOP_REPLACEMENT = "https://www.r2ftrading.com/coaching";
const MARKER = "FREE: The ICT Funded-Trader Playbook";

// Retired contact addresses. coach@r2ftrading.com appears in 34 descriptions
// and coach@road2fundedtrading.com in one. Current address is the gmail.
const CURRENT_EMAIL = "road2funded@gmail.com";
const OLD_EMAILS = ["coach@road2fundedtrading.com", "coach@r2ftrading.com"];

const CTA = `==============================
FREE: The ICT Funded-Trader Playbook
The 3 setups that actually work, the pre-trade checklist, and the risk rules that pass funded challenges. Instant download.
https://www.r2ftrading.com/free-class

1-on-1 ICT COACHING WITH HARVEST WRIGHT
10+ years trading ICT concepts. Book a free 15-minute discovery call, no pitch:
https://www.r2ftrading.com/contact

More free guides and breakdowns:
https://www.r2ftrading.com/learn`;

interface Snippet {
  title: string;
  description: string;
  categoryId: string;
  tags?: string[];
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}

function env(key: string): string {
  const file = path.join(process.cwd(), ".env.local");
  const line = fs.readFileSync(file, "utf-8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} missing from .env.local`);
  return line.slice(key.length + 1).trim();
}

function desired(desc: string): string {
  let out = desc;
  // Emails first: the longer address contains the dead domain, so swapping it
  // before the domain rewrite avoids turning it into coach@r2ftrading.com.
  for (const old of OLD_EMAILS) out = out.replaceAll(old, CURRENT_EMAIL);
  out = out
    .replaceAll("www." + DEAD_DOMAIN, "www.r2ftrading.com")
    .replaceAll(DEAD_DOMAIN, "r2ftrading.com")
    .replaceAll(WHOP, WHOP_REPLACEMENT)
    .replaceAll(WHOP.replace(/\/$/, ""), WHOP_REPLACEMENT);
  if (!out.includes(MARKER)) out = out.trimEnd() + "\n\n" + CTA + "\n";
  return out;
}

async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("YOUTUBE_CLIENT_ID"),
      client_secret: env("YOUTUBE_CLIENT_SECRET"),
      refresh_token: env("YOUTUBE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error("token refresh failed: " + JSON.stringify(json));
  return json.access_token;
}

async function allVideoIds(key: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = "";
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=UUOJcTd6NQnnaaM5r2dFd-Yg&maxResults=50&key=${key}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const d = await (await fetch(url)).json();
    if (d.error) throw new Error(d.error.message);
    for (const i of d.items) ids.push(i.contentDetails.videoId);
    pageToken = d.nextPageToken || "";
  } while (pageToken);
  return ids;
}

async function main() {
  const key = env("YOUTUBE_API_KEY");
  const token = await accessToken();

  const ids = await allVideoIds(key);
  const snippets = new Map<string, Snippet>();
  const views = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 50) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.slice(i, i + 50).join(",")}&key=${key}`;
    const d = await (await fetch(url)).json();
    if (d.error) throw new Error(d.error.message);
    for (const it of d.items) {
      snippets.set(it.id, it.snippet);
      views.set(it.id, Number(it.statistics?.viewCount ?? 0));
    }
  }

  // Highest-traffic videos first so a quota stop leaves the least value behind.
  const todo = ids
    .filter((id) => snippets.has(id))
    .filter((id) => desired(snippets.get(id)!.description) !== snippets.get(id)!.description)
    .sort((a, b) => (views.get(b) ?? 0) - (views.get(a) ?? 0));

  console.log(`${ids.length} videos on channel, ${todo.length} need updating`);
  let ok = 0;

  for (const id of todo) {
    const s = snippets.get(id)!;
    const payload: Snippet = {
      title: s.title,
      categoryId: s.categoryId,
      description: desired(s.description),
    };
    if (s.tags?.length) payload.tags = s.tags;
    if (s.defaultLanguage) payload.defaultLanguage = s.defaultLanguage;
    if (s.defaultAudioLanguage && s.defaultAudioLanguage !== "zxx") {
      payload.defaultAudioLanguage = s.defaultAudioLanguage;
    }

    const res = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, snippet: payload }),
    });

    if (res.ok) {
      ok++;
      if (ok % 25 === 0) console.log(`  ${ok}/${todo.length}...`);
    } else {
      const body = await res.text();
      console.error(`  FAIL ${id} (${views.get(id)}v): ${res.status} ${body.slice(0, 140)}`);
      if (body.toLowerCase().includes("quota")) {
        console.log("  >> daily quota reached. Re-run after midnight Pacific to finish.");
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\nupdated ${ok}, ${todo.length - ok} still pending`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
