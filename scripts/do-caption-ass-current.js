/**
 * Generates an ASS (Advanced SubStation Alpha) subtitle file for
 * word-by-word karaoke captions with power-word styling.
 *
 * Input: enrichedCaptions array — each chunk has text + words[] with timings.
 * Output: path to the generated .ass file.
 *
 * Copied/deployed onto /opt/r2f-renderer/caption-ass.js on the DO droplet.
 *
 * Video dimensions assumed: 1080x1920 (9:16).
 * Uses Anton font (TikTok-style bold condensed) — installed via
 * fonts-r2f package at /usr/share/fonts/truetype/r2f/
 */

const fs = require("fs");
const path = require("path");

// ─── Colors (ASS uses BGR, not RGB) ────────────────────────────────────
// ASS color format: &HAABBGGRR&  (AA=alpha, BB=blue, GG=green, RR=red)
// Alpha 00 = fully opaque

const COLORS = {
  // #FFFFFF white
  normal: "&H00FFFFFF",
  // #D4AF37 gold (brand)
  gold: "&H0037AFD4",
  // #4AE24A bright green (for money/wins)
  green: "&H004AE24A",
  // #3333EE red (for warnings)
  red: "&H003333EE",
  // #000000 black outline
  black: "&H00000000",
};

// Per-style render hints
const WORD_STYLES = {
  normal: { color: COLORS.normal, scale: 100, weight: 1 },
  number: { color: COLORS.gold, scale: 115, weight: 1 },
  money: { color: COLORS.green, scale: 115, weight: 1 },
  warning: { color: COLORS.red, scale: 110, weight: 1 },
  highlight: { color: COLORS.gold, scale: 110, weight: 1 },
};

// Active (currently-spoken) word gets a gold flash + slight bump
const ACTIVE_COLOR = COLORS.gold;
const ACTIVE_SCALE_BOOST = 15; // 100 → 115, etc.

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Format seconds as ASS timestamp: H:MM:SS.CS (centiseconds)
 */
function formatTime(secs) {
  const s = Math.max(0, secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const cs = Math.round((sec - Math.floor(sec)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(Math.floor(sec)).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * Escape special chars in ASS dialogue text.
 * ASS override tags use `{...}` — we must escape braces in user content.
 * We also need to escape backslashes.
 */
function escapeAssText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "(").replace(/\}/g, ")").replace(/\n/g, "\\N");
}

/**
 * Build the override tags that flash a word gold+scaled during its speech window.
 * `chunkStartMs` is the dialogue line's absolute start in ms (for \t() timing).
 * `wordStart/wordEnd` are absolute seconds.
 *
 * Returns override string like `{\t(500,600,\c&H37AFD4&\fscx115\fscy115)\t(1200,1300,\c&H00FFFFFF&\fscx100\fscy100)}`
 */
function buildWordAnimation(wordStartMs, wordEndMs, baseStyle, chunkStartMs) {
  // \t() timings are RELATIVE to the Dialogue line's Start time, in milliseconds.
  const relStart = Math.max(0, wordStartMs - chunkStartMs);
  const relEnd = Math.max(relStart + 50, wordEndMs - chunkStartMs);

  const baseScale = baseStyle.scale;
  const activeScale = baseScale + ACTIVE_SCALE_BOOST;

  // Animate: at word start, jump to gold+larger. At word end, return to base.
  // Fade in/out over 100ms for snappy but smooth effect.
  const inDur = 100;
  const outDur = 100;

  return (
    `{\\t(${relStart},${relStart + inDur},\\c${ACTIVE_COLOR}&\\fscx${activeScale}\\fscy${activeScale})` +
    `\\t(${relEnd},${relEnd + outDur},\\c${baseStyle.color}&\\fscx${baseScale}\\fscy${baseScale})}`
  );
}

/**
 * Build the persistent styling tags for a word (applied throughout the chunk).
 */
function buildWordBaseStyle(baseStyle) {
  return `{\\c${baseStyle.color}&\\fscx${baseStyle.scale}\\fscy${baseStyle.scale}}`;
}

// ─── Main ASS generator ────────────────────────────────────────────────

/**
 * Generate ASS subtitle content from enriched captions.
 *
 * @param {Array} captions - enriched captions with words[] per chunk
 * @param {Object} opts - { videoWidth, videoHeight, hookMarginV, bodyMarginV }
 * @returns {string} ASS file contents
 */
function generateAss(captions, opts = {}) {
  const width = opts.videoWidth || 1080;
  const height = opts.videoHeight || 1920;

  // Styles:
  // - Body: bottom-centered, ~60px font
  // - Hook: middle-centered, ~96px font (for first caption / hook)
  // Alignment 2 = bottom-center, 5 = middle-center (in ASS)
  //
  // MarginV on alignment 2 = distance from bottom
  // MarginV on alignment 5 = ignored (centered vertically)
  // To place body captions, we use alignment 2 with MarginV as bottom offset.
  // For hook, we use alignment 5 (center).
  //
  // Font sizes relative to PlayResY: ~72 on 1920h looks balanced.
  const bodySize = 78;
  const hookSize = 112;
  const outlineSize = 5;
  const shadowDepth = 3;

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Body,Anton,${bodySize},${COLORS.normal},${COLORS.normal},${COLORS.black},&H80000000,0,0,0,0,100,100,2,0,1,${outlineSize},${shadowDepth},2,80,80,480,1
Style: Hook,Anton,${hookSize},${COLORS.normal},${COLORS.normal},${COLORS.black},&H80000000,0,0,0,0,100,100,2,0,1,${outlineSize + 2},${shadowDepth + 1},5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const dialogues = captions.map((cap) => {
    const styleName = cap.isHook ? "Hook" : "Body";
    const chunkStartMs = Math.round(cap.start * 1000);

    // Build text with per-word styling + animation
    const textParts = cap.words.map((w) => {
      const wordStyle = WORD_STYLES[w.style] || WORD_STYLES.normal;
      const baseStyle = buildWordBaseStyle(wordStyle);
      const wordStartMs = Math.round(w.start * 1000);
      const wordEndMs = Math.round(w.end * 1000);
      const animation = buildWordAnimation(wordStartMs, wordEndMs, wordStyle, chunkStartMs);
      return `${baseStyle}${animation}${escapeAssText(w.word)}`;
    });

    // Join words with space in ASS text
    const text = textParts.join(" ");

    return `Dialogue: 0,${formatTime(cap.start)},${formatTime(cap.end)},${styleName},,0,0,0,,${text}`;
  });

  return header + dialogues.join("\n") + "\n";
}

/**
 * Write generated ASS file to disk.
 * @returns {string} path to the written file
 */
function writeAssFile(outDir, captions, opts) {
  const content = generateAss(captions, opts);
  const filePath = path.join(outDir, "captions.ass");
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

module.exports = {
  generateAss,
  writeAssFile,
  formatTime,
};
