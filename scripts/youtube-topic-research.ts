/**
 * YouTube topic research for R2F Trading.
 *
 * Run:  npm run yt-research              (free: demand + gap only)
 *       npm run yt-research -- --validate  (also checks real YouTube results, costs quota)
 *
 * WHY THIS EXISTS
 * The 2026-08-10 channel audit showed which videos earn views and which do not:
 *   - Named-concept explainers around 11 minutes: 18-35% average view percentage.
 *     "VOLATILITY DRAG" (11:18) hit 34.9% and is also the channel's top search term.
 *   - Dated/weekly analysis at 20+ minutes: 5-11%, and 73% of viewers leave in the
 *     first 25 seconds.
 *   - Evergreen concept videos are 82% of all channel views; the 52-episode
 *     "Trade Like A Sniper" series produced 1,024 views total.
 * So the job is to find NAMED CONCEPTS people actually search for, that Harvest
 * has not already covered, and turn each into one ~11 minute explainer.
 *
 * HOW IT SCORES
 *   demand   - how many distinct autocomplete phrases the concept generates.
 *              Autocomplete only returns queries people actually type, so a
 *              concept with many completions has real, live search volume.
 *   gap      - whether an existing R2F video already targets it. Covered
 *              concepts are deprioritised to avoid competing with himself
 *              (the site had exactly this cannibalisation problem).
 *   proof    - optional. Median views of the top YouTube results for the query.
 *              High median means the topic reliably earns views for other
 *              channels. Costs 100 quota units per query, so it only runs on
 *              the shortlist and only with --validate.
 *
 * Quota: search.list is 100 units against 10,000/day. The free pass uses none.
 */
import fs from "fs";
import path from "path";

const SUGGEST = "https://suggestqueries.google.com/complete/search";

/** Seeds are deliberately concept-shaped, matching the format that works. */
const SEEDS = [
  "ict order block", "ict fair value gap", "ict liquidity", "ict killzone",
  "ict market structure", "ict breaker block", "ict mitigation block",
  "ict optimal trade entry", "ict silver bullet", "ict power of three",
  "ict market maker model", "ict smt divergence", "ict turtle soup",
  "ict judas swing", "ict displacement", "ict premium discount",
  "smart money concepts", "liquidity sweep", "break of structure",
  "change of character", "order flow trading", "prop firm challenge",
  "funded account rules", "trading psychology discipline",
];

interface Candidate {
  concept: string;
  queries: string[];
  demand: number;
  covered: boolean;
  coveredBy?: string;
  medianViews?: number;
  topResultAgeDays?: number;
  score: number;
}

function env(key: string): string {
  const line = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8")
    .split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} missing from .env.local`);
  return line.slice(key.length + 1).trim();
}

/** YouTube autocomplete. hl/gl pin it to English/US or results come back mixed-language. */
async function suggest(q: string): Promise<string[]> {
  const url = `${SUGGEST}?client=firefox&ds=yt&hl=en&gl=us&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = JSON.parse(await res.text());
    return (data[1] as string[]).filter((s) => /^[\x20-\x7E]+$/.test(s));
  } catch {
    return [];
  }
}

/** Expand a seed with the alphabet so we surface long-tail phrasings, not just the head. */
async function expand(seed: string): Promise<string[]> {
  const out = new Set<string>();
  for (const s of await suggest(seed)) out.add(s);
  for (const letter of "abcdefghijklmnopqrstuvwxyz") {
    for (const s of await suggest(`${seed} ${letter}`)) out.add(s);
    await new Promise((r) => setTimeout(r, 60));
  }
  // "how to" and question phrasings map to explainer intent, which is the format
  // that retains on this channel.
  for (const prefix of ["how to ", "what is ", "why "]) {
    for (const s of await suggest(prefix + seed)) out.add(s);
  }
  return [...out];
}

async function myVideos(key: string): Promise<{ title: string; views: number }[]> {
  const ids: string[] = [];
  let page = "";
  do {
    const u = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=UUOJcTd6NQnnaaM5r2dFd-Yg&maxResults=50&key=${key}${page ? `&pageToken=${page}` : ""}`;
    const d = await (await fetch(u)).json();
    if (d.error) throw new Error(d.error.message);
    for (const i of d.items) ids.push(i.contentDetails.videoId);
    page = d.nextPageToken || "";
  } while (page);

  const out: { title: string; views: number }[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const u = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.slice(i, i + 50).join(",")}&key=${key}`;
    const d = await (await fetch(u)).json();
    for (const it of d.items) {
      out.push({ title: it.snippet.title, views: Number(it.statistics?.viewCount ?? 0) });
    }
  }
  return out;
}

