import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile, listFiles } from "@/lib/github";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { id: renderId, status, url: videoUrl } = payload;

    if (status !== "succeeded" || !videoUrl) {
      // Mark failed renders so they don't sit as "rendering" forever
      if (status === "failed") {
        console.error("[webhook] Render failed:", renderId, payload.error_message);
        try {
          const files = await listFiles("data/shorts/renders");
          for (const file of files) {
            if (!file.endsWith(".json")) continue;
            try {
              const raw = await readFile(file);
              const data = JSON.parse(raw);
              if (data.renderId === renderId) {
                await commitFile(file, JSON.stringify({
                  ...data,
                  status: "failed",
                  error: payload.error_message || "Render failed",
                  failedAt: new Date().toISOString(),
                }, null, 2), `Failed: ${data.title?.slice(0, 30) || renderId}`);
                break;
              }
            } catch {}
          }
        } catch {}
      }
      return NextResponse.json({ ok: true });
    }

    // Find the render data by scanning pending renders
    let renderData: any = null;
    let renderSlug = "";
    try {
      const files = await listFiles("data/shorts/renders");
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = await readFile(file);
          const data = JSON.parse(raw);
          if (data.renderId === renderId) {
            renderData = data;
            renderSlug = data.slug;
            break;
          }
        } catch {}
      }
    } catch {}

    if (!renderData) {
      console.warn("[webhook] No matching render data for:", renderId);
      return NextResponse.json({ ok: true });
    }

    // Build copy text for manual platforms (TikTok, Instagram)
    const copyText = `${renderData.title}\n\n${renderData.description || ""}\n\n${(renderData.hashtags || []).join(" ")}`;

    // Only upload if autoPublish is enabled (cron jobs set this to true, manual generates don't)
    const results: { platform: string; status: string; url?: string }[] = [];
    let ytUrl: string | undefined;

    if (renderData.autoPublish) {
      // YouTube
      try {
        const ytResult = await uploadToYouTube(videoUrl, renderData);
        results.push({ platform: "youtube", ...ytResult });
        if (ytResult.status === "success") ytUrl = ytResult.url;
      } catch (e: any) {
        results.push({ platform: "youtube", status: "error", url: e.message?.slice(0, 100) });
      }

      // Facebook Reels
      try {
        const fbResult = await uploadToFBReel(videoUrl, renderData);
        results.push({ platform: "facebook_reel", ...fbResult });
      } catch (e: any) {
        results.push({ platform: "facebook_reel", status: "error" });
      }

      // LinkedIn Video
      try {
        const liResult = await uploadToLinkedIn(videoUrl, renderData);
        results.push({ platform: "linkedin", ...liResult });
      } catch (e: any) {
        results.push({ platform: "linkedin", status: "error" });
      }

      // Telegram + Discord announcements
      if (ytUrl) {
        const tgToken = process.env.TELEGRAM_BOT_TOKEN;
        const tgChannel = process.env.TELEGRAM_CHANNEL_ID || "@r2ftradinginsights";
        if (tgToken) {
          const tgText = `🎬 *New Short: ${renderData.title}*\n\n${renderData.description?.slice(0, 120) || ""}\n\n👉 [Watch Now](${ytUrl})\n\n${(renderData.hashtags || []).join(" ")}`;
          await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: tgChannel, text: tgText, parse_mode: "Markdown", disable_web_page_preview: false }),
          }).catch(() => {});
        }
        const discordUrl = process.env.DISCORD_WEBHOOK_URL;
        if (discordUrl) {
          await fetch(discordUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: "R2F Trading",
              embeds: [{ title: `🎬 ${renderData.title}`, url: ytUrl, description: renderData.description?.slice(0, 200), color: 0xc9a84c }],
            }),
          }).catch(() => {});
        }
      }
    }

    // Update render data with results
    await commitFile(`data/shorts/renders/${renderSlug}.json`, JSON.stringify({
      ...renderData,
      status: renderData.autoPublish ? "published" : "ready",
      videoUrl,
      youtubeUrl: ytUrl || null,
      copyText,
      uploadResults: results,
      completedAt: new Date().toISOString(),
    }, null, 2), `Completed: ${renderData.title.slice(0, 30)}`);

    // Update upload log
    let log: any[] = [];
    try { log = JSON.parse(await readFile("data/shorts/upload-log.json")); } catch {}
    log.push({
      date: new Date().toISOString(),
      slug: renderSlug,
      title: renderData.title,
      videoUrl,
      youtubeUrl: ytUrl || null,
      copyText,
      results,
    });
    if (log.length > 100) log = log.slice(-100);
    await commitFile("data/shorts/upload-log.json", JSON.stringify(log, null, 2), `Short upload: ${renderData.title.slice(0, 30)}`);

    return NextResponse.json({ ok: true, uploaded: results.length });
  } catch (err: unknown) {
    console.error("[webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// --- YouTube Upload ---
async function uploadToYouTube(videoUrl: string, data: any): Promise<{ status: string; url?: string }> {
  const token = process.env.YOUTUBE_ACCESS_TOKEN;
  if (!token) return { status: "skipped" };

  const videoRes = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

  const description = `${data.description}\n\n${(data.hashtags || []).join(" ")}\n\n📈 Free ICT Trading Checklist: https://r2ftrading.com\n🔔 Subscribe for daily trading insights`;

  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        snippet: { title: data.title, description, tags: (data.hashtags || []).map((h: string) => h.replace("#", "")), categoryId: "22" },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false, shorts: { isShort: true } },
      }),
    }
  );
  if (!initRes.ok) throw new Error(`YT init: ${(await initRes.text()).slice(0, 100)}`);
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("No upload URL");

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": videoBuffer.length.toString() },
    body: videoBuffer,
  });
  if (!uploadRes.ok) throw new Error(`YT upload: ${(await uploadRes.text()).slice(0, 100)}`);
  const result = await uploadRes.json();
  return { status: "success", url: `https://youtube.com/shorts/${result.id}` };
}

