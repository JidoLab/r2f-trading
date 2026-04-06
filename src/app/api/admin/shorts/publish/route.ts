import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile, listFiles } from "@/lib/github";

export const maxDuration = 300;

// Refresh YouTube access token using refresh token
async function getYouTubeAccessToken(): Promise<string | null> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

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

    // Download video once, reuse for all platforms
    const videoRes = await fetch(renderData.videoUrl);
    if (!videoRes.ok) return NextResponse.json({ error: "Failed to download video from Creatomate" }, { status: 500 });
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const results: { platform: string; status: string; url?: string; error?: string }[] = [];
    const description = `${renderData.description}\n\n${(renderData.hashtags || []).join(" ")}\n\n📈 Free ICT Trading Checklist: https://r2ftrading.com\n🔔 Subscribe for daily trading insights`;
    const shortDesc = `${renderData.title}\n\n${renderData.description?.slice(0, 200)}\n\n${(renderData.hashtags || []).join(" ")}`;

    // --- YouTube ---
    try {
      const ytToken = await getYouTubeAccessToken();
      if (!ytToken) {
        results.push({ platform: "youtube", status: "skipped", error: "No YouTube credentials" });
      } else {
        const initRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
          method: "POST",
          headers: { Authorization: `Bearer ${ytToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            snippet: { title: renderData.title, description, tags: (renderData.hashtags || []).map((h: string) => h.replace("#", "")), categoryId: "22" },
            status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
          }),
        });
        if (!initRes.ok) {
          const errText = await initRes.text();
          results.push({ platform: "youtube", status: "error", error: `Init ${initRes.status}: ${errText.slice(0, 100)}` });
        } else {
          const uploadUrl = initRes.headers.get("location");
          if (!uploadUrl) {
            results.push({ platform: "youtube", status: "error", error: "No upload URL returned" });
          } else {
            const uploadRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "video/mp4", "Content-Length": videoBuffer.length.toString() },
              body: videoBuffer,
            });
            if (uploadRes.ok) {
              const result = await uploadRes.json();
              results.push({ platform: "youtube", status: "success", url: `https://youtube.com/shorts/${result.id}` });
            } else {
              const errText = await uploadRes.text();
              results.push({ platform: "youtube", status: "error", error: `Upload ${uploadRes.status}: ${errText.slice(0, 100)}` });
            }
          }
        }
      }
    } catch (e: any) {
      results.push({ platform: "youtube", status: "error", error: e.message?.slice(0, 100) });
    }

    // --- Facebook Reels ---
    try {
      const pageId = process.env.FACEBOOK_PAGE_ID;
      const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (!pageId || !fbToken) {
        results.push({ platform: "facebook_reel", status: "skipped", error: "No Facebook credentials" });
      } else {
        const initRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upload_phase: "start", access_token: fbToken }),
        });
        if (!initRes.ok) {
          results.push({ platform: "facebook_reel", status: "error", error: `Init: ${(await initRes.text()).slice(0, 100)}` });
        } else {
          const { video_id } = await initRes.json();
          const uploadRes = await fetch(`https://rupload.facebook.com/video-upload/v21.0/${video_id}`, {
            method: "POST",
            headers: { Authorization: `OAuth ${fbToken}`, "Content-Type": "application/octet-stream", file_size: videoBuffer.length.toString() },
            body: videoBuffer,
          });
          if (!uploadRes.ok) {
            results.push({ platform: "facebook_reel", status: "error", error: `Upload: ${(await uploadRes.text()).slice(0, 100)}` });
          } else {
            const finishRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ upload_phase: "finish", video_id, description: shortDesc, access_token: fbToken }),
            });
            if (finishRes.ok) {
              results.push({ platform: "facebook_reel", status: "success" });
            } else {
              results.push({ platform: "facebook_reel", status: "error", error: `Finish: ${(await finishRes.text()).slice(0, 100)}` });
            }
          }
        }
      }
    } catch (e: any) {
      results.push({ platform: "facebook_reel", status: "error", error: e.message?.slice(0, 100) });
    }

    // --- LinkedIn Video ---
    try {
      const liToken = process.env.LINKEDIN_ACCESS_TOKEN;
      const personUrn = process.env.LINKEDIN_PERSON_URN;
      if (!liToken || !personUrn) {
        results.push({ platform: "linkedin", status: "skipped", error: "No LinkedIn credentials" });
      } else {
        const initRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
          method: "POST", headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ registerUploadRequest: { recipes: ["urn:li:digitalmediaRecipe:feedshare-video"], owner: personUrn, serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }] } }),
        });
        if (!initRes.ok) {
          results.push({ platform: "linkedin", status: "error", error: `Init: ${(await initRes.text()).slice(0, 100)}` });
        } else {
          const initData = await initRes.json();
          const upUrl = initData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
          const asset = initData.value?.asset;
          if (!upUrl || !asset) {
            results.push({ platform: "linkedin", status: "error", error: "No upload URL from LinkedIn" });
          } else {
            await fetch(upUrl, { method: "PUT", headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/octet-stream" }, body: videoBuffer });
            const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
              method: "POST", headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ author: personUrn, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: shortDesc }, shareMediaCategory: "VIDEO", media: [{ status: "READY", media: asset }] } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }),
            });
            if (postRes.ok) {
              results.push({ platform: "linkedin", status: "success" });
            } else {
              results.push({ platform: "linkedin", status: "error", error: `Post: ${(await postRes.text()).slice(0, 100)}` });
            }
          }
        }
      }
    } catch (e: any) {
      results.push({ platform: "linkedin", status: "error", error: e.message?.slice(0, 100) });
    }

    // --- Telegram + Discord (only if YouTube succeeded) ---
    const ytUrl = results.find(r => r.platform === "youtube" && r.status === "success")?.url;
    if (ytUrl) {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      if (tgToken) {
        const tgText = `🎬 *New Short: ${renderData.title}*\n\n${renderData.description?.slice(0, 120) || ""}\n\n👉 [Watch Now](${ytUrl})\n\n${(renderData.hashtags || []).join(" ")}`;
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHANNEL_ID || "@r2ftradinginsights", text: tgText, parse_mode: "Markdown" }),
        }).catch(() => {});
        results.push({ platform: "telegram", status: "success" });
      }
      const discordUrl = process.env.DISCORD_WEBHOOK_URL;
      if (discordUrl) {
        await fetch(discordUrl, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "R2F Trading", embeds: [{ title: `🎬 ${renderData.title}`, url: ytUrl, description: renderData.description?.slice(0, 200), color: 0xc9a84c }] }),
        }).catch(() => {});
        results.push({ platform: "discord", status: "success" });
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
