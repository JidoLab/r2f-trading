import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { CONTENT_TYPES, selectContentType, type ContentType } from "./content-types.js";

const SHORTS_DIR = path.join(process.cwd(), "scripts", "shorts", "projects");
const STOCK_LIBRARY_PATH = path.join(process.cwd(), "scripts", "shorts", "stock-library.json");
const AUDIO_LIBRARY_PATH = path.join(process.cwd(), "scripts", "shorts", "audio-library.json");

// --- Viral Hooks Database ---
const VIRAL_HOOKS = [
  "Stop looking for order blocks. Seriously. Here's what to look for instead.",
  "The more setups you take, the more money you lose. Here's why.",
  "Your win rate doesn't matter. And I can prove it.",
  "I stopped using indicators. My account doubled in 3 months.",
  "Stop doing this if you want to get funded. I see it every single day.",
  "Three words killing your trading career. And you say them daily.",
  "If you're backtesting like this, you're wasting your time.",
  "6 months of losses. Then I changed ONE thing.",
  "Zero to funded in 47 days. Here's the exact playbook.",
  "I blew 3 accounts before I learned this. Don't make my mistake.",
  "POV: You just realized every order block you drew was wrong.",
  "POV: You finally understand why smart money moves BEFORE the news.",
  "I trade less. I make more. Sounds crazy? Watch this.",
  "Losing trades made me profitable. Let me explain.",
  "This one setup paid for my entire year. Here's what it looked like.",
  "Four funded accounts. All from this one concept.",
  "POV: You stopped chasing and started waiting. Everything changed.",
  "The lazier I got with trading, the better my results.",
  "Two years of struggle. Fixed in one conversation.",
  "Your broker knows something you don't. Let me explain.",
];

// --- Phase 6: Series Tracking ---
async function getSeriesTracker(): Promise<Record<string, number>> {
  try {
    const { readFile } = await import("../../src/lib/github.js");
    const raw = await readFile("data/shorts/series-tracker.json");
    return JSON.parse(raw);
  } catch (e) { console.warn("[seriesTracker] Failed:", e); return {}; }
}

async function updateSeriesTracker(series: Record<string, number>) {
  const { commitFile } = await import("../../src/lib/github.js");
  await commitFile("data/shorts/series-tracker.json", JSON.stringify(series, null, 2), "Update series tracker");
}

// --- Phase 8: Content Calendar ---
async function getCalendarTopic(): Promise<{ topic: string; contentType: string } | null> {
  try {
    const { readFile } = await import("../../src/lib/github.js");
    const raw = await readFile("data/shorts/calendar.json");
    const calendar = JSON.parse(raw);
    const today = new Date().toISOString().split("T")[0];
    const entry = calendar.find((e: { date: string; used: boolean }) => e.date === today && !e.used);
    return entry ? { topic: entry.topic, contentType: entry.contentType } : null;
  } catch (e) { console.warn("[calendar] Failed:", e); return null; }
}

// --- Phase 9: Performance Data ---
async function getPerformanceContext(): Promise<string> {
  try {
    const { readFile } = await import("../../src/lib/github.js");
    const raw = await readFile("data/shorts/performance.json");
    const perf = JSON.parse(raw);
    if (!perf.videos || perf.videos.length < 10) return ""; // Not enough data

    const sorted = [...perf.videos].sort((a: { views: number }, b: { views: number }) => b.views - a.views);
    const top3 = sorted.slice(0, 3).map((v: { title: string; views: number; retention: number }) =>
      `"${v.title}" (${v.views} views, ${v.retention}% retention)`).join("\n");
    const bottom3 = sorted.slice(-3).map((v: { title: string; views: number }) =>
      `"${v.title}" (${v.views} views)`).join("\n");

    return `\nPERFORMANCE DATA (use this to inform topic selection):
Top performing videos:\n${top3}
Lowest performing:\n${bottom3}
Optimize for: higher retention and engagement.\n`;
  } catch (e) { console.warn("[context] Failed:", e); return ""; }
}

// --- Phase 10: Trend Context ---
async function getTrendContext(): Promise<string> {
  try {
    // Check Forex Factory for upcoming events
    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const month = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return `\nMARKET CONTEXT:
Today: ${dayName}, ${month}
Consider: seasonal patterns, end-of-week/month flows, any major economic events this week.
If there's a timely angle, use it. If not, stick to evergreen content.\n`;
  } catch (e) { console.warn("[context] Failed:", e); return ""; }
}

