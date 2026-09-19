/**
 * Finish a stream replay by hand: chapters from the scoreboard log and a
 * result-based title.
 *
 *   npm run yt-finish-replay -- <videoId>            dry run, prints the result
 *   npm run yt-finish-replay -- <videoId> --live     writes it to YouTube
 *   npm run yt-finish-replay -- <videoId> --live --session <git-commit>
 *
 * Uses data/live-session.json as the session unless --session names a commit
 * to read it from (git show <commit>:data/live-session.json), which is how an
 * older day is recovered. The replay poster cron does the same thing
 * automatically at 5:30 PM Bangkok for the day's stream.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { finishSnippet, dateLabelBangkok, type VideoSnippet } from "../src/lib/replay-finish";
import type { LiveSession } from "../src/lib/live-session";

const LIVE = process.argv.includes("--live");
const videoId = process.argv[2];
const sessionArgIdx = process.argv.indexOf("--session");
const sessionCommit = sessionArgIdx >= 0 ? process.argv[sessionArgIdx + 1] : null;

function env(key: string): string {
  const line = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8").split(/\r?\n/).find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} missing from .env.local`);
  return line.slice(key.length + 1).trim();
}

async function token(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("YOUTUBE_CLIENT_ID"), client_secret: env("YOUTUBE_CLIENT_SECRET"), refresh_token: env("YOUTUBE_REFRESH_TOKEN"), grant_type: "refresh_token" }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("token refresh failed");
  return j.access_token;
}

async function main() {
  if (!videoId || videoId.startsWith("--")) throw new Error("usage: npm run yt-finish-replay -- <videoId> [--live] [--session <commit>]");
  const raw = sessionCommit
    ? execSync(`git show ${sessionCommit}:data/live-session.json`, { encoding: "utf-8" })
    : fs.readFileSync(path.join(process.cwd(), "data", "live-session.json"), "utf-8");
  const session = JSON.parse(raw) as LiveSession;

  const tok = await token();
  const H = { Authorization: `Bearer ${tok}` };
  const bc = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&id=${videoId}`, { headers: H }).then((r) => r.json());
  const actualStart: string | undefined = bc.items?.[0]?.snippet?.actualStartTime;
  if (!actualStart) throw new Error("no broadcast with an actual start time for that id");
  const vid = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`, { headers: H }).then((r) => r.json());
  const snippet = vid.items?.[0]?.snippet as VideoSnippet & { defaultAudioLanguage?: string };
  if (!snippet) throw new Error("video not found");

  const dateLabel = dateLabelBangkok(actualStart);
  if (session.date !== new Date(actualStart).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })) {
    console.warn(`warning: session date ${session.date} differs from broadcast date; pass --session <commit> for the right day`);
  }
  const next = finishSnippet({ title: snippet.title, description: snippet.description, categoryId: snippet.categoryId, tags: snippet.tags, defaultLanguage: snippet.defaultLanguage }, session, actualStart, dateLabel);

  console.log(`stream started ${actualStart}`);
  console.log(`title : ${snippet.title}`);
  console.log(`   -> : ${next.title}`);
  const start = next.description.indexOf("CHAPTERS");
  console.log(next.description.slice(start, next.description.indexOf("\n\n", next.description.indexOf("Session result"))));

  if (!LIVE) { console.log("\ndry run. Add --live to write."); return; }
  // videos.update replaces the whole snippet: resend everything, omit defaultAudioLanguage ("zxx" is rejected on write).
  const res = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
    method: "PUT",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ id: videoId, snippet: { title: next.title, description: next.description, categoryId: next.categoryId || "27", tags: next.tags || [], defaultLanguage: next.defaultLanguage || "en" } }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`update failed ${res.status}: ${JSON.stringify(j).slice(0, 300)}`);
  console.log("\nupdated on YouTube:", j.snippet?.title);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
