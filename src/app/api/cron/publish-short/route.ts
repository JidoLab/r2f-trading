import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile, listFiles } from "@/lib/github";

export const maxDuration = 300;

/**
 * Publish Short Cron — runs 4x/day at staggered times
 * Finds the oldest "ready" video and publishes it to all platforms.
 * One video per run = spread throughout the day.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the oldest "ready" video
    const files = await listFiles("data/shorts/renders");
    let oldest: { slug: string; path: string; createdAt: string } | null = null;

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw);
        if (data.status === "ready" && data.videoUrl) {
          if (!oldest || data.createdAt < oldest.createdAt) {
            oldest = { slug: data.slug, path: file, createdAt: data.createdAt };
          }
        }
      } catch {}
    }

    if (!oldest) {
      return NextResponse.json({ skipped: true, reason: "No ready videos to publish" });
    }

    // Call the publish logic directly
    const renderRaw = await readFile(oldest.path);
    const renderData = JSON.parse(renderRaw);

    // Download video once
    const videoRes = await fetch(renderData.videoUrl);
    if (!videoRes.ok) return NextResponse.json({ error: "Failed to download video" }, { status: 500 });
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const results: { platform: string; status: string; url?: string; error?: string }[] = [];
    const shortDesc = `${renderData.title}\n\n${renderData.description?.slice(0, 200)}\n\n${(renderData.hashtags || []).join(" ")}`;

    // --- YouTube ---
    try {
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
      if (clientId && clientSecret && refreshToken) {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
        });
        if (tokenRes.ok) {
          const { access_token } = await tokenRes.json();
          const topicHashtags = (renderData.hashtags || []).join(" ");
          const description = [
            renderData.description || renderData.title,
            "",
            topicHashtags,
            "",
            "📈 Free ICT Trading Checklist: https://r2ftrading.com",
            "🎓 Free 5-Day Crash Course: https://r2ftrading.com/crash-course",
            "📊 Trading Insights Blog: https://r2ftrading.com/trading-insights",
            "🔔 Subscribe for daily trading tips",
            "",
            "#ICTTrading #ForexTrading #SmartMoneyConcepts #FundedTrader #R2FTrading",
          ].join("\n");
          const baseTags = (renderData.hashtags || []).map((h: string) => h.replace("#", ""));
          const seoTags = [
            ...baseTags,
            "ICT trading", "smart money concepts", "forex trading", "funded trader",
            "trading strategy", "price action", "liquidity", "order blocks",
            "R2F Trading", "day trading", "swing trading", "FTMO",
          ];
          const uniqueTags = [...new Set(seoTags.map(t => t.toLowerCase()))].slice(0, 30);
          const initRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
            method: "POST",
            headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              snippet: { title: renderData.title, description, tags: uniqueTags, categoryId: "22" },
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
                const r = await uploadRes.json();
                results.push({ platform: "youtube", status: "success", url: `https://youtube.com/shorts/${r.id}` });
              } else { results.push({ platform: "youtube", status: "error", error: `Upload: ${(await uploadRes.text()).slice(0, 80)}` }); }
            }
          } else { results.push({ platform: "youtube", status: "error", error: `Init: ${(await initRes.text()).slice(0, 80)}` }); }
        }
      }
    } catch (e: any) { results.push({ platform: "youtube", status: "error", error: e.message?.slice(0, 80) }); }

    // --- Facebook Reels ---
    try {
      const pageId = process.env.FACEBOOK_PAGE_ID;
      const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (pageId && fbToken) {
        const initRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upload_phase: "start", access_token: fbToken }),
        });
        if (initRes.ok) {
          const { video_id } = await initRes.json();
          const uploadRes = await fetch(`https://rupload.facebook.com/video-upload/v21.0/${video_id}`, {
            method: "POST",
            headers: { Authorization: `OAuth ${fbToken}`, "Content-Type": "application/octet-stream", offset: "0", file_size: String(videoBuffer.length) },
            body: videoBuffer,
          });
          if (uploadRes.ok) {
            const finRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_reels`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ upload_phase: "finish", video_id, description: shortDesc, access_token: fbToken }),
            });
            results.push({ platform: "facebook_reel", status: finRes.ok ? "success" : "error" });
          }
        }
      }
    } catch { results.push({ platform: "facebook_reel", status: "error" }); }

    // --- LinkedIn ---
    try {
      const liToken = process.env.LINKEDIN_ACCESS_TOKEN;
      const personUrn = process.env.LINKEDIN_PERSON_URN;
      if (liToken && personUrn) {
        const initRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
          method: "POST", headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ registerUploadRequest: { recipes: ["urn:li:digitalmediaRecipe:feedshare-video"], owner: personUrn, serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }] } }),
        });
        if (initRes.ok) {
          const initData = await initRes.json();
          const upUrl = initData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
          const asset = initData.value?.asset;
          if (upUrl && asset) {
            await fetch(upUrl, { method: "PUT", headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/octet-stream" }, body: videoBuffer });
            const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
              method: "POST", headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ author: personUrn, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: shortDesc }, shareMediaCategory: "VIDEO", media: [{ status: "READY", media: asset }] } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }),
            });
            results.push({ platform: "linkedin", status: postRes.ok ? "success" : "error" });
          }
        }
      }
    } catch { results.push({ platform: "linkedin", status: "error" }); }

    // --- X/Twitter ---
    try {
      const apiKey = process.env.TWITTER_API_KEY;
      const apiSecret = process.env.TWITTER_API_SECRET;
      const accessToken = process.env.TWITTER_ACCESS_TOKEN;
      const accessSecret = process.env.TWITTER_ACCESS_SECRET;
      if (apiKey && apiSecret && accessToken && accessSecret) {
        const { generateOAuthHeader } = await import("@/lib/social-auth");
        const UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";
        const initParams = { command: "INIT", total_bytes: String(videoBuffer.length), media_type: "video/mp4", media_category: "tweet_video" };
        const initAuth = generateOAuthHeader("POST", UPLOAD_URL, initParams, apiKey, apiSecret, accessToken, accessSecret);
        const initRes = await fetch(UPLOAD_URL, { method: "POST", headers: { Authorization: initAuth, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(initParams) });
        if (initRes.ok) {
          const { media_id_string } = await initRes.json();
          const CHUNK = 5 * 1024 * 1024;
          let ok = true;
          for (let s = 0; s * CHUNK < videoBuffer.length; s++) {
            const chunk = videoBuffer.subarray(s * CHUNK, (s + 1) * CHUNK);
            const form = new FormData();
            form.append("command", "APPEND"); form.append("media_id", media_id_string); form.append("segment_index", String(s)); form.append("media_data", chunk.toString("base64"));
            const auth = generateOAuthHeader("POST", UPLOAD_URL, { command: "APPEND", media_id: media_id_string, segment_index: String(s) }, apiKey, apiSecret, accessToken, accessSecret);
            const r = await fetch(UPLOAD_URL, { method: "POST", headers: { Authorization: auth }, body: form });
            if (!r.ok && r.status !== 204) { ok = false; break; }
          }
          if (ok) {
            const finParams = { command: "FINALIZE", media_id: media_id_string };
            const finAuth = generateOAuthHeader("POST", UPLOAD_URL, finParams, apiKey, apiSecret, accessToken, accessSecret);
            const finRes = await fetch(UPLOAD_URL, { method: "POST", headers: { Authorization: finAuth, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(finParams) });
            if (finRes.ok) {
              const fd = await finRes.json();
              if (fd.processing_info) {
                for (let i = 0; i < 30; i++) {
                  await new Promise(r => setTimeout(r, 3000));
                  const sp = { command: "STATUS", media_id: media_id_string };
                  const sa = generateOAuthHeader("GET", UPLOAD_URL, sp, apiKey, apiSecret, accessToken, accessSecret);
                  const sr = await fetch(`${UPLOAD_URL}?${new URLSearchParams(sp)}`, { headers: { Authorization: sa } });
                  if (sr.ok) { const sd = await sr.json(); if (sd.processing_info?.state === "succeeded") break; if (sd.processing_info?.state === "failed") break; }
                }
              }
              const tweetText = `${renderData.title}\n\n${(renderData.hashtags || []).slice(0, 5).join(" ")}`;
              const tweetAuth = generateOAuthHeader("POST", "https://api.twitter.com/2/tweets", {}, apiKey, apiSecret, accessToken, accessSecret);
              const tweetRes = await fetch("https://api.twitter.com/2/tweets", { method: "POST", headers: { Authorization: tweetAuth, "Content-Type": "application/json" }, body: JSON.stringify({ text: tweetText, media: { media_ids: [media_id_string] } }) });
              if (tweetRes.ok) { const td = await tweetRes.json(); results.push({ platform: "twitter", status: "success", url: `https://x.com/Road2Funded/status/${td.data?.id}` }); }
              else { results.push({ platform: "twitter", status: "error" }); }
            }
          }
        }
      }
    } catch { results.push({ platform: "twitter", status: "error" }); }

    // --- Telegram + Discord ---
    const ytUrl = results.find(r => r.platform === "youtube" && r.status === "success")?.url;
    if (ytUrl) {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      if (tgToken) {
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHANNEL_ID || "@r2ftradinginsights", text: `🎬 *New Short: ${renderData.title}*\n\n${renderData.description?.slice(0, 120) || ""}\n\n👉 [Watch Now](${ytUrl})\n\n${(renderData.hashtags || []).join(" ")}`, parse_mode: "Markdown" }),
        }).catch(() => {});
        results.push({ platform: "telegram", status: "success" });
      }
      if (process.env.DISCORD_WEBHOOK_URL) {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "R2F Trading", embeds: [{ title: `🎬 ${renderData.title}`, url: ytUrl, description: renderData.description?.slice(0, 200), color: 0xc9a84c }] }),
        }).catch(() => {});
        results.push({ platform: "discord", status: "success" });
      }
    }

    // Update render status
    await commitFile(oldest.path, JSON.stringify({
      ...renderData,
      status: "published",
      youtubeUrl: ytUrl || null,
      uploadResults: results,
      publishedAt: new Date().toISOString(),
    }, null, 2), `Published: ${renderData.title.slice(0, 30)}`);

    return NextResponse.json({ success: true, slug: oldest.slug, title: renderData.title, results });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
