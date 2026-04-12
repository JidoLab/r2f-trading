const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Readable } = require("stream");
const { execSync } = require("child_process");

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;

// Check if ffmpeg is available
let ffmpegAvailable = false;
try {
  execSync("ffmpeg -version", { stdio: "ignore" });
  ffmpegAvailable = true;
} catch {
  console.warn("FFmpeg not found in PATH");
}

// Track render status
const renderStatus = {};

// Health check + status
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ffmpeg: ffmpegAvailable, activeRenders: Object.keys(renderStatus).length });
});

// Render status check
app.get("/status/:slug", (req, res) => {
  const info = renderStatus[req.params.slug];
  if (!info) return res.json({ status: "not_found" });
  res.json(info);
});

// List all render statuses
app.get("/renders", authMiddleware, (_req, res) => {
  res.json(renderStatus);
});

// Auth middleware for /render
function authMiddleware(req, res, next) {
  const secret = process.env.RENDER_SECRET;
  if (!secret) return next(); // no secret configured = open (dev mode)
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Render endpoint
app.post("/render", authMiddleware, async (req, res) => {
  const { slug, audioUrl, duration, scenes, captions, webhookUrl, githubToken, githubRepo } = req.body;

  if (!slug || !scenes || !captions) {
    return res.status(400).json({ error: "Missing required fields: slug, scenes, captions" });
  }

  // Respond immediately — rendering happens in background
  renderStatus[slug] = { status: "downloading", startedAt: new Date().toISOString(), error: null };
  res.json({ status: "accepted", slug, message: "Render started" });

  // Run render in background
  renderVideo({ slug, audioUrl, duration, scenes, captions, webhookUrl, githubToken, githubRepo }, renderStatus).catch((err) => {
    console.error(`[${slug}] Render failed:`, err.message);
    renderStatus[slug] = { ...renderStatus[slug], status: "failed", error: err.message };
  });
});

async function renderVideo({ slug, audioUrl, duration, scenes, captions, webhookUrl, githubToken, githubRepo }, statusTracker = {}) {
  const updateStatus = (s, extra = {}) => { if (statusTracker[slug]) statusTracker[slug] = { ...statusTracker[slug], status: s, ...extra }; };
  const tmpDir = path.join("/tmp", `render-${slug}-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const outputPath = path.join(tmpDir, `${slug}.mp4`);

  try {
    console.log(`[${slug}] Starting render — ${scenes.length} scenes, ${duration}s`);
    updateStatus("downloading", { scenes: scenes.length, duration });

    // Step 1: Download all assets
    const assetPaths = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const ext = scene.type === "video" ? "mp4" : "jpg";
      const assetPath = path.join(tmpDir, `scene-${i}.${ext}`);
      console.log(`[${slug}] Downloading scene ${i}: ${scene.url?.slice(0, 80)}...`);
      await downloadFile(scene.url, assetPath);
      assetPaths.push(assetPath);
    }

    // Download audio
    let audioPath = null;
    if (audioUrl) {
      audioPath = path.join(tmpDir, "audio.mp3");
      console.log(`[${slug}] Downloading audio...`);
      await downloadFile(audioUrl, audioPath);
    }

    // Step 2: Build FFmpeg command
    updateStatus("rendering");
    console.log(`[${slug}] Building FFmpeg filter graph...`);
    const totalDuration = duration || 35;
    const sceneDur = totalDuration / Math.max(scenes.length, 1);

    // Build complex filter graph
    const { filterComplex, lastLabel, inputArgs } = buildFilterGraph(
      scenes,
      assetPaths,
      captions,
      totalDuration,
      sceneDur,
      audioPath
    );

    // Run FFmpeg
    console.log(`[${slug}] Running FFmpeg...`);
    await runFfmpeg(inputArgs, filterComplex, lastLabel, audioPath, outputPath, totalDuration);
    console.log(`[${slug}] FFmpeg complete — output: ${outputPath}`);
    updateStatus("uploading");

    // Step 3: Upload to GitHub
    const videoBuffer = fs.readFileSync(outputPath);
    const githubPath = `public/shorts/${slug}.mp4`;
    const repo = githubRepo || "JidoLab/r2f-trading";

    console.log(`[${slug}] Uploading to GitHub: ${repo}/${githubPath} (${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
    await uploadToGithub(repo, githubPath, videoBuffer, githubToken, `Short: ${slug}`);

    const videoUrl = `https://raw.githubusercontent.com/${repo}/master/${githubPath}`;
    console.log(`[${slug}] Upload complete: ${videoUrl}`);

    // Step 4: Call webhook
    if (webhookUrl) {
      console.log(`[${slug}] Calling webhook: ${webhookUrl}`);
      await callWebhook(webhookUrl, {
        id: `render-${slug}`,
        status: "succeeded",
        url: videoUrl,
      });
    }

    updateStatus("completed", { videoUrl, completedAt: new Date().toISOString() });
    console.log(`[${slug}] Render complete!`);
  } catch (err) {
    console.error(`[${slug}] Error:`, err.message);

    // Send error to webhook
    if (webhookUrl) {
      await callWebhook(webhookUrl, {
        id: `render-${slug}`,
        status: "failed",
        error: err.message,
      }).catch(() => {});
    }
  } finally {
    // Cleanup tmp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      console.log(`[${slug}] Cleaned up temp files`);
    } catch {}
  }
}

function buildFilterGraph(scenes, assetPaths, captions, totalDuration, sceneDur, audioPath) {
  const inputArgs = [];
  const filterParts = [];
  let inputIdx = 0;

  // Add scene inputs
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (scene.type === "video") {
      inputArgs.push("-i", assetPaths[i]);
    } else {
      // Image: loop it for the scene duration
      inputArgs.push("-loop", "1", "-t", String(sceneDur), "-i", assetPaths[i]);
    }

    // Scale and crop each input to 1080x1920, center crop
    filterParts.push(
      `[${inputIdx}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,setpts=PTS-STARTPTS,trim=0:${sceneDur},setpts=PTS-STARTPTS[v${i}]`
    );
    inputIdx++;
  }

  // Concatenate all scenes
  const concatInputs = scenes.map((_, i) => `[v${i}]`).join("");
  filterParts.push(`${concatInputs}concat=n=${scenes.length}:v=1:a=0[vcat]`);

  // Trim to exact duration
  filterParts.push(`[vcat]trim=0:${totalDuration},setpts=PTS-STARTPTS[vtrim]`);

  // Dark overlay (semi-transparent black)
  filterParts.push(
    `[vtrim]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.35:t=fill[vdark]`
  );

  // Add progress bar (gold line at bottom, growing left to right)
  filterParts.push(
    `[vdark]drawbox=x=0:y=ih-10:w='iw*t/${totalDuration}':h=10:color=#c9a84c@1:t=fill[vprog]`
  );

  // Add R2F watermark (top right, gold, 50% opacity)
  let currentLabel = "vprog";
  filterParts.push(
    `[${currentLabel}]drawtext=text='R2F':fontsize=48:fontcolor=#c9a84c@0.5:x=w-tw-40:y=40:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf[vwm]`
  );
  currentLabel = "vwm";

  // Add caption overlays
  for (let i = 0; i < captions.length; i++) {
    const cap = captions[i];
    const text = cap.text.replace(/'/g, "\u2019").replace(/:/g, "\\:").replace(/\\/g, "\\\\");
    const isHook = cap.isHook || i === 0;
    const isHighlight = cap.isHighlight;

    const fontSize = isHook ? 84 : isHighlight ? 76 : 64;
    const fontColor = isHook || isHighlight ? "#EEFF00" : "white";
    const yPos = isHook ? "h*0.45" : "h*0.73";
    const borderW = isHook ? 5 : 3;
    const outLabel = `vcap${i}`;

    filterParts.push(
      `[${currentLabel}]drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:borderw=${borderW}:bordercolor=black:x=(w-text_w)/2:y=${yPos}:enable='between(t,${cap.start},${cap.end})':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:shadowcolor=black@0.9:shadowx=2:shadowy=2[${outLabel}]`
    );
    currentLabel = outLabel;
  }

  // Add audio input
  if (audioPath) {
    inputArgs.push("-i", audioPath);
  }

  return {
    filterComplex: filterParts.join(";\n"),
    lastLabel: currentLabel,
    inputArgs,
  };
}

function runFfmpeg(inputArgs, filterComplex, lastVideoLabel, audioPath, outputPath, totalDuration) {
  return new Promise((resolve, reject) => {
    const args = [
      ...inputArgs,
      "-filter_complex",
      filterComplex,
      "-map",
      `[${lastVideoLabel}]`,
    ];

    // Map audio if present (it's the last input)
    if (audioPath) {
      const audioIdx = inputArgs.filter((a) => a === "-i").length - 1;
      args.push("-map", `${audioIdx}:a`);
    }

    args.push(
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-r", "30",
      "-t", String(totalDuration),
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-y",
      outputPath
    );

    console.log(`[FFmpeg] Running with ${args.length} args`);

    const { spawn } = require("child_process");
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
      // Log progress lines
      const line = data.toString().trim();
      if (line.includes("time=")) {
        const match = line.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (match) process.stdout.write(`\r[FFmpeg] Progress: ${match[1]}`);
      }
    });

    proc.on("close", (code) => {
      console.log(""); // newline after progress
      if (code === 0) {
        resolve();
      } else {
        // Get last few lines of stderr for error context
        const errorLines = stderr.split("\n").filter(Boolean).slice(-5).join("\n");
        reject(new Error(`FFmpeg exited with code ${code}: ${errorLines}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

async function downloadFile(url, destPath) {
  if (!url) throw new Error("No URL provided for download");

  const fetch = (await import("node-fetch")).default;
  const res = await fetch(url, { timeout: 60000 });
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);

  const fileStream = fs.createWriteStream(destPath);
  await pipeline(Readable.fromWeb(res.body), fileStream);
}

async function uploadToGithub(repo, filePath, buffer, token, message) {
  const fetch = (await import("node-fetch")).default;
  const base64 = buffer.toString("base64");

  // Check if file already exists (to get SHA for update)
  let sha;
  try {
    const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }
  } catch {}

  const body = {
    message,
    content: base64,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub upload failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  return await res.json();
}

async function callWebhook(url, data) {
  const fetch = (await import("node-fetch")).default;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    console.log(`[Webhook] Response: ${res.status}`);
  } catch (err) {
    console.error(`[Webhook] Failed: ${err.message}`);
  }
}

// --- Proxy endpoint for fetching URLs that block Vercel IPs ---
app.post("/proxy-fetch", async (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.RENDER_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { url, headers: customHeaders } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });

  try {
    const fetchRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...(customHeaders || {}),
      },
    });
    const text = await fetchRes.text();
    res.json({ status: fetchRes.status, body: text.slice(0, 50000) });
  } catch (err) {
    res.json({ status: 0, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`R2F Video Renderer listening on port ${PORT}`);
  console.log(`FFmpeg available: ${ffmpegAvailable}`);
});
