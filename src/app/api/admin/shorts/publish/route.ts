import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile, listFiles } from "@/lib/github";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

    // Find the render data
    let renderData: any = null;
    let renderPath = "";
    try {
      const files = await listFiles("data/shorts/renders");
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const raw = await readFile(file);
        const data = JSON.parse(raw);
        if (data.slug === slug) { renderData = data; renderPath = file; break; }
      }
    } catch {}

    if (!renderData || !renderData.videoUrl) {
      return NextResponse.json({ error: "Video not found or not ready" }, { status: 404 });
    }

    const videoUrl = renderData.videoUrl;
    const results: { platform: string; status: string; url?: string }[] = [];

    // YouTube
    try {
      const token = process.env.YOUTUBE_ACCESS_TOKEN;
      if (token) {
        const videoRes = await fetch(videoUrl);
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
        const description = `${renderData.description}\n\n${(renderData.hashtags || []).join(" ")}\n\n📈 Free ICT Trading Checklist: https://r2ftrading.com\n🔔 Subscribe for daily trading insights`;
        const initRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            snippet: { title: renderData.title, description, tags: (renderData.hashtags || []).map((h: string) => h.replace("#", "")), categoryId: "22" },
            status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
          }),
        });
        if (initRes.ok) {
          const uploadUrl = initRes.headers.get("location");
          if (uploadUrl) {
            const uploadRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "video/mp4", "Content-Length": videoBuffer.length.toString() },
              body: videoBuffer,
            });
            if (uploadRes.ok) {
              const result = await uploadRes.json();
              results.push({ platform: "youtube", status: "success", url: `https://youtube.com/shorts/${result.id}` });
            } else {
              results.push({ platform: "youtube", status: "error" });
            }
          }
        } else {
          results.push({ platform: "youtube", status: "error" });
        }
      }
    } catch (e: any) {
      results.push({ platform: "youtube", status: "error" });
    }

    // Facebook Reels
    try {
      const pageId = process.env.FACEBOOK_PAGE_ID;
      const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (pageId && token) {
        const desc = `${renderData.title}\n\n${renderData.description?.slice(0, 200)}\n\n${(renderData.hashtags || []).join(" ")}`;
        const initRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upload_phase: "start", access_token: token }),
        });
        if (initRes.ok) {
          const { video_id } = await initRes.json();
          const videoRes = await fetch(videoUrl);
          const videoData = Buffer.from(await videoRes.arrayBuffer());
          const uploadRes = await fetch(`https://rupload.facebook.com/video-upload/v21.0/${video_id}`, {
            method: "POST",
            headers: { Authorization: `OAuth ${token}`, "Content-Type": "application/octet-stream", file_size: videoData.length.toString() },
            body: videoData,
          });
          if (uploadRes.ok) {
            const finishRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ upload_phase: "finish", video_id, description: desc, access_token: token }),
            });
            results.push({ platform: "facebook_reel", status: finishRes.ok ? "success" : "error" });
          }
        }
      }
    } catch { results.push({ platform: "facebook_reel", status: "error" }); }

    // LinkedIn
    try {
      const liToken = process.env.LINKEDIN_ACCESS_TOKEN;
      const personUrn = process.env.LINKEDIN_PERSON_URN;
      if (liToken && personUrn) {
        const videoRes = await fetch(videoUrl);
        const videoData = Buffer.from(await videoRes.arrayBuffer());
        const initRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
          method: "POST", headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ registerUploadRequest: { recipes: ["urn:li:digitalmediaRecipe:feedshare-video"], owner: personUrn, serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }] } }),
        });
        if (initRes.ok) {
          const initData = await initRes.json();
          const upUrl = initData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
          const asset = initData.value?.asset;
          if (upUrl && asset) {
            await fetch(upUrl, { method: "PUT", headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/octet-stream" }, body: videoData });
            const commentary = `${renderData.title}\n\n${renderData.description?.slice(0, 200)}\n\n${(renderData.hashtags || []).join(" ")}`;
            const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
              method: "POST", headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ author: personUrn, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: commentary }, shareMediaCategory: "VIDEO", media: [{ status: "READY", media: asset }] } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }),
            });
            results.push({ platform: "linkedin", status: postRes.ok ? "success" : "error" });
          }
        }
      }
    } catch { results.push({ platform: "linkedin", status: "error" }); }

    // Telegram + Discord
    const ytUrl = results.find(r => r.platform === "youtube" && r.status === "success")?.url;
    if (ytUrl) {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      if (tgToken) {
        const tgText = `🎬 *New Short: ${renderData.title}*\n\n${renderData.description?.slice(0, 120) || ""}\n\n👉 [Watch Now](${ytUrl})\n\n${(renderData.hashtags || []).join(" ")}`;
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHANNEL_ID || "@r2ftradinginsights", text: tgText, parse_mode: "Markdown" }),
        }).catch(() => {});
      }
      const discordUrl = process.env.DISCORD_WEBHOOK_URL;
      if (discordUrl) {
        await fetch(discordUrl, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "R2F Trading", embeds: [{ title: `🎬 ${renderData.title}`, url: ytUrl, description: renderData.description?.slice(0, 200), color: 0xc9a84c }] }),
        }).catch(() => {});
      }
    }

    // Update render data
    await commitFile(renderPath, JSON.stringify({
      ...renderData,
      status: "published",
      youtubeUrl: ytUrl || renderData.youtubeUrl,
      uploadResults: results,
      publishedAt: new Date().toISOString(),
    }, null, 2), `Published: ${renderData.title.slice(0, 30)}`);

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