// --- Step 1: Generate Script ---
async function generateScript(topic?: string, forceContentType?: string) {
  console.log("📝 Step 1: Generating script...");
  const anthropic = new Anthropic();

  // Select content type (rotation or forced)
  const recentTypes: string[] = [];
  try {
    const { readFile } = await import("../../src/lib/github.js");
    const raw = await readFile("data/shorts/series-tracker.json");
    const tracker = JSON.parse(raw);
    if (tracker._recentTypes) recentTypes.push(...tracker._recentTypes);
  } catch {}

  const contentType = forceContentType
    ? CONTENT_TYPES.find((t) => t.id === forceContentType) || selectContentType(recentTypes)
    : selectContentType(recentTypes);

  const hookExample = VIRAL_HOOKS[Math.floor(Math.random() * VIRAL_HOOKS.length)];
  const perfContext = await getPerformanceContext();
  const trendContext = await getTrendContext();

  // Series tracking
  const seriesTracker = await getSeriesTracker();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2500,
    messages: [{
      role: "user",
      content: `Generate a YouTube Shorts script for R2F Trading, an ICT trading coaching brand.

${topic ? `TOPIC: "${topic}"` : "Pick an engaging ICT trading topic."}

CONTENT TYPE: ${contentType.id} — ${contentType.name}
${contentType.description}

SCENE STRUCTURE:
${contentType.sceneTemplate}

VISUAL STRATEGY: ${contentType.visualStrategy}
VOICE TONE: ${contentType.voiceTone}

TARGET: ${contentType.targetDuration} seconds (${contentType.targetWords} words)
SCENES: ${contentType.sceneCount} scenes

VIRAL HOOK INSPIRATION: "${hookExample}"
${perfContext}${trendContext}
SERIES TRACKING (use if applicable):
${JSON.stringify(seriesTracker)}
If this topic fits an existing series, increment the number. E.g. "ICT Basics #${(seriesTracker["ICT Basics"] || 0) + 1}"

RULES:
- NEVER mention any person's name
- Each SCENE is a separate paragraph with its own visual
- Every sentence ends with proper punctuation
- Short punchy sentences. 3-7 words max per sentence.

For each scene, decide visual type:
- "stock_video" — ONLY for human emotion (frustration, celebration, confusion, motivation)
- "chart_image" — for technical content, chart patterns, setups

CRITICAL CAPTION RULES:
Each scene has a "captions" array of 2-4 short caption strings.
- Each caption is 2-5 words MAX
- NEVER split phrases unnaturally
- Split at natural speech pauses
- Keep complete thoughts together

Return ONLY JSON (no code fences):
{
  "title": "YouTube Short title (max 70 chars)",
  "description": "YouTube description",
  "hashtags": ["#ICTTrading", "..."],
  "contentType": "${contentType.id}",
  "seriesName": "series name if applicable or null",
  "seriesNumber": null,
  "mood": "tense|confident|lofi|cinematic|dark",
  "scenes": [
    {
      "text": "Scene text.",
      "captions": ["CAPTION 1.", "CAPTION 2.", "CAPTION 3."],
      "visualType": "stock_video or chart_image",
      "visualQuery": "emotion query or chart description",
      "emotion": "shock|frustration|curiosity|revelation|confidence|celebration|motivation"
    }
  ],
  "highlightWords": ["key term 1", "key term 2"],
  "hookText": "5-8 word hook text"
}`,
    }],
  });

  let text = response.content[0].type === "text" ? response.content[0].text : "";
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  const parsed = JSON.parse(text);

  parsed.script = parsed.scenes.map((s: { text: string }) => s.text).join(" ");

  // Update series tracker
  if (parsed.seriesName && parsed.seriesNumber) {
    seriesTracker[parsed.seriesName] = parsed.seriesNumber;
  }
  seriesTracker._recentTypes = [...recentTypes.slice(-20), contentType.id];
  await updateSeriesTracker(seriesTracker).catch(() => {});

  console.log(`  Title: ${parsed.title}`);
  console.log(`  Type: ${contentType.id} (${contentType.name})`);
  console.log(`  Scenes: ${parsed.scenes.length}`);
  console.log(`  Words: ~${parsed.script.split(/\s+/).length}`);
  if (parsed.seriesName) console.log(`  Series: ${parsed.seriesName} #${parsed.seriesNumber}`);
  return parsed;
}

