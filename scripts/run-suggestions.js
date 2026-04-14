const fs = require("fs");
const lines = fs.readFileSync(".env.local", "utf8").split("\n");
const env = {};
for (const l of lines) { const m = l.match(/^([A-Z_]+)=(.+)$/); if (m) env[m[1]] = m[2]; }

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic.default({ apiKey: env.ANTHROPIC_API_KEY });
const KEY = env.YOUTUBE_API_KEY;
const TOKEN = env.GITHUB_TOKEN;
const REPO = env.GITHUB_REPO || "JidoLab/r2f-trading";

const NON_EN = /[\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0400-\u04FF]/;
function isEng(t) { if (NON_EN.test(t)) return false; const c = t.replace(/[^a-zA-Z0-9\s]/g, "").trim(); return c.length >= 5 && (c.match(/[a-zA-Z]/g) || []).length > c.length * 0.5; }

const OPENERS = ["Jump into a specific insight", "Ask a rhetorical question", "Share a personal take", "State a direct opinion", "Agree and extend", "Challenge a misconception", "Share what you tell students"];
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

async function genReply(title, author, platform) {
  const labels = { youtube: "YouTube video", investinglive: "InvestingLive article", tradingview: "TradingView idea", forexfactory: "Forex Factory thread", quora: "Quora question", medium: "Medium article", linkedin: "LinkedIn post" };
  const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
  const msg = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 300, messages: [{ role: "user", content: `Write a comment in English (2-4 sentences) for this ${labels[platform] || "post"}.\n\nTitle: "${title}"\nAuthor: "${author}"\n\nSTYLE: ${opener}\nNEVER use dashes. No website mentions. No hashtags. No "Solid breakdown" openers. Under 400 chars. Occasionally say "my students". Vary structure. English only. Comment only.` }] });
  return msg.content[0].text.trim();
}

async function proxyFetch(url) {
  try {
    const { HttpsProxyAgent } = require("https-proxy-agent");
    const agent = new HttpsProxyAgent("http://1eda942178cb8ec8bea7:344ddbc320d8a5f1@gw.dataimpulse.com:823");
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }, agent, signal: AbortSignal.timeout(15000) });
    return res.ok ? await res.text() : null;
  } catch { return null; }
}

