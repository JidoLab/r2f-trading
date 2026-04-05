import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const SHORTS_DIR = path.join(process.cwd(), "scripts", "shorts", "projects");

// --- Viral Hooks Database (ICT Trading specific) ---
const VIRAL_HOOKS = [
  // Counterintuitive truth
  "Stop looking for order blocks. Seriously. Here's what to look for instead.",
  "The more setups you take, the more money you lose. Here's why.",
  "Your win rate doesn't matter. And I can prove it.",
  "I stopped using indicators. My account doubled in 3 months.",
  "The best trade I ever took? I almost didn't take it.",
  // Negative/secret hooks
  "Stop doing this if you want to get funded. I see it every single day.",
  "Three words killing your trading career. And you say them daily.",
  "Your broker knows something you don't. Let me explain.",
  "If you're backtesting like this, you're wasting your time.",
  // Timeframe tension
  "6 months of losses. Then I changed ONE thing.",
  "Zero to funded in 47 days. Here's the exact playbook.",
  "I blew 3 accounts before I learned this. Don't make my mistake.",
  "Two years of struggle. Fixed in one conversation.",
  // POV hooks
  "POV: You just realized every order block you drew was wrong.",
  "POV: You finally understand why smart money moves BEFORE the news.",
  "POV: You stopped chasing and started waiting. Everything changed.",
  // Contradiction
  "I trade less. I make more. Sounds crazy? Watch this.",
  "Losing trades made me profitable. Let me explain.",
  "The lazier I got with trading, the better my results.",
  // Result first
  "This one setup paid for my entire year. Here's what it looked like.",
  "Four funded accounts. All from this one concept.",
];

