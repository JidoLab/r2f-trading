import fs from "fs";
import path from "path";
import crypto from "crypto";

const SHORTS_DIR = path.join(process.cwd(), "scripts", "shorts", "projects");

// --- YouTube Upload ---
export async function uploadToYouTube(videoPath: string, script: any, slug: string) {
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) throw new Error("Missing YouTube credentials");

  // Get access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }),
  });
  if (!tokenRes.ok) throw new Error(`Token refresh failed: ${await tokenRes.text()}`);
  const { access_token } = await tokenRes.json();

  const title = script.title.length > 95 ? script.title.slice(0, 95) + "..." : script.title;
  const description = `${script.description}\n\n${(script.hashtags || []).join(" ")} #Shorts\n\n🔗 Free ICT Trading Checklist: https://r2ftrading.com\n📊 Coaching from $150/week: https://r2ftrading.com/coaching\n📞 Free Discovery Call: https://r2ftrading.com/contact\n\n📱 Follow us:\n▸ Instagram: https://instagram.com/road2funded\n▸ Telegram: https://t.me/Road2Funded\n▸ TradingView: https://tradingview.com/u/Road_2_Funded\n▸ Twitter/X: https://twitter.com/Road2Funded`;

  // Initialize resumable upload
  const initRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      snippet: { title, description, tags: (script.hashtags || []).map((h: string) => h.replace("#", "")), categoryId: "22", defaultLanguage: "en" },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false, embeddable: true },
    }),
  });
  if (!initRes.ok) throw new Error(`Upload init: ${await initRes.text()}`);
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("No upload URL");

  // Upload
  const videoData = fs.readFileSync(videoPath);
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": videoData.length.toString() },
    body: videoData,
  });
  if (!uploadRes.ok) throw new Error(`Upload: ${await uploadRes.text()}`);
  const result = await uploadRes.json();
  const url = `https://youtube.com/shorts/${result.id}`;

  // Save result
  const projectDir = path.join(SHORTS_DIR, slug);
  if (fs.existsSync(projectDir)) {
    fs.writeFileSync(path.join(projectDir, "upload-result.json"), JSON.stringify({ videoId: result.id, url, uploadedAt: new Date().toISOString() }, null, 2));
  }

  return { status: "success", url, videoId: result.id };
}

// --- X/Twitter Video Upload ---
export async function uploadToTwitterVideo(videoPath: string, script: any) {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return { status: "skipped", message: "No Twitter credentials" };

  // Twitter v2 media upload requires chunked upload
  // For now, post text-only tweet with link (video upload requires v2 media endpoints)
  // TODO: Implement chunked media upload when v2 media upload is stable
  return { status: "skipped", message: "Twitter video upload requires v2 media API — text post used instead via social.ts" };
}

// --- TikTok Upload ---
export async function uploadToTikTok(videoPath: string, script: any) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!clientKey || !accessToken) return { status: "skipped", message: "No TikTok credentials — set up at developers.tiktok.com" };

  try {
    // Initialize upload
    const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source_info: { source: "FILE_UPLOAD", video_size: fs.statSync(videoPath).size, chunk_size: fs.statSync(videoPath).size },
        post_info: { title: script.title.slice(0, 150), privacy_level: "PUBLIC_TO_EVERYONE" },
      }),
    });
    if (!initRes.ok) return { status: "error", message: `Init failed: ${(await initRes.text()).slice(0, 100)}` };
    const initData = await initRes.json();

    // Upload video
    const uploadUrl = initData.data?.upload_url;
    if (!uploadUrl) return { status: "error", message: "No upload URL from TikTok" };

    const videoData = fs.readFileSync(videoPath);
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4", "Content-Range": `bytes 0-${videoData.length - 1}/${videoData.length}` },
      body: videoData,
    });
    if (!uploadRes.ok) return { status: "error", message: `Upload failed: ${uploadRes.status}` };

    return { status: "success", url: "https://tiktok.com/@road2funded" };
  } catch (e: any) {
    return { status: "error", message: e.message?.slice(0, 100) };
  }
}

