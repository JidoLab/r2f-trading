import { NextRequest, NextResponse } from "next/server";
import { commitFile, readFile, listFiles } from "@/lib/github";

export const maxDuration = 120; // 2 minutes

/**
 * Daily Market Brief Cron
 * Generates a ~2-minute audio market brief using Claude + ElevenLabs,
 * uploads to GitHub, saves metadata, and posts to Telegram.
 * Schedule: 0 1 * * * (8AM Bangkok)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Use Bangkok timezone for consistent dating
    const bangkokNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
    );
    const date = bangkokNow.toISOString().split("T")[0];
    const dayName = bangkokNow.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const fullDate = bangkokNow.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Check if already generated today
    try {
      await readFile(`data/market-briefs/${date}.json`);
      return NextResponse.json({
        skipped: true,
        reason: `Market brief already generated for ${date}`,
      });
    } catch {
      // Not generated yet — continue
    }

    // ---- 1. Build market context ----
    const { buildMarketContext } = await import("@/lib/market-trends");
    const marketContext = await buildMarketContext();

    // ---- 2. Generate script with Claude ----
    const scriptPrompt = `You are Harvest, a professional ICT trading coach from R2F Trading.
Write a daily market brief script that will be read aloud as a ~2 minute audio clip (250-300 words).

Today is ${dayName}, ${fullDate}.

${marketContext}

Structure:
1. Opening: "Good morning traders, this is Harvest from R2F Trading with your daily market brief for ${dayName}, ${fullDate}."
2. Key levels to watch today (mention specific pairs like EUR/USD, GBP/USD, Gold, or indices — reference order blocks, FVGs, or liquidity zones)
3. Any upcoming economic events and how to position around them
4. One actionable ICT setup tip for today (e.g., "Look for a liquidity sweep below yesterday's low on EUR/USD during London session, then watch for a bullish order block entry")
5. Sign-off: "This is Harvest from R2F Trading. Follow us for daily insights."

Rules:
- Write EXACTLY what will be spoken — no stage directions, no brackets, no notes
- Keep it conversational and confident, like a morning radio host who trades
- Be specific with levels/pairs where possible (use realistic price areas)
- 250-300 words strictly
- No markdown formatting — plain spoken text only`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: scriptPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API failed: ${claudeRes.status} ${err}`);
    }

    const claudeData = await claudeRes.json();
    const script =
      claudeData.content?.[0]?.text?.trim() || "Script generation failed.";

    // Generate a short title from the script
    const titleMatch = script.match(
      /(?:key level|watch|focus|eye on|looking at)\s+(.{10,60}?)[\.,!]/i
    );
    const title =
      titleMatch?.[1]?.trim() ||
      `Market Brief — ${dayName}, ${fullDate.split(",")[0].trim()}`;
    const briefTitle = `Daily Market Brief — ${fullDate}`;

    // ---- 3. Generate voice with ElevenLabs ----
    const voiceId =
      process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
    const voiceRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.85,
            style: 0.7,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!voiceRes.ok) {
      const err = await voiceRes.text();
      throw new Error(`ElevenLabs API failed: ${voiceRes.status} ${err}`);
    }

    const voiceBuffer = Buffer.from(await voiceRes.arrayBuffer());

    // Estimate duration: ~150 words per minute for narration
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60); // seconds

    // ---- 4. Upload audio to GitHub ----
    const audioPath = `public/market-briefs/${date}.mp3`;
    const audioBase64 = voiceBuffer.toString("base64");
    await commitFile(
      audioPath,
      audioBase64,
      `Add market brief audio for ${date}`,
      true
    );

    // ---- 5. Save metadata to GitHub ----
    const metadata = {
      date,
      title: briefTitle,
      script,
      audioUrl: `/market-briefs/${date}.mp3`,
      duration: estimatedDuration,
      wordCount,
      generatedAt: new Date().toISOString(),
    };

    await commitFile(
      `data/market-briefs/${date}.json`,
      JSON.stringify(metadata, null, 2),
      `Add market brief metadata for ${date}`
    );

    // ---- 6. Post to Telegram ----
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;

    if (tgToken && chatId) {
      try {
        const form = new FormData();
        form.append("chat_id", chatId);
        form.append(
          "audio",
          new Blob([voiceBuffer], { type: "audio/mpeg" }),
          "market-brief.mp3"
        );
        form.append("title", briefTitle);
        form.append(
          "caption",
          `Daily Market Brief \u2014 ${fullDate}\n\n${script.slice(0, 200)}...\n\nListen: https://www.r2ftrading.com/market-brief`
        );

        await fetch(
          `https://api.telegram.org/bot${tgToken}/sendAudio`,
          { method: "POST", body: form }
        );
      } catch (tgErr) {
        console.error("Telegram post failed:", tgErr);
        // Non-fatal — brief is still generated
      }
    }

    return NextResponse.json({
      success: true,
      date,
      title: briefTitle,
      audioUrl: metadata.audioUrl,
      duration: estimatedDuration,
      wordCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    console.error("Market brief generation failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