// --- Facebook Reels ---
async function uploadToFBReel(videoUrl: string, data: any): Promise<{ status: string }> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return { status: "skipped" };

  const description = `${data.title}\n\n${data.description?.slice(0, 200)}\n\n${(data.hashtags || []).join(" ")}`;

  const initRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_phase: "start", access_token: token }),
  });
  if (!initRes.ok) return { status: "error" };
  const { video_id } = await initRes.json();

  const videoRes = await fetch(videoUrl);
  const videoData = Buffer.from(await videoRes.arrayBuffer());

  const uploadRes = await fetch(`https://rupload.facebook.com/video-upload/v21.0/${video_id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${token}`, "Content-Type": "application/octet-stream", file_size: videoData.length.toString() },
    body: videoData,
  });
  if (!uploadRes.ok) return { status: "error" };

  const finishRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_phase: "finish", video_id, description, access_token: token }),
  });
  return { status: finishRes.ok ? "success" : "error" };
}

// --- LinkedIn Video ---
async function uploadToLinkedIn(videoUrl: string, data: any): Promise<{ status: string }> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;
  if (!token || !personUrn) return { status: "skipped" };

  const videoRes = await fetch(videoUrl);
  const videoData = Buffer.from(await videoRes.arrayBuffer());

  const initRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
        owner: personUrn,
        serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
      },
    }),
  });
  if (!initRes.ok) return { status: "error" };
  const initData = await initRes.json();
  const uploadUrl = initData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  const asset = initData.value?.asset;
  if (!uploadUrl || !asset) return { status: "error" };

  const upRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    body: videoData,
  });
  if (!upRes.ok) return { status: "error" };

  const commentary = `${data.title}\n\n${data.description?.slice(0, 200)}\n\n${(data.hashtags || []).join(" ")}`;
  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: commentary },
          shareMediaCategory: "VIDEO",
          media: [{ status: "READY", media: asset }],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  return { status: postRes.ok ? "success" : "error" };
}