// --- Step 1: Generate Script ---
async function generateScript(topic?: string) {
  console.log("📝 Step 1: Generating script...");
  const anthropic = new Anthropic();

  // Pick a random hook style for inspiration
  const hookExample = VIRAL_HOOKS[Math.floor(Math.random() * VIRAL_HOOKS.length)];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Generate a YouTube Shorts script for R2F Trading, an ICT trading coaching brand.

${topic ? `TOPIC: "${topic}"` : "Pick an engaging ICT trading topic."}

VIRAL HOOK INSPIRATION (use this style but create an original hook):
"${hookExample}"

DURATION TARGET: ${topic && (topic.toLowerCase().includes("top 5") || topic.toLowerCase().includes("top 3") || topic.toLowerCase().includes("tips") || topic.toLowerCase().includes("mistakes") || topic.length > 40) ? "35-45 seconds (100-130 words). Use 5-6 SCENES." : "25-35 seconds (70-90 words). Use 4 SCENES."}

RULES:
- NEVER mention any person's name
- Each SCENE is a separate paragraph with its own visual
- Scene 1: THE HOOK — shocking, specific, creates open loop
- Scene 2+: THE CONTENT — key points, each scene = one clear point
- Last scene: THE CTA — punchy call to action
- Every sentence ends with proper punctuation.
- Short punchy sentences. 3-7 words max per sentence.

For each scene, decide the BEST visual type:
- "stock_video" — USE ONLY for human emotion scenes (frustration, confusion, celebration, motivation). These are real people footage.
- "chart_image" — USE for any scene discussing a specific trading concept, chart pattern, setup, or technical analysis. AI will generate a relevant chart illustration.

Stock video queries should describe EMOTIONS and PEOPLE, not charts. E.g. "frustrated trader staring at screen", "person celebrating success excited"
Chart image prompts should describe SPECIFIC chart setups. E.g. "EUR/USD 1H candlestick chart showing bearish order block with displacement candles pushing down"

Return ONLY JSON (no code fences):
{
  "title": "YouTube Short title (max 70 chars)",
  "description": "YouTube description",
  "hashtags": ["#ICTTrading", "..."],
  "scenes": [
    {
      "text": "Scene script text.",
      "captions": ["CAPTION LINE 1.", "CAPTION LINE 2.", "CAPTION LINE 3."],
      "visualType": "stock_video or chart_image",
      "visualQuery": "query or description",
      "emotion": "emotion"
    }
  ],
  "highlightWords": ["key term 1", "key term 2"],
  "hookText": "5-8 word visual hook text"
}

Include 4-6 scene objects depending on the duration target.

CRITICAL — CAPTIONS ARRAY:
Each scene has a "captions" array of 2-4 short caption strings.
Each caption is shown one at a time, synced to the speech.
Rules for captions:
- Each caption is 2-5 words MAX
- NEVER split a phrase unnaturally (e.g. "RULE 1 NEVER" is WRONG — should be "RULE 1:" then "NEVER RISK MORE")
- Split at natural speech pauses, commas, periods
- Keep complete thoughts together
- Punctuation must stay with its word
- Capitalize everything`,
    }],
  });

  let text = response.content[0].type === "text" ? response.content[0].text : "";
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  const parsed = JSON.parse(text);

  // Combine scene texts into full script
  parsed.script = parsed.scenes.map((s: { text: string }) => s.text).join(" ");
  console.log(`  Title: ${parsed.title}`);
  console.log(`  Scenes: ${parsed.scenes.length}`);
  console.log(`  Words: ~${parsed.script.split(/\s+/).length}`);
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

// --- Step 4: Fetch visuals ---
async function fetchVisuals(scenes: { visualType: string; visualQuery: string; emotion: string }[], slug: string) {
  console.log("🎥 Step 4: Fetching visuals...");
  const geminiKey = process.env.GEMINI_API_KEY;
  const repo = process.env.GITHUB_REPO || "JidoLab/r2f-trading";
  const token = process.env.GITHUB_TOKEN!;

  // Load curated stock library
  let stockLibrary: Record<string, { url: string }> = {};
  try {
    stockLibrary = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/shorts/stock-library.json"), "utf-8"));
  } catch {}

  const emotionToStock: Record<string, string> = {
    frustration: "frustration", confusion: "thinking", shock: "frustration",
    tension: "screen_glow", revelation: "screen_glow", confidence: "typing_trade",
    celebration: "celebration", motivation: "walking_city", curiosity: "phone_chart",
  };

  // Process each scene — EXACTLY one visual per scene
  const visuals: { type: "video" | "image"; url: string }[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let found = false;

    // Option A: Stock video for emotion scenes
    if (scene.visualType === "stock_video" && !found) {
      const stockTag = emotionToStock[scene.emotion] || "";
      const clip = stockLibrary[stockTag];
      if (clip?.url) {
        visuals.push({ type: "video", url: clip.url });
        console.log(`  ✓ Scene ${i + 1} [B-ROLL]: ${stockTag}`);
        found = true;
      }
    }

    // Option B: AI chart image for technical scenes
    if (!found && geminiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const res = await ai.models.generateContent({
          model: "gemini-3.1-flash-image-preview",
          contents: `${scene.visualQuery}. Style: Professional trading chart on dark navy (#0d2137) background with gold (#c9a84c) highlights. Vertical 9:16 portrait. Sharp, high resolution. No text on image.`,
          config: { responseModalities: ["TEXT", "IMAGE"] },
        });
        for (const part of res.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData && !found) {
            const filename = `shorts-assets/${slug}-bg-${i}.jpg`;
            // Delete existing file if any
            try {
              const existing = await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const ed = await existing.json();
              if (ed.sha) {
                await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ message: `Replace bg`, sha: ed.sha }),
                });
              }
            } catch {}
            // Upload new
            await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ message: `Short bg ${i}`, content: part.inlineData.data }),
            });
            const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const ghData = await ghRes.json();
            if (ghData.download_url) {
              visuals.push({ type: "image", url: ghData.download_url });
              console.log(`  ✓ Scene ${i + 1} [CHART]: "${scene.visualQuery.slice(0, 45)}"`);
              found = true;
            }
          }
        }
      } catch {}
    }

    // Option C: Fallback to curated stock
    if (!found) {
      const fb = stockLibrary["chart_close"] || stockLibrary["screen_glow"];
      visuals.push({ type: fb ? "video" : "image", url: fb?.url || "" });
      console.log(`  ${fb ? "✓" : "✗"} Scene ${i + 1} [FALLBACK]`);
    }
  }

  console.log(`  Total: ${visuals.length} visuals for ${scenes.length} scenes`);
  return visuals;
}

