const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const captionAss = require("./caption-ass");
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
  const { slug, audioUrl, duration, scenes, captions, enrichedCaptions, musicUrl, musicVolumeDb, musicDuckRatio, webhookUrl, githubToken, githubRepo } = req.body;
  console.log(`[render-request] slug=${slug} captions=${captions?.length || 0} enrichedCaptions=${enrichedCaptions?.length || 0} scenes=${scenes?.length || 0} music=${musicUrl ? "yes" : "no"}`);

  if (!slug || !scenes || !captions) {
    return res.status(400).json({ error: "Missing required fields: slug, scenes, captions" });
  }

  // Respond immediately — rendering happens in background
  renderStatus[slug] = { status: "downloading", startedAt: new Date().toISOString(), error: null };
  res.json({ status: "accepted", slug, message: "Render started" });

  // Run render in background
  renderVideo({ slug, audioUrl, duration, scenes, captions, enrichedCaptions, musicUrl, musicVolumeDb, musicDuckRatio, webhookUrl, githubToken, githubRepo }, renderStatus).catch((err) => {
    console.error(`[${slug}] Render failed:`, err.message);
    renderStatus[slug] = { ...renderStatus[slug], status: "failed", error: err.message };
  });
});

async function renderVideo({ slug, audioUrl, duration, scenes, captions, enrichedCaptions, musicUrl, musicVolumeDb, musicDuckRatio, webhookUrl, githubToken, githubRepo }, statusTracker = {}) {
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

    // Download background music (optional)
    let musicPath = null;
    if (musicUrl) {
      try {
        musicPath = path.join(tmpDir, "music.mp3");
        console.log(`[${slug}] Downloading music...`);
        await downloadFile(musicUrl, musicPath);
      } catch (err) {
        console.warn(`[${slug}] Music download failed, continuing without: ${err.message}`);
        musicPath = null;
      }
    }

    // Step 2: Build FFmpeg command
    updateStatus("rendering");
    console.log(`[${slug}] Building FFmpeg filter graph...`);
    const totalDuration = duration || 35;
    const sceneDur = totalDuration / Math.max(scenes.length, 1);

    // Build complex filter graph
    const { filterComplex, lastLabel, inputArgs, audioLabel } = buildFilterGraph(
      scenes,
      assetPaths,
      captions,
      enrichedCaptions,
      totalDuration,
      sceneDur,
      audioPath,
      musicPath,
      { volumeDb: typeof musicVolumeDb === "number" ? musicVolumeDb : -18,
        duckRatio: typeof musicDuckRatio === "number" ? musicDuckRatio : 8 }
    );

    // Run FFmpeg
    console.log(`[${slug}] Running FFmpeg...`);
    await runFfmpeg(inputArgs, filterComplex, lastLabel, audioPath, outputPath, totalDuration, audioLabel);
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

function buildFilterGraph(scenes, assetPaths, captions, enrichedCaptions, totalDuration, sceneDur, audioPath, musicPath, musicOpts) {
  const inputArgs = [];
  const filterParts = [];
  let inputIdx = 0;

  // Scene-transition crossfade duration (seconds).
  // Each scene is extended by this amount so xfade can overlap cleanly.
  const XFADE_DUR = 0.2;
  const sceneExt = sceneDur + XFADE_DUR;

  // Add scene inputs (extended by XFADE_DUR so transitions have content to crossfade)
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (scene.type === "video") {
      inputArgs.push("-i", assetPaths[i]);
    } else {
      // Image: loop it for the extended scene duration
      inputArgs.push("-loop", "1", "-t", String(sceneExt), "-i", assetPaths[i]);
    }

    // Scale and crop each input to 1080x1920 (full HD vertical)
    filterParts.push(
      `[${inputIdx}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,setpts=PTS-STARTPTS,trim=0:${sceneExt},setpts=PTS-STARTPTS[v${i}]`
    );
    inputIdx++;
  }

  // Chain scenes with xfade crossfades (or plain concat if single scene)
  if (scenes.length <= 1) {
    filterParts.push(`[v0]null[vcat]`);
  } else {
    // First xfade: v0 ⇢ v1 at offset sceneDur
    // Each subsequent xfade: prev ⇢ vk at offset k*sceneDur
    let prevLabel = "v0";
    for (let k = 1; k < scenes.length; k++) {
      const outLabel = k === scenes.length - 1 ? "vcat" : `xf${k}`;
      const offset = k * sceneDur;
      filterParts.push(
        `[${prevLabel}][v${k}]xfade=transition=fade:duration=${XFADE_DUR}:offset=${offset.toFixed(3)}[${outLabel}]`
      );
      prevLabel = outLabel;
    }
  }

  // Trim to exact duration
  filterParts.push(`[vcat]trim=0:${totalDuration},setpts=PTS-STARTPTS[vtrim]`);

  // Dark overlay (semi-transparent black)
  filterParts.push(
    `[vtrim]null[vdark]`
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

  // ASS-based karaoke captions when enrichedCaptions present (Apr 17)
  const osModule = require("os");
  let usedAssPath = false;
  if (enrichedCaptions && Array.isArray(enrichedCaptions) && enrichedCaptions.length > 0) {
    try {
      console.log("[caption-ass] Entering ASS branch, " + enrichedCaptions.length + " chunks");
      const tmpDir = fs.mkdtempSync(path.join(osModule.tmpdir(), "r2f-captions-"));
      const assPath = captionAss.writeAssFile(tmpDir, enrichedCaptions, {
        videoWidth: 1080,
        videoHeight: 1920,
      });
      const ffmpegPath = assPath.split("\\").join("/").split(":").join("\:");
      const fontsDir = "/usr/share/fonts/truetype/r2f";
      const outLabel = "vcapass";
      filterParts.push(
        "[" + currentLabel + "]subtitles='" + ffmpegPath + "':fontsdir='" + fontsDir + "'[" + outLabel + "]"
      );
      currentLabel = outLabel;
      usedAssPath = true;
      console.log("[caption-ass] SUCCESS at " + assPath);
    } catch (err) {
      console.error("[caption-ass] FAILED, falling back to drawtext:", err.message);
    }
  }

  // Legacy drawtext caption loop (runs only when ASS wasn't used)
  // Add caption overlays with smart font sizing + word wrap
  // Video is 1080x1920. Safe text area: 90% width = 972px, with 5% padding each side.
  // DejaVu Bold avg char width ≈ 0.55 * fontSize
  const SAFE_WIDTH = 972;
  const CHAR_WIDTH_RATIO = 0.55;
  const MIN_FONT = 40;

  function wrapAndSizeCaption(rawText, baseFontSize) {
    // Try base font size first
    const maxChars = Math.floor(SAFE_WIDTH / (CHAR_WIDTH_RATIO * baseFontSize));
    if (rawText.length <= maxChars) {
      return { text: rawText, fontSize: baseFontSize, lines: 1 };
    }
    // Try wrapping to 2 lines at word boundary
    const words = rawText.split(' ');
    if (words.length >= 2) {
      // Find best split point (roughly balanced lines)
      let bestSplit = Math.floor(words.length / 2);
      let bestDiff = Infinity;
      for (let s = 1; s < words.length; s++) {
        const line1 = words.slice(0, s).join(' ');
        const line2 = words.slice(s).join(' ');
        const diff = Math.abs(line1.length - line2.length);
        const longest = Math.max(line1.length, line2.length);
        if (diff < bestDiff && longest <= maxChars) {
          bestSplit = s;
          bestDiff = diff;
        }
      }
      const line1 = words.slice(0, bestSplit).join(' ');
      const line2 = words.slice(bestSplit).join(' ');
      const longest = Math.max(line1.length, line2.length);
      if (longest <= maxChars) {
        return { text: line1 + '\n' + line2, fontSize: baseFontSize, lines: 2 };
      }
    }
    // Still too long — scale font down to fit single line
    const scaledFont = Math.max(MIN_FONT, Math.floor(SAFE_WIDTH / (CHAR_WIDTH_RATIO * rawText.length)));
    return { text: rawText, fontSize: scaledFont, lines: 1 };
  }

  for (let i = 0; !usedAssPath && i < captions.length; i++) {
    const cap = captions[i];
    const isHook = cap.isHook || i === 0;
    const isHighlight = cap.isHighlight;

    const baseFontSize = isHook ? 84 : isHighlight ? 76 : 64;
    const { text: wrappedText, fontSize, lines } = wrapAndSizeCaption(cap.text, baseFontSize);

    // Escape text — note \n stays as literal newline for drawtext
    const text = wrappedText.replace(/'/g, "\u2019").replace(/:/g, "\\:").replace(/\\(?!n)/g, "\\\\").split("\n").join(" ");
    const fontColor = isHook || isHighlight ? "#EEFF00" : "white";
    // Shift Y slightly up when we have 2 lines so text stays centered on anchor point
    const baseY = isHook ? 0.45 : 0.73;
    const yOffset = lines === 2 ? fontSize * 0.5 : 0;
    const yPos = `h*${baseY}-${yOffset}`;
    const borderW = isHook ? 5 : 3;
    const outLabel = `vcap${i}`;

    filterParts.push(
      `[${currentLabel}]drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:borderw=${borderW}:bordercolor=black:x=(w-text_w)/2:y=${yPos}:line_spacing=8:enable='between(t,${cap.start},${cap.end})':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:shadowcolor=black@0.9:shadowx=2:shadowy=2[${outLabel}]`
    );
    currentLabel = outLabel;
  }

  // Add audio input (voice) — indexed after all scene inputs
  let audioLabel = null;
  const sceneInputCount = scenes.length;
  if (audioPath) {
    inputArgs.push("-i", audioPath);
    const voiceIdx = sceneInputCount; // first input after scenes

    if (musicPath) {
      // Music input is looped at input level so tracks shorter than the short
      // still play for the full duration.
      inputArgs.push("-stream_loop", "-1", "-i", musicPath);
      const musicIdx = sceneInputCount + 1;

      const volDb = musicOpts && typeof musicOpts.volumeDb === "number" ? musicOpts.volumeDb : -18;
      const ratio = musicOpts && typeof musicOpts.duckRatio === "number" ? musicOpts.duckRatio : 8;

      // Voice is split — one copy feeds the final mix, one copy drives the
      // sidechain so music ducks while the voice talks.
      filterParts.push(`[${voiceIdx}:a]asplit=2[voice_a][voice_b]`);
      // Music: drop to the base volume floor
      filterParts.push(`[${musicIdx}:a]volume=${volDb}dB[music_base]`);
      // Sidechain: music is compressed by voice presence
      filterParts.push(
        `[music_base][voice_b]sidechaincompress=threshold=0.04:ratio=${ratio}:attack=20:release=300:makeup=1[music_ducked]`
      );
      // Mix voice + ducked music, trim to voice length
      filterParts.push(
        `[voice_a][music_ducked]amix=inputs=2:duration=first:dropout_transition=0,atrim=0:${totalDuration},asetpts=PTS-STARTPTS[aout]`
      );
      audioLabel = "aout";
    }
  }

  return {
    filterComplex: filterParts.join(";\n"),
    lastLabel: currentLabel,
    inputArgs,
    audioLabel, // null when no music — caller maps the raw audio input
  };
}

function runFfmpeg(inputArgs, filterComplex, lastVideoLabel, audioPath, outputPath, totalDuration, audioLabel) {
  return new Promise((resolve, reject) => {
    const args = [
      ...inputArgs,
      "-filter_complex",
      filterComplex,
      "-map",
      `[${lastVideoLabel}]`,
    ];

    // Map audio — either the filtered [aout] (when music is present) or the raw audio input.
    if (audioLabel) {
      args.push("-map", `[${audioLabel}]`);
    } else if (audioPath) {
      // Raw audio is the first -i after scenes. Since music isn't present,
      // it's the LAST -i arg position minus offset. Simpler: count -i's.
      const audioIdx = inputArgs.filter((a) => a === "-i").length - 1;
      args.push("-map", `${audioIdx}:a`);
    }

    args.push(
      "-c:v", "libx264",
      "-preset", "fast",        // better compression than ultrafast, still fast
      "-crf", "26",             // slightly lower quality but smaller file
      "-maxrate", "4M",         // cap peak bitrate to ensure < 50MB per minute
      "-bufsize", "8M",
      "-tune", "fastdecode",    // optimize for fast playback
      "-c:a", "aac",
      "-b:a", "96k",            // lower audio bitrate (good enough for voice)
      "-r", "30",               // 30fps full quality
      "-t", String(totalDuration),
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-threads", "1",          // single thread for free tier
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

  // Optimize Pexels URLs: use SD quality instead of HD to save bandwidth/time
  let optimizedUrl = url;
  if (url.includes("videos.pexels.com") && url.includes("hd_1080")) {
    optimizedUrl = url.replace("hd_1080_1920", "sd_640_960").replace("hd_1080_2048", "sd_640_960");
  }

  // Use https/http module directly for maximum compatibility with Node 18
  const proto = optimizedUrl.startsWith("https") ? require("https") : require("http");

  return new Promise((resolve, reject) => {
    const tryUrl = (targetUrl, isFallback) => {
      const p = targetUrl.startsWith("https") ? require("https") : require("http");
      p.get(targetUrl, { timeout: 120000 }, (res) => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`[download] Redirect -> ${res.headers.location.slice(0, 80)}`);
          tryUrl(res.headers.location, isFallback);
          return;
        }
        if (res.statusCode !== 200) {
          if (!isFallback && optimizedUrl !== url) {
            console.log(`[download] SD failed (${res.statusCode}), trying original`);
            tryUrl(url, true);
            return;
          }
          reject(new Error(`Download failed (${res.statusCode}): ${targetUrl}`));
          return;
        }
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on("finish", () => { fileStream.close(); resolve(); });
        fileStream.on("error", reject);
      }).on("error", (err) => {
        if (!isFallback && optimizedUrl !== url) {
          console.log(`[download] SD error, trying original: ${err.message}`);
          tryUrl(url, true);
          return;
        }
        reject(err);
      });
    };
    tryUrl(optimizedUrl, false);
  });
}

async function uploadToGithub(repo, filePath, buffer, token, message, maxRetries = 4) {
  // Node 18+ has global fetch built-in
  const base64 = buffer.toString("base64");

  // Retry loop handles 409 SHA conflicts from parallel renders
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Fetch fresh SHA each attempt (critical for race-condition recovery)
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

    const body = { message, content: base64 };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return await res.json();
    }

    const errText = await res.text();

    // Retry on 409 (SHA mismatch) or 422 (also indicates stale sha sometimes)
    const isRetryable = res.status === 409 || res.status === 422;
    if (isRetryable && attempt < maxRetries - 1) {
      const waitMs = 300 * Math.pow(2, attempt) + Math.floor(Math.random() * 300);
      console.log(`[${filePath}] GitHub ${res.status} conflict, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    throw new Error(`GitHub upload failed (${res.status}): ${errText.slice(0, 200)}`);
  }
}

async function callWebhook(url, data) {
  // Node 18+ has global fetch built-in
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

// --- Watermark endpoint for overlaying text on images ---
app.post("/watermark", authMiddleware, async (req, res) => {
  if (!ffmpegAvailable) {
    return res.status(500).json({ error: "FFmpeg not available" });
  }

  const { imageBase64, text = "R2F Trading", position = "bottom-right" } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 required" });
  }

  const tmpDir = path.join("/tmp", `wm-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const inputPath = path.join(tmpDir, "input.jpg");
  const outputPath = path.join(tmpDir, "output.jpg");

  try {
    // Decode base64 to file
    fs.writeFileSync(inputPath, Buffer.from(imageBase64, "base64"));

    // Build position coordinates
    let x, y;
    switch (position) {
      case "top-left":     x = "15";          y = "15";          break;
      case "top-right":    x = "w-tw-15";     y = "15";          break;
      case "bottom-left":  x = "15";          y = "h-th-15";     break;
      case "bottom-right":
      default:             x = "w-tw-15";     y = "h-th-15";     break;
    }

    const escapedText = text.replace(/'/g, "\u2019").replace(/:/g, "\\:");

    // Run FFmpeg to overlay text
    await new Promise((resolve, reject) => {
      const { spawn } = require("child_process");
      const args = [
        "-i", inputPath,
        "-vf", `drawtext=text='${escapedText}':fontsize=20:fontcolor=white@0.35:x=${x}:y=${y}:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`,
        "-q:v", "2",
        "-y", outputPath,
      ];
      const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg watermark failed (code ${code}): ${stderr.split("\n").slice(-3).join(" ")}`));
      });
      proc.on("error", reject);
    });

    // Read output and return as base64
    const outputBuffer = fs.readFileSync(outputPath);
    res.json({ success: true, imageBase64: outputBuffer.toString("base64") });
  } catch (err) {
    console.error("[watermark] Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

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
