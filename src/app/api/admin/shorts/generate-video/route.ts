import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

const VIRAL_HOOKS = [
  "Stop looking for order blocks. Seriously. Here's what to look for instead.",
  "The more setups you take, the more money you lose. Here's why.",
  "Your win rate doesn't matter. And I can prove it.",
  "I stopped using indicators. My account doubled in 3 months.",
  "Stop doing this if you want to get funded. I see it every single day.",
  "Three words killing your trading career. And you say them daily.",
  "6 months of losses. Then I changed ONE thing.",
  "Zero to funded in 47 days. Here's the exact playbook.",
  "I blew 3 accounts before I learned this. Don't make my mistake.",
  "Losing trades made me profitable. Let me explain.",
  "This one setup paid for my entire year. Here's what it looked like.",
  "Four funded accounts. All from this one concept.",
  "The lazier I got with trading, the better my results.",
  "Two years of struggle. Fixed in one conversation.",
];

// Expanded stock video library — heavy on human emotions/reactions for engagement
const STOCK_LIBRARY: Record<string, { url: string }[]> = {
  // Frustration / Stress
  frustration: [
    { url: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/5699737/5699737-uhd_2560_1440_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6549174/6549174-uhd_2560_1440_25fps.mp4" },
  ],
  // Thinking / Contemplation
  thinking: [
    { url: "https://videos.pexels.com/video-files/5699862/5699862-uhd_2560_1440_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7579956/7579956-uhd_2560_1440_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/4057613/4057613-uhd_2560_1440_25fps.mp4" },
  ],
  // Surprise / Shock
  surprise: [
    { url: "https://videos.pexels.com/video-files/3196269/3196269-uhd_2560_1440_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6549019/6549019-uhd_2560_1440_25fps.mp4" },
  ],
  // Screen glow / Trading screens
  screen_glow: [
    { url: "https://videos.pexels.com/video-files/6801869/6801869-uhd_2560_1440_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7567443/7567443-uhd_2560_1440_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6801543/6801543-uhd_2560_1440_25fps.mp4" },
  ],
  // Lightbulb / Insight moment
  lightbulb: [
    { url: "https://videos.pexels.com/video-files/3945055/3945055-uhd_2560_1440_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6549019/6549019-uhd_2560_1440_25fps.mp4" },
  ],
  // Typing / Working
  typing_trade: [
    { url: "https://videos.pexels.com/video-files/6801543/6801543-uhd_2560_1440_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/5699862/5699862-uhd_2560_1440_24fps.mp4" },
  ],
  // Celebration / Success
  celebration: [
    { url: "https://videos.pexels.com/video-files/3195810/3195810-uhd_2560_1440_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6962025/6962025-uhd_2560_1440_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/3249935/3249935-uhd_2560_1440_25fps.mp4" },
  ],
  // Walking / Lifestyle
  walking_city: [
    { url: "https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/4763824/4763824-uhd_2560_1440_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/5752729/5752729-uhd_2732_1440_25fps.mp4" },
  ],
  // Phone / Charts on device
  phone_chart: [
    { url: "https://videos.pexels.com/video-files/7567443/7567443-uhd_2560_1440_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6801869/6801869-uhd_2560_1440_25fps.mp4" },
  ],
  // Intense focus / determination
  focus_intense: [
    { url: "https://videos.pexels.com/video-files/5699862/5699862-uhd_2560_1440_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/4057613/4057613-uhd_2560_1440_25fps.mp4" },
  ],
  // Money / Wealth
  money: [
    { url: "https://videos.pexels.com/video-files/3943962/3943962-uhd_2560_1440_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6963744/6963744-uhd_2560_1440_25fps.mp4" },
  ],
  // Head in hands / Defeat
  defeat: [
    { url: "https://videos.pexels.com/video-files/6549174/6549174-uhd_2560_1440_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/5699737/5699737-uhd_2560_1440_24fps.mp4" },
  ],
  // Nodding / Agreement
  agreement: [
    { url: "https://videos.pexels.com/video-files/7579956/7579956-uhd_2560_1440_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/4057613/4057613-uhd_2560_1440_25fps.mp4" },
  ],
  // Luxury / Aspirational
  luxury: [
    { url: "https://videos.pexels.com/video-files/4763824/4763824-uhd_2560_1440_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/5752729/5752729-uhd_2732_1440_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/3249935/3249935-uhd_2560_1440_25fps.mp4" },
  ],
  // Coffee / Morning routine
  morning: [
    { url: "https://videos.pexels.com/video-files/4057613/4057613-uhd_2560_1440_25fps.mp4" },
  ],
  // Pointing / Teaching gesture
  pointing: [
    { url: "https://videos.pexels.com/video-files/6549019/6549019-uhd_2560_1440_25fps.mp4" },
  ],
};

const EMOTION_MAP: Record<string, string> = {
  frustration: "frustration", confusion: "thinking", shock: "surprise",
  tension: "screen_glow", revelation: "lightbulb", confidence: "typing_trade",
  celebration: "celebration", motivation: "walking_city", curiosity: "phone_chart",
  focus: "focus_intense", reflection: "thinking", defeat: "defeat",
  agreement: "agreement", wealth: "money", luxury: "luxury",
  aspiration: "luxury", morning: "morning", pointing: "pointing",
  teaching: "pointing", money: "money",
};

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { topic, count = 1, autoPublish = false } = await req.json();
    const results: { slug: string; title: string; status: string }[] = [];

    for (let n = 0; n < Math.min(count, 5); n++) {
      try {
        const result = await generateSingleShort(topic && count === 1 ? topic : undefined, autoPublish);
        results.push(result);
      } catch (err: unknown) {
        results.push({ slug: "", title: "", status: `error: ${err instanceof Error ? err.message : "unknown"}` });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

async function generateSingleShort(topic?: string, autoPublish = false) {
  const anthropic = new Anthropic();

  // Load content types
  const contentTypes = [
    { id: "listicle", name: "Listicle", description: "Top 3-5 tips/mistakes", sceneTemplate: "Hook → List items → CTA", visualStrategy: "Mix stock + charts", voiceTone: "Energetic, authoritative", targetDuration: 35, targetWords: 90, sceneCount: 5 },
    { id: "chart-breakdown", name: "Chart Breakdown", description: "Annotated chart walkthrough", sceneTemplate: "Setup → Entry → Result", visualStrategy: "All chart images", voiceTone: "Analytical, clear", targetDuration: 40, targetWords: 100, sceneCount: 4 },
    { id: "myth-buster", name: "Myth Buster", description: "MYTH vs TRUTH format", sceneTemplate: "Myth → Why wrong → Truth → Proof", visualStrategy: "Dramatic stock + chart proof", voiceTone: "Confident, surprising", targetDuration: 35, targetWords: 85, sceneCount: 4 },
    { id: "story", name: "Story", description: "Personal narrative", sceneTemplate: "Before → Struggle → Change → After", visualStrategy: "Emotional stock clips", voiceTone: "Vulnerable, real", targetDuration: 40, targetWords: 100, sceneCount: 4 },
    { id: "quiz", name: "Quiz", description: "Test your knowledge", sceneTemplate: "Question → Options → Answer → Lesson", visualStrategy: "Chart + text overlays", voiceTone: "Playful, challenging", targetDuration: 30, targetWords: 75, sceneCount: 4 },
    { id: "pov", name: "POV", description: "POV: relatable scenario", sceneTemplate: "POV setup → Scenario → Plot twist → Lesson", visualStrategy: "Relatable stock clips", voiceTone: "Casual, dramatic", targetDuration: 30, targetWords: 75, sceneCount: 4 },
    { id: "rapid-fire", name: "Rapid Fire", description: "Quick tips", sceneTemplate: "Hook → Tip 1 → Tip 2 → Tip 3 → CTA", visualStrategy: "Fast cuts, mixed", voiceTone: "Fast, punchy", targetDuration: 25, targetWords: 65, sceneCount: 5 },
    { id: "debate", name: "Debate", description: "X vs Y comparison", sceneTemplate: "Question → Side A → Side B → Verdict", visualStrategy: "Split screen feel", voiceTone: "Fair, decisive", targetDuration: 35, targetWords: 90, sceneCount: 4 },
  ];

  // Select content type with rotation
  let recentTypes: string[] = [];
  try {
    const raw = await readFile("data/shorts/series-tracker.json");
    const tracker = JSON.parse(raw);
    if (tracker._recentTypes) recentTypes = tracker._recentTypes;
  } catch {}

  const typeCounts: Record<string, number> = {};
  for (const t of recentTypes) typeCounts[t] = (typeCounts[t] || 0) + 1;
  const sorted = [...contentTypes].sort((a, b) => (typeCounts[a.id] || 0) - (typeCounts[b.id] || 0));
  const contentType = sorted[0];

  const hookExample = VIRAL_HOOKS[Math.floor(Math.random() * VIRAL_HOOKS.length)];

  // Get series tracker
  let seriesTracker: Record<string, any> = {};
  try { seriesTracker = JSON.parse(await readFile("data/shorts/series-tracker.json")); } catch {}

  // Generate script
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2500,
    messages: [{
      role: "user",
      content: `Generate a YouTube Shorts script for R2F Trading, an ICT trading coaching brand.
${topic ? `TOPIC: "${topic}"` : "Pick an engaging ICT trading topic."}
CONTENT TYPE: ${contentType.id} — ${contentType.name}. ${contentType.description}
SCENE STRUCTURE: ${contentType.sceneTemplate}
TARGET: ${contentType.targetDuration} seconds (~${contentType.targetWords} words), ${contentType.sceneCount} scenes
VIRAL HOOK INSPIRATION: "${hookExample}"
SERIES: ${JSON.stringify(Object.fromEntries(Object.entries(seriesTracker).filter(([k]) => k !== "_recentTypes")))}

RULES:
- NEVER mention any person's name
- Short punchy sentences. 3-7 words per sentence.
- The LAST scene MUST always be a CTA ending with something like: "Follow R2F Trading for more tips like this." or "Follow R2F Trading. Link in bio." or "R2F Trading. Follow for daily setups." — always mention "R2F Trading" and "follow" in the final scene.
- VISUAL PRIORITY: Use "stock_video" for MOST scenes — people's emotions (frustration, shock, celebration, thinking) get way more attention than charts. Only use "chart_image" for 1 scene MAX where you need to show a specific pattern or setup. The final CTA scene should ALWAYS be "stock_video" with emotion "motivation" or "luxury" or "celebration".
- Available emotions for stock_video: shock, frustration, curiosity, revelation, confidence, celebration, motivation, defeat, agreement, wealth, luxury, aspiration, focus, teaching, money, morning, reflection, confusion, tension

Return ONLY JSON:
{"title":"...","description":"...","hashtags":["#ICTTrading","..."],"contentType":"${contentType.id}","seriesName":"or null","seriesNumber":null,"mood":"tense|confident|lofi|cinematic","scenes":[{"text":"...","captions":["CAP1","CAP2"],"visualType":"stock_video or chart_image","visualQuery":"...","emotion":"see list above"}],"highlightWords":["..."]}`,
    }],
  });

  let text = response.content[0].type === "text" ? response.content[0].text : "";
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  const script = JSON.parse(text);
  script.script = script.scenes.map((s: { text: string }) => s.text).join(" ");

  // Update series tracker
  if (script.seriesName && script.seriesNumber) {
    seriesTracker[script.seriesName] = script.seriesNumber;
  }
  seriesTracker._recentTypes = [...recentTypes.slice(-20), contentType.id];
  await commitFile("data/shorts/series-tracker.json", JSON.stringify(seriesTracker, null, 2), "Update series tracker").catch(() => {});

  const slug = script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

  // Generate voice
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
  const voiceRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: script.script,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.3, similarity_boost: 0.85, style: 0.7, use_speaker_boost: true },
    }),
  });
  if (!voiceRes.ok) throw new Error(`ElevenLabs: ${(await voiceRes.text()).slice(0, 100)}`);
  const voiceBuffer = Buffer.from(await voiceRes.arrayBuffer());

  // Upload audio to GitHub
  const audioBase64 = voiceBuffer.toString("base64");
  await commitFile(`shorts-audio/${slug}.mp3`, audioBase64, `Short: ${slug}`, true);

  // Get audio URL
  const repo = process.env.GITHUB_REPO || "JidoLab/r2f-trading";
  const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/shorts-audio/${slug}.mp3`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
  });
  const ghData = await ghRes.json();
  const audioUrl = ghData.download_url;

  // Transcribe with Whisper — get word-level timestamps for precise caption sync
  const formData = new FormData();
  formData.append("file", new Blob([voiceBuffer], { type: "audio/mp3" }), "voice.mp3");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");
  formData.append("timestamp_granularities[]", "segment");
  const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });
  if (!whisperRes.ok) throw new Error(`Whisper: ${(await whisperRes.text()).slice(0, 100)}`);
  const transcription = await whisperRes.json();
  const duration = transcription.duration || 30;

  // Fetch visuals — prefer stock video, recycle saved images, generate new only if needed
  const visuals: { type: "video" | "image"; url: string }[] = [];
  const usedClipUrls = new Set<string>(); // prevent same clip twice in one video
  const token = process.env.GITHUB_TOKEN!;

  // Load saved image library for recycling
  let savedImages: { tag: string; url: string }[] = [];
  try {
    const imgLib = await readFile("data/shorts/image-library.json");
    savedImages = JSON.parse(imgLib);
  } catch {}

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    let found = false;

    // Priority 1: Stock video (most scenes should use this)
    if (scene.visualType === "stock_video" || scene.visualType !== "chart_image") {
      const stockTag = EMOTION_MAP[scene.emotion] || EMOTION_MAP[scene.visualType] || "";
      const clips = STOCK_LIBRARY[stockTag] || [];
      // Pick a random clip that hasn't been used yet in this video
      const available = clips.filter(c => !usedClipUrls.has(c.url));
      if (available.length > 0) {
        const clip = available[Math.floor(Math.random() * available.length)];
        visuals.push({ type: "video", url: clip.url });
        usedClipUrls.add(clip.url);
        found = true;
      } else if (clips.length > 0) {
        // All used — pick any random one
        const clip = clips[Math.floor(Math.random() * clips.length)];
        visuals.push({ type: "video", url: clip.url });
        found = true;
      }
    }

    // Priority 2: Check saved image library for matching tag
    if (!found && scene.visualType === "chart_image") {
      const query = (scene.visualQuery || "").toLowerCase();
      const match = savedImages.find(img => query.includes(img.tag) || img.tag.includes(query.split(" ")[0]));
      if (match) {
        visuals.push({ type: "image", url: match.url });
        found = true;
      }
    }

    // Priority 3: Generate new image with Gemini and save for recycling
    if (!found && process.env.GEMINI_API_KEY && scene.visualType === "chart_image") {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await ai.models.generateContent({
          model: "gemini-3.1-flash-image-preview",
          contents: `${scene.visualQuery}. Style: Professional trading chart on dark navy (#0d2137) background with gold (#c9a84c) highlights. Vertical 9:16. Sharp. No text.`,
          config: { responseModalities: ["TEXT", "IMAGE"] },
        });
        for (const part of res.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData && !found) {
            // Save with descriptive tag for recycling
            const tag = (scene.visualQuery || "chart").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
            const filename = `shorts-assets/library/${tag}-${Date.now()}.jpg`;
            try {
              await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ message: `Chart: ${tag}`, content: part.inlineData.data }),
              });
              const imgRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, { headers: { Authorization: `Bearer ${token}` } });
              const imgData = await imgRes.json();
              if (imgData.download_url) {
                visuals.push({ type: "image", url: imgData.download_url });
                // Save to recycling library
                savedImages.push({ tag, url: imgData.download_url });
                await commitFile("data/shorts/image-library.json", JSON.stringify(savedImages, null, 2), `Image library: +${tag}`).catch(() => {});
                found = true;
              }
            } catch {}
          }
        }
      } catch {}
    }

    // Fallback: random stock video from any category
    if (!found) {
      const allCategories = Object.keys(STOCK_LIBRARY);
      const randomCat = allCategories[Math.floor(Math.random() * allCategories.length)];
      const clips = STOCK_LIBRARY[randomCat];
      const clip = clips[Math.floor(Math.random() * clips.length)];
      visuals.push({ type: "video", url: clip.url });
    }
  }

  // Build captions: use Whisper words but split at natural phrase boundaries
  const words: { word: string; start: number; end: number }[] = transcription.words || [];
  const segments: { start: number; end: number; text: string }[] = transcription.segments || [];
  const highlightWords = (script.highlightWords || []).map((w: string) => w.toLowerCase());
  const captions: { text: string; start: number; end: number; isHighlight: boolean; isHook: boolean }[] = [];

  if (words.length > 0) {
    // Smart phrase grouping: split at punctuation, pauses, and natural breaks
    let chunk: typeof words = [];
    const flush = () => {
      if (chunk.length === 0) return;
      const text = chunk.map(w => w.word).join(" ").trim().toUpperCase();
      const start = chunk[0].start;
      const end = chunk[chunk.length - 1].end;
      const isHl = highlightWords.some((hw: string) => text.toLowerCase().includes(hw));
      captions.push({ text, start, end, isHighlight: isHl, isHook: captions.length === 0 });
      chunk = [];
    };

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      chunk.push(w);
      const wordText = w.word.trim();
      const nextWord = words[i + 1];

      // Check for natural break points
      const endsWithPunctuation = /[.!?,;:\-—]$/.test(wordText);
      const hasLongPause = nextWord && (nextWord.start - w.end) > 0.3;
      const atMaxWords = chunk.length >= 5;
      const atGoodLength = chunk.length >= 3;
      const isLastWord = i === words.length - 1;

      // Flush at: punctuation, long pauses, max length, or end
      if (isLastWord || atMaxWords || (atGoodLength && (endsWithPunctuation || hasLongPause)) || endsWithPunctuation) {
        flush();
      }
    }
    flush(); // catch any remaining
  } else if (segments.length > 0) {
    // Fallback: use Whisper segments as captions
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const text = seg.text.trim().toUpperCase();
      const isHl = highlightWords.some((hw: string) => text.toLowerCase().includes(hw));
      captions.push({ text, start: seg.start, end: seg.end, isHighlight: isHl, isHook: i === 0 });
    }
  }

  const sceneDur = duration / Math.max(visuals.length, 1);
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
      { type: "shape", shape: "rectangle", fill_color: "#0d2137", x: "50%", y: "50%", width: "100%", height: "100%" },
      ...bgElements,
      { type: "shape", shape: "rectangle", fill_color: "rgba(0,0,0,0.35)", x: "50%", y: "50%", width: "100%", height: "100%" },
      { type: "audio", source: audioUrl },
      { type: "shape", shape: "rectangle", fill_color: "#c9a84c", x: "0%", y: "99.5%", width: "0%", height: "0.5%", x_anchor: "0%", animations: [{ type: "slide", duration, direction: "right", distance: "100%", easing: "linear" }] },
      { type: "text", text: "R2F", font_family: "Montserrat", font_weight: "900", font_size: "5 vmin", fill_color: "#c9a84c", opacity: "50%", x: "90%", y: "5%" },
      ...captions.map((cap) => ({
        type: "text", text: cap.text, font_family: "Montserrat", font_weight: "900",
        font_size: cap.isHook ? "12 vmin" : cap.isHighlight ? "10 vmin" : "8.5 vmin",
        fill_color: cap.isHook || cap.isHighlight ? "#EEFF00" : "#ffffff",
        stroke_color: "#000000", stroke_width: cap.isHook ? "1 vmin" : "0.6 vmin",
        shadow_color: "rgba(0,0,0,0.9)", shadow_blur: cap.isHook ? "14" : "10", shadow_x: "2", shadow_y: "2",
        x: "50%", y: cap.isHook ? "45%" : "73%", width: "88%",
        x_alignment: "50%", y_alignment: "50%", text_alignment: "center",
        time: cap.start, duration: Math.max(cap.end - cap.start, 0.3),
        animations: [
          { type: "scale", duration: 0.15, start_scale: cap.isHook ? "160%" : "130%", end_scale: "100%", easing: "ease-out" },
          ...(cap.isHook ? [] : [{ type: "slide", duration: 0.15, direction: "up", distance: "3%", easing: "ease-out" }]),
        ],
      })),
    ],
  };

  // Trigger Creatomate render with webhook
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://r2ftrading.com";
  const webhookUrl = `${siteUrl}/api/shorts/webhook`;

  const renderRes = await fetch("https://api.creatomate.com/v1/renders", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source, webhook_url: webhookUrl }),
  });

  if (!renderRes.ok) throw new Error(`Creatomate: ${(await renderRes.text()).slice(0, 200)}`);
  const renders = await renderRes.json();
  const renderData = Array.isArray(renders) ? renders[0] : renders;
  const renderId = renderData?.id;

  // Save pending render data to GitHub
  await commitFile(`data/shorts/renders/${slug}.json`, JSON.stringify({
    slug,
    renderId,
    title: script.title,
    description: script.description,
    hashtags: script.hashtags,
    script: script.script,
    contentType: script.contentType || contentType.id,
    seriesName: script.seriesName,
    seriesNumber: script.seriesNumber,
    autoPublish,
    createdAt: new Date().toISOString(),
    status: "rendering",
  }, null, 2), `Render started: ${script.title.slice(0, 30)}`);

  return { slug, title: script.title, status: "rendering" };
}