// --- Step 5: Render ---
async function renderVideo(
  audioUrl: string,
  segments: { text: string; start: number; end: number }[],
  scenes: { text: string }[],
  highlightWords: string[],
  hookText: string,
  visuals: { type: "video" | "image"; url: string }[],
  duration: number,
  slug: string
) {
  console.log("🎬 Step 5: Rendering with Creatomate...");

  // Calculate scene boundaries from segments
  // Map scenes to segment timing — each scene's text matches a group of segments
  const sceneTimes: { start: number; end: number }[] = [];
  const totalDur = duration;
  const sceneDur = totalDur / scenes.length;

  for (let i = 0; i < scenes.length; i++) {
    sceneTimes.push({
      start: i * sceneDur,
      end: (i + 1) * sceneDur,
    });
  }

  // Build captions from segments, aligned to scene boundaries
  // Build captions using Claude's pre-split text + Whisper segment timing
  const captions: { text: string; start: number; end: number; isHighlight: boolean; isHook: boolean }[] = [];

  // Collect captions per scene
  const sceneCaptions: string[][] = scenes.map((s: { captions?: string[] }) => s.captions || []);

  // Map scenes to segment timing — distribute segments across scenes proportionally
  const totalSceneWords = scenes.reduce((sum: number, s: { text: string }) => sum + s.text.split(/\s+/).length, 0);
  let segIdx = 0;

  for (let si = 0; si < scenes.length; si++) {
    const sceneWordRatio = scenes[si].text.split(/\s+/).length / totalSceneWords;
    const sceneSegCount = Math.max(1, Math.round(segments.length * sceneWordRatio));
    const sceneSegs = segments.slice(segIdx, segIdx + sceneSegCount);
    segIdx += sceneSegCount;

    const sceneStart = sceneSegs[0]?.start || (si * duration / scenes.length);
    const sceneEnd = sceneSegs[sceneSegs.length - 1]?.end || ((si + 1) * duration / scenes.length);
    const sceneDur = sceneEnd - sceneStart;

    const caps = sceneCaptions[si];
    if (caps.length === 0) continue;

    const timePerCap = sceneDur / caps.length;
    for (let ci = 0; ci < caps.length; ci++) {
      const text = caps[ci];
      const start = sceneStart + ci * timePerCap;
      const end = start + timePerCap;
      const isHl = highlightWords.some((hw) => text.toLowerCase().includes(hw.toLowerCase()));
      const isHook = si === 0 && ci === 0; // First caption of first scene = hook
      captions.push({ text: text.toUpperCase(), start, end, isHighlight: isHl, isHook });
    }
  }

  // Build background elements — mixed video clips and chart images
  const bgElements = visuals.map((vis, i) => {
    const sceneStart = sceneTimes[i]?.start || 0;
    const sceneDur = (sceneTimes[i]?.end || duration) - sceneStart;

    if (!vis.url) {
      return { type: "shape" as const, shape: "rectangle" as const, fill_color: "#0d2137", x: "50%", y: "50%", width: "100%", height: "100%", time: sceneStart, duration: sceneDur };
    }

    if (vis.type === "video") {
      return {
        type: "video" as const, source: vis.url, fit: "cover" as const,
        x: "50%", y: "50%", width: "100%", height: "100%",
        time: sceneStart, duration: sceneDur,
        trim_start: 0, trim_duration: sceneDur,
      };
    }

    // Image — static, no fade, clean cut
    return {
      type: "image" as const, source: vis.url, fit: "cover" as const,
      x: "50%", y: "50%", width: "100%", height: "100%",
      time: sceneStart, duration: sceneDur,
    };
  });

  const source = {
    output_format: "mp4",
    width: 1080,
    height: 1920,
    duration,
    elements: [
      // Dark base
      { type: "shape", shape: "rectangle", fill_color: "#0d2137", x: "50%", y: "50%", width: "100%", height: "100%" },

      // Scene backgrounds (video clips synced to scene boundaries)
      ...bgElements,

      // Dark overlay for readability
      { type: "shape", shape: "rectangle", fill_color: "rgba(0,0,0,0.35)", x: "50%", y: "50%", width: "100%", height: "100%" },

      // Audio
      { type: "audio", source: audioUrl },

      // R2F watermark
      { type: "text", text: "R2F", font_family: "Montserrat", font_weight: "900", font_size: "5 vmin", fill_color: "#c9a84c", opacity: "50%", x: "90%", y: "5%" },

      // Synced captions — first one is the hook (bigger, centered), rest are lower third
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
        x: "50%",
        y: cap.isHook ? "45%" : "73%",
        width: "88%",
        x_alignment: "50%",
        y_alignment: "50%",
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

  // Poll
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

// --- Main ---
async function main() {
  const topic = process.argv[2] || undefined;
  console.log("🎬 R2F YouTube Shorts — Full Pipeline\n");

  // Step 1
  const script = await generateScript(topic);

  const slug = script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const projectDir = path.join(SHORTS_DIR, slug);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, "script.json"), JSON.stringify(script, null, 2));

  // Step 2
  const audioPath = path.join(projectDir, "voiceover.mp3");
  await generateVoice(script.script, audioPath);

  // Step 3
  const transcription = await transcribe(audioPath);
  fs.writeFileSync(path.join(projectDir, "transcription.json"), JSON.stringify(transcription, null, 2));

  // Step 4: Fetch visuals (mixed stock video + AI charts)
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

  // Step 5
  const videoPath = await renderVideo(
    ghData.download_url,
    transcription.segments || [],
    script.scenes,
    script.highlightWords || [],
    script.hookText || "",
    visuals,
    transcription.duration || 30,
    slug
  );

  console.log(`\n✅ YouTube Short ready!`);
  console.log(`📺 Title: ${script.title}`);
  console.log(`📁 Video: ${videoPath}`);
  console.log(`\n🎯 To upload: npm run upload-short "${slug}"`);
}

main().catch(console.error);