// --- Step 2: Generate Voice ---
async function generateVoice(script: string, outputPath: string) {
  console.log("🎤 Step 2: Generating voice (Adam)...");
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: script,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.3, similarity_boost: 0.85, style: 0.7, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs: ${await res.text()}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`  ✓ ${(buffer.length / 1024).toFixed(0)} KB`);
}

// --- Step 3: Transcribe ---
async function transcribe(audioPath: string) {
  console.log("📊 Step 3: Transcribing...");
  const audioData = fs.readFileSync(audioPath);
  const formData = new FormData();
  formData.append("file", new Blob([audioData], { type: "audio/mp3" }), "voice.mp3");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Whisper: ${await res.text()}`);
  const data = await res.json();
  console.log(`  ✓ ${data.segments?.length} segments, ${data.duration?.toFixed(1)}s`);
  return data;
}

// --- Step 4: Fetch Visuals ---
async function fetchVisuals(scenes: { visualType: string; visualQuery: string; emotion: string }[], slug: string) {
  console.log("🎥 Step 4: Fetching visuals...");
  const geminiKey = process.env.GEMINI_API_KEY;
  const repo = process.env.GITHUB_REPO || "JidoLab/r2f-trading";
  const token = process.env.GITHUB_TOKEN!;

  let stockLibrary: Record<string, { url: string }> = {};
  try { stockLibrary = JSON.parse(fs.readFileSync(STOCK_LIBRARY_PATH, "utf-8")); } catch {}

  const emotionToStock: Record<string, string> = {
    frustration: "frustration", confusion: "thinking", shock: "surprise",
    tension: "screen_glow", revelation: "lightbulb", confidence: "typing_trade",
    celebration: "celebration", motivation: "walking_city", curiosity: "phone_chart",
    focus: "focus_intense", reflection: "stress_relief",
  };

  const visuals: { type: "video" | "image"; url: string }[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let found = false;

    if (scene.visualType === "stock_video") {
      const stockTag = emotionToStock[scene.emotion] || "";
      const clip = stockLibrary[stockTag];
      if (clip?.url) {
        visuals.push({ type: "video", url: clip.url });
        console.log(`  ✓ Scene ${i + 1} [B-ROLL]: ${stockTag}`);
        found = true;
      }
    }

    if (!found && geminiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const res = await ai.models.generateContent({
          model: "gemini-3.1-flash-image-preview",
          contents: `${scene.visualQuery}. Style: Professional trading chart on dark navy (#0d2137) background with gold (#c9a84c) highlights. Vertical 9:16. Sharp. No text.`,
          config: { responseModalities: ["TEXT", "IMAGE"] },
        });
        for (const part of res.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData && !found) {
            const filename = `shorts-assets/${slug}-bg-${i}.jpg`;
            try {
              const existing = await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, { headers: { Authorization: `Bearer ${token}` } });
              const ed = await existing.json();
              if (ed.sha) await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: "Replace", sha: ed.sha }) });
            } catch {}
            await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: `Bg ${i}`, content: part.inlineData.data }) });
            const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, { headers: { Authorization: `Bearer ${token}` } });
            const ghData = await ghRes.json();
            if (ghData.download_url) { visuals.push({ type: "image", url: ghData.download_url }); console.log(`  ✓ Scene ${i + 1} [CHART]`); found = true; }
          }
        }
      } catch {}
    }

    if (!found) {
      const fb = stockLibrary["chart_close"] || stockLibrary["screen_glow"];
      visuals.push({ type: fb ? "video" : "image", url: fb?.url || "" });
      console.log(`  ${fb ? "✓" : "✗"} Scene ${i + 1} [FALLBACK]`);
    }
  }
  console.log(`  Total: ${visuals.length} visuals`);
  return visuals;
}