/** Costs 100 quota units. Only called for the shortlist, only with --validate. */
async function validateDemand(key: string, query: string) {
  const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=relevance&maxResults=10&q=${encodeURIComponent(query)}&key=${key}`;
  const d = await (await fetch(u)).json();
  if (d.error) throw new Error(d.error.message);
  const ids = d.items.map((i: { id: { videoId: string } }) => i.id.videoId).filter(Boolean);
  if (!ids.length) return null;
  const s = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}&key=${key}`;
  const v = await (await fetch(s)).json();
  const views = v.items.map((i: { statistics?: { viewCount?: string } }) =>
    Number(i.statistics?.viewCount ?? 0)).sort((a: number, b: number) => a - b);
  const median = views[Math.floor(views.length / 2)] ?? 0;
  const newest = Math.max(...v.items.map((i: { snippet: { publishedAt: string } }) =>
    Date.parse(i.snippet.publishedAt)));
  return { median, ageDays: Math.round((Date.now() - newest) / 86400000) };
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  const key = env("YOUTUBE_API_KEY");
  const validate = process.argv.includes("--validate");

  console.log("Fetching existing R2F videos...");
  const mine = await myVideos(key);
  const mineNorm = mine.map((m) => ({ ...m, norm: normalise(m.title) }));

  const candidates: Candidate[] = [];
  console.log(`Expanding ${SEEDS.length} seeds via YouTube autocomplete...\n`);

  for (const seed of SEEDS) {
    const queries = await expand(seed);
    const key2 = normalise(seed);
    // Covered if an existing title contains every significant word of the concept.
    const words = key2.split(" ").filter((w) => w.length > 3 && w !== "ict");
    const hit = mineNorm.find((m) => words.length > 0 && words.every((w) => m.norm.includes(w)));

    candidates.push({
      concept: seed,
      queries,
      demand: queries.length,
      covered: Boolean(hit),
      coveredBy: hit ? `${hit.title} (${hit.views}v)` : undefined,
      score: 0,
    });
    process.stdout.write(`  ${seed}: ${queries.length} phrases${hit ? " [covered]" : ""}\n`);
  }

  // Uncovered concepts with the most live phrasings rank highest.
  for (const c of candidates) c.score = c.demand * (c.covered ? 0.35 : 1);
  candidates.sort((a, b) => b.score - a.score);

  if (validate) {
    console.log("\nValidating top 8 against real YouTube results (100 quota units each)...");
    for (const c of candidates.filter((x) => !x.covered).slice(0, 8)) {
      try {
        const r = await validateDemand(key, c.concept);
        if (r) { c.medianViews = r.median; c.topResultAgeDays = r.ageDays; }
      } catch (e) {
        console.log(`  stopped: ${(e as Error).message.slice(0, 80)}`);
        break;
      }
    }
    for (const c of candidates) {
      if (c.medianViews) c.score = c.score * Math.log10(Math.max(c.medianViews, 10));
    }
    candidates.sort((a, b) => b.score - a.score);
  }

  const outPath = path.join(process.cwd(), "data", "youtube-topic-research.json");
  fs.writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(), validated: validate, candidates,
  }, null, 2));

  console.log("\n================ TOP OPPORTUNITIES ================");
  console.log("(uncovered concepts with the most live search phrasings)\n");
  for (const c of candidates.filter((x) => !x.covered).slice(0, 12)) {
    const proof = c.medianViews
      ? `  median top-10 views ${c.medianViews.toLocaleString()}, newest ${c.topResultAgeDays}d old`
      : "";
    console.log(`  ${String(c.demand).padStart(3)} phrases  ${c.concept}${proof}`);
    console.log(`             e.g. "${c.queries.slice(0, 3).join('", "')}"`);
  }
  console.log("\nAlready covered (do not make again, improve instead):");
  for (const c of candidates.filter((x) => x.covered).slice(0, 6)) {
    console.log(`  ${c.concept} -> ${c.coveredBy}`);
  }
  console.log(`\nFull results: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
