import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import path from "path";

const SHORTS_DIR = path.join(process.cwd(), "scripts", "shorts", "projects");

interface ShortScript {
  title: string;
  description: string;
  hashtags: string[];
}

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Missing YouTube API credentials. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env.local");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function uploadVideo(slug: string) {
  const projectDir = path.join(SHORTS_DIR, slug);

  if (!fs.existsSync(projectDir)) {
    console.error(`Project not found: ${projectDir}`);
    process.exit(1);
  }

  // Find the output video — check multiple names
  let videoPath = path.join(projectDir, "output-final.mp4");
  if (!fs.existsSync(videoPath)) videoPath = path.join(projectDir, "output-synced.mp4");
  if (!fs.existsSync(videoPath)) videoPath = path.join(projectDir, "output.mp4");
  if (!fs.existsSync(videoPath)) {
    console.error("No output video found! Run create-short first.");
    process.exit(1);
  }

  const scriptPath = path.join(projectDir, "script.json");
  const script: ShortScript = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));

  console.log("🎬 R2F YouTube Shorts Uploader\n");
  console.log(`Title: ${script.title}`);

  // Get OAuth access token
  console.log("Authenticating with YouTube...");
  const accessToken = await getAccessToken();

  // YouTube shorts need #Shorts in title or description
  const title = script.title.length > 95 ? script.title.slice(0, 95) + "..." : script.title;
  const description = `${script.description}\n\n${script.hashtags.join(" ")} #Shorts\n\n🔗 Free ICT Trading Checklist: https://r2ftrading.com\n📊 Coaching from $150/week: https://r2ftrading.com/coaching\n📞 Free Discovery Call: https://r2ftrading.com/contact\n\n📱 Follow us:\n▸ Instagram: https://instagram.com/road2funded\n▸ Telegram: https://t.me/Road2Funded\n▸ TradingView: https://tradingview.com/u/Road_2_Funded\n▸ Twitter/X: https://twitter.com/Road2Funded`;

  // Step 1: Initialize resumable upload
  console.log("Initializing upload...");
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          tags: script.hashtags.map((h) => h.replace("#", "")),
          categoryId: "22", // People & Blogs (good for educational)
          defaultLanguage: "en",
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
          embeddable: true,
          publicStatsViewable: true,
        },
      }),
    }
  );

  if (!initRes.ok) {
    throw new Error(`Upload init failed: ${await initRes.text()}`);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("No upload URL returned");

  // Step 2: Upload video file
  console.log("Uploading video...");
  const videoData = fs.readFileSync(videoPath);

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoData.length.toString(),
    },
    body: videoData,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${await uploadRes.text()}`);
  }

  const result = await uploadRes.json();
  const videoId = result.id;
  const videoUrl = `https://youtube.com/shorts/${videoId}`;

  console.log(`\n✅ Uploaded successfully!`);
  console.log(`📺 URL: ${videoUrl}`);
  console.log(`🆔 Video ID: ${videoId}`);

  // Save upload info
  fs.writeFileSync(
    path.join(projectDir, "upload-result.json"),
    JSON.stringify({ videoId, url: videoUrl, uploadedAt: new Date().toISOString() }, null, 2)
  );
}

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: npm run upload-short <project-slug>");
  process.exit(1);
}

uploadVideo(slug).catch(console.error);