// --- Instagram Reels Upload ---
export async function uploadToInstagramReel(videoPath: string, script: any, slug: string) {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!accountId || !token) return { status: "skipped", message: "No Instagram credentials" };

  try {
    // Need a public URL for the video — upload to GitHub first
    const repo = process.env.GITHUB_REPO || "JidoLab/r2f-trading";
    const ghToken = process.env.GITHUB_TOKEN!;
    const videoBase64 = fs.readFileSync(videoPath).toString("base64");
    const filename = `shorts-video/${slug}.mp4`;

    await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${ghToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Short video: ${slug}`, content: videoBase64 }),
    });
    const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
      headers: { Authorization: `Bearer ${ghToken}` },
    });
    const ghData = await ghRes.json();
    const videoUrl = ghData.download_url;
    if (!videoUrl) return { status: "error", message: "Failed to get video URL" };

    const caption = `${script.title}\n\n${script.description?.slice(0, 200)}\n\n${(script.hashtags || []).join(" ")} #Shorts #Reels`;

    // Create media container
    const createRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "REELS", video_url: videoUrl, caption, access_token: token }),
    });
    if (!createRes.ok) return { status: "error", message: `Create failed: ${(await createRes.text()).slice(0, 100)}` };
    const { id: containerId } = await createRes.json();

    // Wait for processing then publish
    await new Promise((r) => setTimeout(r, 10000));
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: token }),
    });
    if (!publishRes.ok) return { status: "error", message: `Publish failed: ${(await publishRes.text()).slice(0, 100)}` };

    return { status: "success" };
  } catch (e: any) {
    return { status: "error", message: e.message?.slice(0, 100) };
  }
}

// --- Facebook Reels Upload ---
export async function uploadToFacebookReel(videoPath: string, script: any) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return { status: "skipped", message: "No Facebook credentials" };

  const API_VERSION = "v21.0";

  try {
    const description = `${script.title}\n\n${script.description?.slice(0, 200)}\n\n${(script.hashtags || []).join(" ")}`;

    // Initialize reel upload
    const initRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${pageId}/video_reels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_phase: "start", access_token: token }),
    });
    const initBody = await initRes.text();
    if (!initRes.ok) {
      console.error("  FB Reel init error:", initBody);
      return { status: "error", message: `Init: ${initBody.slice(0, 200)}` };
    }
    const { video_id } = JSON.parse(initBody);

    // Upload video data
    const videoData = fs.readFileSync(videoPath);
    const uploadRes = await fetch(`https://rupload.facebook.com/video-upload/${API_VERSION}/${video_id}`, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${token}`,
        "Content-Type": "application/octet-stream",
        file_size: videoData.length.toString(),
      },
      body: videoData,
    });
    const uploadBody = await uploadRes.text();
    if (!uploadRes.ok) {
      console.error("  FB Reel upload error:", uploadBody);
      return { status: "error", message: `Upload: ${uploadBody.slice(0, 200)}` };
    }

    // Finish upload
    const finishRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${pageId}/video_reels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_phase: "finish", video_id, description, access_token: token }),
    });
    const finishBody = await finishRes.text();
    if (!finishRes.ok) {
      console.error("  FB Reel finish error:", finishBody);
      return { status: "error", message: `Finish: ${finishBody.slice(0, 200)}` };
    }

    return { status: "success" };
  } catch (e: any) {
    console.error("  FB Reel exception:", e.message);
    return { status: "error", message: e.message?.slice(0, 200) };
  }
}

// --- LinkedIn Video Upload ---
export async function uploadToLinkedInVideo(videoPath: string, script: any) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;
  if (!token || !personUrn) return { status: "skipped", message: "No LinkedIn credentials" };

  try {
    const videoData = fs.readFileSync(videoPath);

    // Initialize upload
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
    if (!initRes.ok) return { status: "error", message: `Init: ${(await initRes.text()).slice(0, 100)}` };
    const initData = await initRes.json();
    const uploadUrl = initData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const asset = initData.value?.asset;
    if (!uploadUrl || !asset) return { status: "error", message: "No upload URL from LinkedIn" };

    // Upload video
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
      body: videoData,
    });
    if (!uploadRes.ok) return { status: "error", message: `Upload: ${uploadRes.status}` };

    // Create post with video
    const commentary = `${script.title}\n\n${script.description?.slice(0, 200)}\n\n${(script.hashtags || []).join(" ")}`;
    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify({
        author: personUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: commentary },
            shareMediaCategory: "VIDEO",
            media: [{ status: "READY", media: asset, title: { text: script.title } }],
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    if (!postRes.ok) return { status: "error", message: `Post: ${(await postRes.text()).slice(0, 100)}` };

    return { status: "success" };
  } catch (e: any) {
    return { status: "error", message: e.message?.slice(0, 100) };
  }
}
