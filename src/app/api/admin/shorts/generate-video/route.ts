import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentDateContext } from "@/lib/date-context";
import {
  buildEnrichedCaptions,
  buildFallbackCaptions,
  type EnrichedCaption,
} from "@/lib/shorts-captions";
import {
  findBestImageMatch,
  incrementImageUsage,
} from "@/lib/shorts-image-matcher";

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

// Stock video library — all portrait HD, verified accessible via Pexels API
const STOCK_LIBRARY: Record<string, { url: string }[]> = {
  frustration: [
    { url: "https://videos.pexels.com/video-files/18503891/18503891-hd_1080_1920_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/8530543/8530543-hd_1080_2048_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/8873041/8873041-hd_1080_1920_25fps.mp4" },
  ],
  thinking: [
    { url: "https://videos.pexels.com/video-files/8226005/8226005-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7924472/7924472-hd_1080_1920_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/8555748/8555748-hd_1080_1920_24fps.mp4" },
  ],
  surprise: [
    { url: "https://videos.pexels.com/video-files/8627749/8627749-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6657887/6657887-hd_1080_1920_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/18503908/18503908-hd_1080_1920_30fps.mp4" },
  ],
  screen_glow: [
    { url: "https://videos.pexels.com/video-files/8480680/8480680-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/8480278/8480278-hd_1080_1920_25fps.mp4" },
  ],
  lightbulb: [
    { url: "https://videos.pexels.com/video-files/9196607/9196607-hd_1080_2048_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/5647316/5647316-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/5094588/5094588-hd_1080_2048_25fps.mp4" },
  ],
  typing_trade: [
    { url: "https://videos.pexels.com/video-files/6963412/6963412-hd_1080_1920_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/8873184/8873184-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7546674/7546674-hd_1080_1920_25fps.mp4" },
  ],
  celebration: [
    { url: "https://videos.pexels.com/video-files/6532231/6532231-hd_1080_1920_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7165664/7165664-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7842360/7842360-hd_1080_1920_30fps.mp4" },
  ],
  walking_city: [
    { url: "https://videos.pexels.com/video-files/8394092/8394092-hd_1080_1920_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/8151972/8151972-hd_1080_1920_30fps.mp4" },
  ],
  phone_chart: [
    { url: "https://videos.pexels.com/video-files/7580285/7580285-hd_1080_2048_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7691557/7691557-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7989855/7989855-hd_1080_1920_25fps.mp4" },
  ],
  focus_intense: [
    { url: "https://videos.pexels.com/video-files/9945187/9945187-hd_1080_1920_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/9945196/9945196-hd_1080_1920_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/9943349/9943349-hd_1080_1920_24fps.mp4" },
  ],
  money: [
    { url: "https://videos.pexels.com/video-files/6266430/6266430-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6326861/6326861-hd_1080_2048_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/6266251/6266251-hd_1080_1920_25fps.mp4" },
  ],
  defeat: [
    { url: "https://videos.pexels.com/video-files/7350231/7350231-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7924956/7924956-hd_1080_1920_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7924517/7924517-hd_1080_1920_24fps.mp4" },
  ],
  agreement: [
    { url: "https://videos.pexels.com/video-files/7735910/7735910-hd_1080_1920_25fps.mp4" },
    { url: "https://videos.pexels.com/video-files/7953586/7953586-hd_1080_1920_30fps.mp4" },
    { url: "https://videos.pexels.com/video-files/8731519/8731519-hd_1080_1920_25fps.mp4" },
  ],
  luxury: [
    { url: "https://videos.pexels.com/video-files/28408297/12377001_1080_1920_29fps.mp4" },
    { url: "https://videos.pexels.com/video-files/35412849/15004256_1080_1920_30fps.mp4" },
  ],
  morning: [
    { url: "https://videos.pexels.com/video-files/27917231/12262914_1080_1920_60fps.mp4" },
  ],
  pointing: [
    { url: "https://videos.pexels.com/video-files/7414131/7414131-hd_1080_1920_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/5897669/5897669-hd_1080_1920_24fps.mp4" },
    { url: "https://videos.pexels.com/video-files/5904539/5904539-hd_1080_1920_24fps.mp4" },
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
    const { topic, count = 1, autoPublish = false, contentType, duration } = await req.json();
    const results: { slug: string; title: string; status: string }[] = [];

    for (let n = 0; n < Math.min(count, 5); n++) {
      try {
        const result = await generateSingleShort(
          topic && count === 1 ? topic : undefined,
          autoPublish,
          contentType || undefined,
          duration || undefined,
        );
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

export async function generateSingleShort(topic?: string, autoPublish = false, forceContentType?: string, forceDuration?: number) {
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

  let contentType;
  if (forceContentType) {
    contentType = contentTypes.find(t => t.id === forceContentType) || contentTypes[0];
  } else {
    const typeCounts: Record<string, number> = {};
    for (const t of recentTypes) typeCounts[t] = (typeCounts[t] || 0) + 1;
    const sorted = [...contentTypes].sort((a, b) => (typeCounts[a.id] || 0) - (typeCounts[b.id] || 0));
    contentType = sorted[0];
  }

  const hookExample = VIRAL_HOOKS[Math.floor(Math.random() * VIRAL_HOOKS.length)];

  // Get market context for trend-aware content
  let marketContext = "";
  try {
    const { buildMarketContext } = await import("@/lib/market-trends");
    marketContext = await buildMarketContext();
  } catch {}

  // Get series tracker
  let seriesTracker: Record<string, any> = {};
  try { seriesTracker = JSON.parse(await readFile("data/shorts/series-tracker.json")); } catch {}

  // Get available image library patterns — scripts that reference these will
  // get matched to real chart images instead of generic stock video
  let imagePatternHint = "";
  try {
    const { getLibraryTaxonomy } = await import("@/lib/shorts-image-matcher");
    const taxonomy = await getLibraryTaxonomy();
    if (taxonomy.imageCount > 0) {
      imagePatternHint = `

AVAILABLE CHART IMAGES (prefer these concepts so scenes can match real chart visuals):
Patterns: ${taxonomy.patterns.slice(0, 15).join(", ")}
Pairs/topics in library: ${taxonomy.tags.filter(t => /^(EUR|USD|GBP|XAU|BTC|DXY|NAS|NFP|ICT)/i.test(t)).slice(0, 10).join(", ")}
When your script mentions one of these concepts, set visualType=chart_image and describe the chart clearly in visualQuery.`;
    }
  } catch {}

  // Generate script
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    messages: [{
      role: "user",
      content: `Generate a YouTube Shorts script for R2F Trading, an ICT trading coaching brand by Harvest Wright (10+ years experience).

${getCurrentDateContext()}

${topic ? `TOPIC: "${topic}"` : "Pick an engaging ICT trading topic. PRIORITIZE timely/trending topics if available below — they get more views."}
CONTENT TYPE: ${contentType.id} — ${contentType.name}. ${contentType.description}
SCENE STRUCTURE: ${contentType.sceneTemplate}
TARGET: ${forceDuration || contentType.targetDuration} seconds (~${forceDuration ? Math.round(forceDuration * 2.5) : contentType.targetWords} words), ${contentType.sceneCount} scenes
VIRAL HOOK INSPIRATION: "${hookExample}"
SERIES: ${JSON.stringify(Object.fromEntries(Object.entries(seriesTracker).filter(([k]) => k !== "_recentTypes")))}
${marketContext}
${imagePatternHint}

═══ HOOK QUALITY (this determines 90% of performance) ═══
The FIRST SCENE (hook) must create an "open loop" — make the viewer NEED to know the answer.

HOOK PATTERNS THAT WORK (pick one, don't repeat the same pattern):
- CONTRARIAN: "Everyone says [common belief]. They're wrong. Here's why."
- SPECIFIC NUMBER: "I lost $4,700 in one trade. Then I found this."
- IDENTITY CALL-OUT: "If you've blown a funded account, this is for you."
- CURIOSITY GAP: "There's one thing funded traders do that beginners never will."
- PATTERN INTERRUPT: "Stop. Before your next trade, check this one thing."
- BEFORE/AFTER: "6 months ago I was down 30%. Here's what changed."

BAD HOOKS (never use): "Today I'm going to show you...", "In this video...", "Hey traders...", "Did you know..."

═══ SCRIPT QUALITY ═══
- NEVER mention any person's name
- Short punchy sentences. 3-7 words per sentence. One idea per sentence.
- Each scene must END with a reason to keep watching the next scene (micro-cliffhanger)
- Include ONE specific number or stat per short (makes it feel real, not generic)
- The VOICE should feel like talking to a friend at a bar, not presenting to a classroom
- Vary energy: tense → revelation → calm confidence → urgency

═══ SCENE RULES ═══
- Scene 1 (HOOK): Must grab attention in under 2 seconds. No setup, no context — straight to the hook.
- Middle scenes: Build tension or deliver value. Each scene should make the viewer think "wait, really?"
- Second-to-last scene: The PAYOFF — deliver the insight, the answer, the technique
- LAST scene: CTA — always mention "R2F Trading" and "follow". Vary the CTA: "Follow R2F Trading for more setups like this." / "R2F Trading. Link in bio for the free checklist." / "Follow R2F Trading. New tips every day."

VISUAL PRIORITY: Use "stock_video" for MOST scenes — people's emotions (frustration, shock, celebration) get more attention than charts. Only use "chart_image" for 1 scene MAX. Final CTA scene: "stock_video" with emotion "motivation" or "luxury" or "celebration".
Available emotions: shock, frustration, curiosity, revelation, confidence, celebration, motivation, defeat, agreement, wealth, luxury, aspiration, focus, teaching, money, morning, reflection, confusion, tension

═══ CAPTION QUALITY ═══
Captions are the PRIMARY way viewers consume Shorts (85% watch with sound off).
- Each caption should be 2-5 words MAX (displayed as large text overlay)
- Use POWER WORDS in captions: "secret", "mistake", "funded", "broke", "changed", "truth", "never"
- The hook caption must be THE most attention-grabbing text on screen
- Include the highlight word for emphasis in each caption

Return ONLY JSON:
{"title":"...","description":"...","hashtags":["#ICTTrading","..."],"contentType":"${contentType.id}","seriesName":"or null","seriesNumber":null,"mood":"tense|confident|lofi|cinematic","scenes":[{"text":"...","captions":["CAP1","CAP2"],"visualType":"stock_video or chart_image","visualQuery":"...","emotion":"see list above"}],"highlightWords":["..."]}`,
    }],
  });

  let text = response.content[0].type === "text" ? response.content[0].text : "";
  // Extract JSON robustly — find the first { and last }
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in Claude response");
  text = text.slice(jsonStart, jsonEnd + 1);
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

  // Fetch visuals — prefer rich image library for chart scenes, stock video otherwise
  const visuals: { type: "video" | "image"; url: string }[] = [];
  const usedClipUrls = new Set<string>(); // prevent same asset twice in one video
  const token = process.env.GITHUB_TOKEN!;
  const usedImageIds: string[] = []; // for usage tracking after render

  // Legacy recycling library (Gemini-generated) — kept for backwards compat
  let savedImages: { tag: string; url: string }[] = [];
  try {
    const imgLib = await readFile("data/shorts/image-library.json");
    savedImages = JSON.parse(imgLib);
  } catch {}

  // Full script text — feeds image matcher's secondary context score
  const scriptContext = script.scenes
    .map((s: { content?: string; visualQuery?: string }) => `${s.content || ""} ${s.visualQuery || ""}`)
    .join(" ");

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    let found = false;

    // Priority 1 (chart_image only): Rich image library (/admin/image-library tagged content)
    if (scene.visualType === "chart_image") {
      const best = await findBestImageMatch(
        scene.visualQuery || scene.content || "",
        scriptContext,
        usedClipUrls,
      );
      if (best) {
        visuals.push({ type: "image", url: best.url });
        usedClipUrls.add(best.url);
        usedImageIds.push(best.id);
        found = true;
        console.log(`[shorts] Scene ${i}: matched library image "${best.description.slice(0, 60)}" (tags: ${best.tags.join(",")})`);
      }
    }

    // Priority 2: Stock video (most non-chart scenes)
    if (!found && (scene.visualType === "stock_video" || scene.visualType !== "chart_image")) {
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

    // Priority 3: Legacy Gemini-generated image library fallback
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

  // Build ENRICHED captions with word-level timings + power-word classification.
  // Feeds the DO renderer which generates ASS subtitle files with karaoke effect
  // (per-word highlighting) and power-word color emphasis.
  const words: { word: string; start: number; end: number }[] = transcription.words || [];
  const segments: { start: number; end: number; text: string }[] = transcription.segments || [];
  const highlightWords: string[] = script.highlightWords || [];
  const enrichedCaptions: EnrichedCaption[] =
    words.length > 0
      ? buildEnrichedCaptions(words, highlightWords)
      : buildFallbackCaptions(segments, highlightWords);

  // Legacy flat-caption shape retained for Creatomate fallback path only
  const captions = enrichedCaptions.map((c) => ({
    text: c.text,
    start: c.start,
    end: c.end,
    isHighlight: c.words.some((w) => w.style !== "normal"),
    isHook: c.isHook,
  }));

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

  // Trigger video render with webhook
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.r2ftrading.com";
  const webhookUrl = `${siteUrl}/api/shorts/webhook`;

  let renderId: string;

  if (process.env.VIDEO_RENDER_URL) {
    // Use FFmpeg render service (Render.com) instead of Creatomate
    const renderRes = await fetch(process.env.VIDEO_RENDER_URL + "/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RENDER_SECRET}`,
      },
      body: JSON.stringify({
        slug,
        audioUrl,
        duration,
        scenes: visuals.map((vis, i) => ({
          type: vis.type,
          url: vis.url,
          start: i * sceneDur,
          duration: sceneDur,
        })),
        captions: captions.map((c) => ({
          text: c.text,
          start: c.start,
          end: c.end,
          isHook: c.isHook,
          isHighlight: c.isHighlight,
        })),
        // Enriched caption data with word-level timings + power-word styles.
        // DO renderer prefers this if present (for ASS karaoke captions).
        // Falls back to legacy `captions` array if absent.
        enrichedCaptions: enrichedCaptions.map((c) => ({
          text: c.text,
          start: c.start,
          end: c.end,
          isHook: c.isHook,
          words: c.words,
        })),
        webhookUrl,
        githubToken: process.env.GITHUB_TOKEN,
        githubRepo: process.env.GITHUB_REPO || "JidoLab/r2f-trading",
      }),
    });

    if (!renderRes.ok) throw new Error(`FFmpeg Render Service: ${(await renderRes.text()).slice(0, 200)}`);
    renderId = `render-${slug}`;

    // Increment usage count for matched library images (best-effort, non-blocking)
    for (const imgId of usedImageIds) {
      incrementImageUsage(imgId).catch(() => {});
    }
  } else {
    // Fallback: Creatomate
    const renderRes = await fetch("https://api.creatomate.com/v1/renders", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source, webhook_url: webhookUrl }),
    });

    if (!renderRes.ok) throw new Error(`Creatomate: ${(await renderRes.text()).slice(0, 200)}`);
    const renders = await renderRes.json();
    const renderData = Array.isArray(renders) ? renders[0] : renders;
    renderId = renderData?.id;
  }

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