// --- Step 5: Render Video ---
async function renderVideo(
  audioUrl: string,
  scenes: { text: string; captions?: string[] }[],
  highlightWords: string[],
  visuals: { type: "video" | "image"; url: string }[],
  duration: number,
  slug: string,
  mood?: string
) {
  console.log("🎬 Step 5: Rendering with Creatomate...");

  // Build captions from Claude's pre-split captions
  const captions: { text: string; start: number; end: number; isHighlight: boolean; isHook: boolean }[] = [];
  const allCaps: string[] = [];
  for (const scene of scenes) {
    const s = scene as { captions?: string[] };
    if (s.captions) allCaps.push(...s.captions);
  }

  if (allCaps.length > 0) {
    const hookDuration = 3.0;
    const captionDuration = duration - hookDuration;
    const timePerCap = captionDuration / allCaps.length;
    for (let i = 0; i < allCaps.length; i++) {
      const text = allCaps[i];
      const start = hookDuration + i * timePerCap;
      const end = start + timePerCap;
      const isHl = highlightWords.some((hw) => text.toLowerCase().includes(hw.toLowerCase()));
      const isHook = i === 0;
      captions.push({ text: text.toUpperCase(), start, end, isHighlight: isHl, isHook });
    }
  }

  const sceneDur = duration / Math.max(visuals.length, 1);

  // Build background elements
  const bgElements = visuals.map((vis, i) => {
    const sceneStart = i * sceneDur;
    if (!vis.url) return { type: "shape" as const, shape: "rectangle" as const, fill_color: "#0d2137", x: "50%", y: "50%", width: "100%", height: "100%", time: sceneStart, duration: sceneDur };
    if (vis.type === "video") return { type: "video" as const, source: vis.url, fit: "cover" as const, x: "50%", y: "50%", width: "100%", height: "100%", time: sceneStart, duration: sceneDur, trim_start: 0, trim_duration: sceneDur };
    return { type: "image" as const, source: vis.url, fit: "cover" as const, x: "50%", y: "50%", width: "100%", height: "100%", time: sceneStart, duration: sceneDur };
  });

  const source = {
    output_format: "mp4",
    width: 1080,
    height: 1920,
    duration,
    elements: [
      // Dark base
      { type: "shape", shape: "rectangle", fill_color: "#0d2137", x: "50%", y: "50%", width: "100%", height: "100%" },

      // Scene backgrounds
      ...bgElements,

      // Dark overlay
      { type: "shape", shape: "rectangle", fill_color: "rgba(0,0,0,0.35)", x: "50%", y: "50%", width: "100%", height: "100%" },

      // Audio
      { type: "audio", source: audioUrl },

      // Phase 4: Progress bar (thin gold bar at bottom)
      {
        type: "shape", shape: "rectangle",
        fill_color: "#c9a84c",
        x: "0%", y: "99.5%", width: "0%", height: "0.5%",
        x_anchor: "0%",
        animations: [{ type: "slide", duration, direction: "right", distance: "100%", easing: "linear" }],
      },

      // R2F watermark
      { type: "text", text: "R2F", font_family: "Montserrat", font_weight: "900", font_size: "5 vmin", fill_color: "#c9a84c", opacity: "50%", x: "90%", y: "5%" },

      // Captions — first one is hook (bigger, centered), rest are lower third
      ...captions.map((cap) => ({
        type: "text",
        text: cap.text,
        font_family: "Montserrat",
        font_weight: "900",
        font_size: cap.isHook ? "12 vmin" : cap.isHighlight ? "10 vmin" : "8.5 vmin",
        fill_color: cap.isHook ? "#EEFF00" : cap.isHighlight ? "#EEFF00" : "#ffffff",
        stroke_color: "#000000",
        stroke_width: cap.isHook ? "1 vmin" : "0.6 vmin",
        shadow_color: "rgba(0,0,0,0.9)",
        shadow_blur: cap.isHook ? "14" : "10",
        shadow_x: "2", shadow_y: "2",
        x: "50%", y: cap.isHook ? "45%" : "73%", width: "88%",
        x_alignment: "50%", y_alignment: "50%",
        text_alignment: "center",
        time: cap.start,
        duration: Math.max(cap.end - cap.start, 0.3),
        animations: [
          { type: "scale", duration: 0.15, start_scale: cap.isHook ? "160%" : "130%", end_scale: "100%", easing: "ease-out" },
          ...(cap.isHook ? [] : [{ type: "slide", duration: 0.15, direction: "up", distance: "3%", easing: "ease-out" }]),
        ],
      })),
    ],
  };

  const res = await fetch("https://api.creatomate.com/v1/renders", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });

  if (!res.ok) throw new Error(`Creatomate: ${await res.text()}`);
  const renders = await res.json();
  const renderData = Array.isArray(renders) ? renders[0] : renders;
  const renderId = renderData?.id;
  console.log(`  ✓ Render started: ${renderId}`);

  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const sr = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
      headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}` },
    });
    const st = await sr.json();
    if (st.status === "succeeded") {
      const vr = await fetch(st.url);
      const vb = Buffer.from(await vr.arrayBuffer());
      const op = path.join(SHORTS_DIR, slug, "output-final.mp4");
      fs.writeFileSync(op, vb);
      console.log(`  ✓ Video saved (${(vb.length / 1024 / 1024).toFixed(1)} MB)`);
      return op;
    } else if (st.status === "failed") {
      throw new Error(`Render failed: ${st.error_message}`);
    }
    process.stdout.write(".");
  }
  throw new Error("Render timed out");
}

// --- Phase 5: Generate Thumbnail ---
async function generateThumbnail(title: string, slug: string, videoPath: string) {
  console.log("🖼️  Step 6: Generating thumbnail...");
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return "";

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const res = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: `YouTube Short thumbnail for: "${title}". Style: Bold attention-grabbing, dark navy background with gold accents, dramatic lighting, trading/finance theme. MUST include visual elements that make someone want to click. Vertical 9:16. No text — text will be overlaid separately.`,
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        const thumbPath = path.join(SHORTS_DIR, slug, "thumbnail.jpg");
        fs.writeFileSync(thumbPath, Buffer.from(part.inlineData.data!, "base64"));
        console.log(`  ✓ Thumbnail saved`);
        return thumbPath;
      }
    }
  } catch (e) {
    console.log(`  ⚠ Thumbnail generation failed`);
  }
  return "";
}

// --- Phase 7: Multi-Platform Upload ---
async function uploadToAllPlatforms(videoPath: string, script: any, slug: string) {
  console.log("📤 Step 7: Uploading to platforms...");
  const results: { platform: string; status: string; url?: string; error?: string }[] = [];

  // YouTube (existing)
  try {
    const { uploadToYouTube } = await import("./upload-platforms.js");
    const ytResult = await uploadToYouTube(videoPath, script, slug);
    results.push({ platform: "youtube", status: "success", url: ytResult.url });
    console.log(`  ✓ YouTube: ${ytResult.url}`);
  } catch (e: any) {
    results.push({ platform: "youtube", status: "error", error: e.message });
    console.log(`  ✗ YouTube: ${e.message?.slice(0, 50)}`);
  }

  // X/Twitter Video
  try {
    const { uploadToTwitterVideo } = await import("./upload-platforms.js");
    const xResult = await uploadToTwitterVideo(videoPath, script);
    results.push({ platform: "twitter", status: xResult.status, url: xResult.url });
    console.log(`  ${xResult.status === "success" ? "✓" : "⚠"} Twitter: ${xResult.status}`);
  } catch (e: any) {
    results.push({ platform: "twitter", status: "skipped", error: e.message });
  }

  // TikTok
  try {
    const { uploadToTikTok } = await import("./upload-platforms.js");
    const ttResult = await uploadToTikTok(videoPath, script);
    results.push({ platform: "tiktok", status: ttResult.status });
    console.log(`  ${ttResult.status === "success" ? "✓" : "⚠"} TikTok: ${ttResult.status}`);
  } catch (e: any) {
    results.push({ platform: "tiktok", status: "skipped", error: e.message });
  }

  // Instagram Reels
  try {
    const { uploadToInstagramReel } = await import("./upload-platforms.js");
    const igResult = await uploadToInstagramReel(videoPath, script, slug);
    results.push({ platform: "instagram", status: igResult.status });
    console.log(`  ${igResult.status === "success" ? "✓" : "⚠"} Instagram: ${igResult.status}`);
  } catch (e: any) {
    results.push({ platform: "instagram", status: "skipped", error: e.message });
  }

  // Facebook Reels
  try {
    const { uploadToFacebookReel } = await import("./upload-platforms.js");
    const fbResult = await uploadToFacebookReel(videoPath, script);
    results.push({ platform: "facebook_reel", status: fbResult.status });
    console.log(`  ${fbResult.status === "success" ? "✓" : "⚠"} Facebook Reel: ${fbResult.status}`);
  } catch (e: any) {
    results.push({ platform: "facebook_reel", status: "skipped", error: e.message });
  }

  // LinkedIn Video
  try {
    const { uploadToLinkedInVideo } = await import("./upload-platforms.js");
    const liResult = await uploadToLinkedInVideo(videoPath, script);
    results.push({ platform: "linkedin_video", status: liResult.status });
    console.log(`  ${liResult.status === "success" ? "✓" : "⚠"} LinkedIn Video: ${liResult.status}`);
  } catch (e: any) {
    results.push({ platform: "linkedin_video", status: "skipped", error: e.message });
  }

  // Text-based social announcements (Telegram, Discord)
  try {
    const ytUrl = results.find(r => r.platform === "youtube")?.url;
    if (ytUrl) {
      const { postToAll } = await import("../../src/lib/social.js");
      await postToAll({
        title: `🎬 New Short: ${script.title}`,
        excerpt: script.description?.slice(0, 120) || "",
        slug: ytUrl,
        coverImage: "",
        tags: script.hashtags || [],
      });
      console.log(`  ✓ Social announcements sent`);
    }
  } catch {}

  // Log results
  try {
    const { commitFile, readFile } = await import("../../src/lib/github.js");
    let log: any[] = [];
    try { log = JSON.parse(await readFile("data/shorts/upload-log.json")); } catch {}
    log.push({ date: new Date().toISOString(), slug, title: script.title, results });
    if (log.length > 100) log = log.slice(-100);
    await commitFile("data/shorts/upload-log.json", JSON.stringify(log, null, 2), `Short upload: ${script.title.slice(0, 30)}`);
  } catch {}

  return results;
}

// --- Main Pipeline ---
async function main() {
  const topic = process.argv[2] || undefined;
  const forceType = process.argv[3] || undefined;
  const skipUpload = process.argv.includes("--no-upload");

  console.log("🎬 R2F YouTube Shorts — Ultimate Pipeline\n");

  // Check calendar first
  const calendarTopic = await getCalendarTopic();
  const finalTopic = topic || calendarTopic?.topic;
  const finalType = forceType || calendarTopic?.contentType;

  // Step 1: Generate Script
  const script = await generateScript(finalTopic, finalType);
  const slug = script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const projectDir = path.join(SHORTS_DIR, slug);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, "script.json"), JSON.stringify(script, null, 2));

  // Step 2: Generate Voice
  const audioPath = path.join(projectDir, "voiceover.mp3");
  await generateVoice(script.script, audioPath);

  // Step 3: Transcribe
  const transcription = await transcribe(audioPath);
  fs.writeFileSync(path.join(projectDir, "transcription.json"), JSON.stringify(transcription, null, 2));

  // Step 4: Fetch Visuals
  const visuals = await fetchVisuals(script.scenes, slug);

  // Upload audio to GitHub
  console.log("☁️  Uploading audio...");
  const { commitFile } = await import("../../src/lib/github.js");
  const audioBase64 = fs.readFileSync(audioPath).toString("base64");
  await commitFile(`shorts-audio/${slug}.mp3`, audioBase64, `Short: ${slug}`, true);
  const repo = process.env.GITHUB_REPO || "JidoLab/r2f-trading";
  const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/shorts-audio/${slug}.mp3`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
  });
  const ghData = await ghRes.json();
  console.log(`  ✓ Audio ready`);

  // Step 5: Render Video
  const videoPath = await renderVideo(
    ghData.download_url,
    script.scenes,
    script.highlightWords || [],
    visuals,
    transcription.duration || 30,
    slug,
    script.mood
  );

  // Step 6: Generate Thumbnail
  const thumbnailPath = await generateThumbnail(script.title, slug, videoPath);

  // Step 7: Upload to All Platforms
  if (!skipUpload) {
    const results = await uploadToAllPlatforms(videoPath, script, slug);
    console.log(`\n📊 Upload Results:`);
    for (const r of results) {
      console.log(`  ${r.status === "success" ? "✓" : r.status === "skipped" ? "-" : "✗"} ${r.platform}: ${r.url || r.status}`);
    }
  }

  console.log(`\n✅ YouTube Short complete!`);
  console.log(`📺 Title: ${script.title}`);
  console.log(`🎬 Type: ${script.contentType}`);
  console.log(`📁 Video: ${videoPath}`);
  if (thumbnailPath) console.log(`🖼️  Thumbnail: ${thumbnailPath}`);
}

main().catch(console.error);