async function run() {
  let existing = [];
  try { const r = await fetch("https://api.github.com/repos/" + REPO + "/contents/data/reply-suggestions.json", { headers: { Authorization: "Bearer " + TOKEN } }); if (r.ok) { const d = await r.json(); existing = JSON.parse(Buffer.from(d.content, "base64").toString()); } } catch {}
  const urls = new Set(existing.map(s => s.postUrl));
  const newSuggs = [];

  function addSugg(platform, title, url, author, reply) {
    newSuggs.push({ id: "sug-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), platform, postTitle: title, postUrl: url, authorName: author, suggestedReply: reply, createdAt: new Date().toISOString(), status: "pending" });
    urls.add(url);
  }

  // YOUTUBE (15)
  console.log("=== YouTube (15) ===");
  const ytQ = ["forex trading strategy 2026", "day trading tutorial", "prop firm challenge strategy", "trading psychology tips", "price action trading", "smart money concepts", "risk management trading", "swing trading strategy", "supply and demand trading", "scalping forex strategy"];
  for (const q of ytQ) {
    if (newSuggs.filter(s => s.platform === "youtube").length >= 15) break;
    const r = await fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&q=" + encodeURIComponent(q) + "&type=video&order=date&maxResults=12&relevanceLanguage=en&publishedAfter=" + encodeURIComponent(thirtyDaysAgo) + "&key=" + KEY);
    if (!r.ok) continue;
    const d = await r.json();
    const vids = (d.items || []).filter(i => isEng(i.snippet.title));
    if (!vids.length) continue;
    const ids = vids.map(i => i.id.videoId).join(",");
    const sr = await fetch("https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=" + ids + "&key=" + KEY);
    if (!sr.ok) continue;
    const sd = await sr.json();
    const chIds = [...new Set((sd.items || []).map(i => i.snippet?.channelId).filter(Boolean))];
    const cm = new Map();
    if (chIds.length) { const cr = await fetch("https://www.googleapis.com/youtube/v3/channels?part=statistics&id=" + chIds.join(",") + "&key=" + KEY); if (cr.ok) { for (const c of (await cr.json()).items || []) cm.set(c.id, parseInt(c.statistics?.subscriberCount || "0")); } }
    for (const item of sd.items || []) {
      if (newSuggs.filter(s => s.platform === "youtube").length >= 15) break;
      const url = "https://youtube.com/watch?v=" + item.id;
      if (urls.has(url)) continue;
      const dur = item.contentDetails?.duration || "PT0S";
      const secs = (parseInt((dur.match(/(\d+)H/) || [])[1] || "0") * 3600) + (parseInt((dur.match(/(\d+)M/) || [])[1] || "0") * 60) + parseInt((dur.match(/(\d+)S/) || [])[1] || "0");
      const subs = cm.get(item.snippet?.channelId) || 0;
      if (secs < 120 || subs < 3000 || parseInt(item.statistics?.viewCount || "0") < 100) continue;
      if (!isEng(item.snippet?.title || "")) continue;
      const reply = await genReply(item.snippet.title, item.snippet.channelTitle, "youtube");
      addSugg("youtube", item.snippet.title, url, item.snippet.channelTitle, reply);
      console.log(" YT: [" + subs + "] " + item.snippet.title.slice(0, 45));
    }
  }

  // MEDIUM (7)
  console.log("\n=== Medium (7) ===");
  for (const tag of ["forex-trading", "trading", "day-trading", "stock-market"]) {
    if (newSuggs.filter(s => s.platform === "medium").length >= 7) break;
    try {
      const r = await fetch("https://medium.com/feed/tag/" + tag, { headers: { Accept: "application/xml" } });
      if (!r.ok) continue;
      const xml = await r.text();
      for (const block of xml.split("<item>").slice(1, 5)) {
        if (newSuggs.filter(s => s.platform === "medium").length >= 7) break;
        const tM = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/);
        const lM = block.match(/<link>(https:.*?)<\/link>/);
        const cM = block.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/);
        if (tM && lM && isEng(tM[1]) && !urls.has(lM[1])) {
          const reply = await genReply(tM[1], cM?.[1] || "Medium", "medium");
          addSugg("medium", tM[1], lM[1], cM?.[1] || "Medium", reply);
          console.log(" M: " + tM[1].slice(0, 50));
        }
      }
    } catch {}
  }

  // TRADINGVIEW via proxy (5)
  console.log("\n=== TradingView (proxy, 5) ===");
  try {
    const html = await proxyFetch("https://www.tradingview.com/ideas/");
    if (html) {
      const matches = [...html.matchAll(/<a[^>]*href="(https:\/\/www\.tradingview\.com\/chart\/[^"]+)"[^>]*title="([^"]+)"/g)];
      for (const m of matches.slice(0, 10)) {
        if (newSuggs.filter(s => s.platform === "tradingview").length >= 5) break;
        if (!isEng(m[2]) || urls.has(m[1])) continue;
        const reply = await genReply(m[2], "TradingView User", "tradingview");
        addSugg("tradingview", m[2].slice(0, 100), m[1], "TradingView User", reply);
        console.log(" TV: " + m[2].slice(0, 50));
      }
    } else console.log(" TV: proxy failed");
  } catch (e) { console.log(" TV error:", e.message); }

  // QUORA via proxy+Google (5)
  console.log("\n=== Quora (proxy, 5) ===");
  try {
    const html = await proxyFetch("https://www.google.com/search?q=site:quora.com+forex+trading+funded+account+prop+firm&num=8");
    if (html) {
      const matches = [...html.matchAll(/href="\/url\?q=(https:\/\/www\.quora\.com\/[^&"]+)/g)];
      for (const m of matches) {
        if (newSuggs.filter(s => s.platform === "quora").length >= 5) break;
        const qUrl = decodeURIComponent(m[1]);
        if (urls.has(qUrl)) continue;
        const slug = qUrl.split("/").pop() || "";
        const title = slug.replace(/-/g, " ").replace(/\?.*/, "");
        if (title.length < 10 || !isEng(title)) continue;
        const reply = await genReply(title, "Quora", "quora");
        addSugg("quora", title, qUrl, "Quora", reply);
        console.log(" Q: " + title.slice(0, 50));
      }
    } else console.log(" Q: proxy failed");
  } catch (e) { console.log(" Q error:", e.message); }

  // INVESTINGLIVE (5)
  console.log("\n=== InvestingLive (5) ===");
  try {
    const r = await fetch("https://investinglive.com/feed", { headers: { Accept: "application/xml" } });
    if (r.ok) {
      const xml = await r.text();
      for (const item of xml.split("<item>").slice(1, 10)) {
        if (newSuggs.filter(s => s.platform === "investinglive").length >= 5) break;
        const tM = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
        const lM = item.match(/<link>(https:.*?)<\/link>/);
        const cM = item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/);
        if (tM && lM && isEng(tM[1]) && !urls.has(lM[1])) {
          const reply = await genReply(tM[1], cM?.[1] || "InvestingLive", "investinglive");
          addSugg("investinglive", tM[1], lM[1], cM?.[1] || "InvestingLive", reply);
          console.log(" IL: " + tM[1].slice(0, 50));
        }
      }
    }
  } catch {}

  // LINKEDIN (3)
  console.log("\n=== LinkedIn (3) ===");
  const liTopics = ["ICT trading concepts for retail traders", "Why prop firm traders fail in month one", "Trading psychology for funded accounts", "Risk management strategies forex 2026"];
  for (const t of liTopics.sort(() => Math.random() - 0.5).slice(0, 3)) {
    const liUrl = "https://www.linkedin.com/search/results/content/?keywords=" + encodeURIComponent(t);
    if (urls.has(liUrl)) continue;
    const reply = await genReply(t, "LinkedIn", "linkedin");
    addSugg("linkedin", t + " (search LinkedIn)", liUrl, "LinkedIn Search", reply);
    console.log(" LI: " + t.slice(0, 50));
  }

  // SAVE
  console.log("\n=== SUMMARY ===");
  const breakdown = {};
  for (const s of newSuggs) breakdown[s.platform] = (breakdown[s.platform] || 0) + 1;
  console.log("Total:", newSuggs.length);
  console.log("Breakdown:", JSON.stringify(breakdown));

  if (!newSuggs.length) return;
  const all = [...newSuggs, ...existing];
  const content = Buffer.from(JSON.stringify(all, null, 2)).toString("base64");
  let sha;
  try { const r = await fetch("https://api.github.com/repos/" + REPO + "/contents/data/reply-suggestions.json", { headers: { Authorization: "Bearer " + TOKEN } }); if (r.ok) sha = (await r.json()).sha; } catch {}
  const body = { message: "Added " + newSuggs.length + " suggestions across " + Object.keys(breakdown).length + " platforms", content };
  if (sha) body.sha = sha;
  const cr = await fetch("https://api.github.com/repos/" + REPO + "/contents/data/reply-suggestions.json", { method: "PUT", headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  console.log("Saved:", cr.ok ? "YES" : "NO");
}

run().catch(e => console.error("FATAL:", e.message));
