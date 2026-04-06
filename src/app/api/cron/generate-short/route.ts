import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";

export const maxDuration = 300; // 5 minutes for full pipeline

/**
 * Phase 12: Daily Automated Shorts Cron
 * Runs the full Shorts pipeline: topic → script → voice → render → upload
 *
 * NOTE: This cron triggers the pipeline but the heavy lifting
 * (voice generation, video rendering) uses external APIs.
 * The actual create-short script runs locally via npm.
 * For serverless, we generate the script + voice, commit to GitHub,
 * and the video rendering happens via Creatomate webhook or manual trigger.
 *
 * For full automation, this would need a server or cloud function
 * with longer timeout than Vercel's 300s limit.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if auto-generation is enabled
  try {
    const configRaw = await readFile("config/auto-generate-shorts.json");
    const config = JSON.parse(configRaw);
    if (!config.enabled) {
      return NextResponse.json({ skipped: true, reason: "Shorts auto-generation disabled" });
    }
  } catch {
    return NextResponse.json({ skipped: true, reason: "Shorts auto-generation not configured" });
  }

  try {
    // Step 1: Get topic from calendar or generate one
    let topic = "";
    let contentType = "";
    const today = new Date().toISOString().split("T")[0];

    try {
      const calRaw = await readFile("data/shorts/calendar.json");
      const calendar = JSON.parse(calRaw);
      const entry = calendar.find((e: { date: string; used: boolean }) => e.date === today && !e.used);
      if (entry) {
        topic = entry.topic;
        contentType = entry.contentType;
        // Mark as used
        entry.used = true;
        await commitFile("data/shorts/calendar.json", JSON.stringify(calendar, null, 2), `Calendar: used ${today}`);
      }
    } catch {}

    // Step 2: Generate script with Claude
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Generate a YouTube Shorts script for R2F Trading.
${topic ? `TOPIC: "${topic}"` : "Pick an engaging ICT trading topic."}
${contentType ? `CONTENT TYPE: ${contentType}` : ""}
30-40 seconds, 70-100 words. 4-6 scenes. Short punchy sentences.
Return ONLY JSON: {"title":"...","description":"...","hashtags":["..."],"script":"full script text","scenes":[{"text":"...","captions":["CAP1","CAP2"],"visualType":"chart_image","visualQuery":"...","emotion":"..."}],"highlightWords":["..."],"contentType":"..."}`,
      }],
    });

    let text = response.content[0].type === "text" ? response.content[0].text : "";
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const script = JSON.parse(text);

    // Step 3: Generate voice
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

    if (!voiceRes.ok) throw new Error(`ElevenLabs: ${await voiceRes.text()}`);
    const voiceBuffer = Buffer.from(await voiceRes.arrayBuffer());

    // Save script and audio to GitHub for later rendering
    const slug = script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    await commitFile(`data/shorts/pending/${slug}/script.json`, JSON.stringify(script, null, 2), `Short script: ${script.title}`);
    await commitFile(`shorts-audio/${slug}.mp3`, voiceBuffer.toString("base64"), `Short audio: ${slug}`, true);

    return NextResponse.json({
      success: true,
      title: script.title,
      slug,
      contentType: script.contentType || contentType,
      note: "Script and voice generated. Run 'npm run create-short' locally to render and upload, or use the admin dashboard.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
