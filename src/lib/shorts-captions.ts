/**
 * Shorts caption enrichment — builds karaoke-style caption chunks with
 * per-word timings + power-word classification.
 *
 * Output feeds the DO FFmpeg renderer which converts this into ASS subtitle
 * files with per-word color animations (TikTok-style captions).
 */

export type WordStyle = "normal" | "number" | "money" | "warning" | "highlight";

export interface EnrichedWord {
  word: string;
  start: number;
  end: number;
  style: WordStyle;
}

export interface EnrichedCaption {
  text: string; // Full chunk as UPPERCASE
  start: number;
  end: number;
  isHook: boolean; // First caption → bigger size, centered higher
  words: EnrichedWord[]; // Per-word timing + style for karaoke render
}

interface RawWord {
  word: string;
  start: number;
  end: number;
}

// ─── Power word classifiers ────────────────────────────────────────────

/**
 * Detect numbers and percentages. E.g. "3", "47K", "10%", "$500"
 * Also matches words with embedded numbers like "2024" (though we avoid those now).
 */
function isNumber(word: string): boolean {
  const cleaned = word.replace(/[.,!?;:'"]/g, "");
  return /^\$?\d+([.,]\d+)?[%kKmMxX]?$/.test(cleaned) || /\d/.test(cleaned);
}

/**
 * Detect money-related words.
 */
function isMoney(word: string): boolean {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  return /^(dollar|dollars|usd|eur|gbp|jpy|money|cash|profit|profits|loss|losses|payout|payouts|funded|account|accounts)$/.test(
    lower,
  );
}

/**
 * Detect warning/negative emphasis words.
 */
function isWarning(word: string): boolean {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  return /^(stop|never|dont|don|wrong|mistake|mistakes|fail|failing|failed|blew|lost|losing|broken|kill|killing|killed|worst|bad|terrible|ruin|ruined|disaster|trap|wrecked)$/.test(
    lower,
  );
}

/**
 * Classify a word into a power-word category.
 * Pass in highlightWords (from script generation) to boost "highlight" priority.
 */
export function classifyWord(word: string, highlightWords: string[] = []): WordStyle {
  const cleaned = word.toLowerCase().replace(/[^a-z0-9%$]/g, "");
  if (!cleaned) return "normal";

  // Check exact match against script-provided highlights
  for (const hw of highlightWords) {
    const hwClean = hw.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (hwClean && (cleaned === hwClean || cleaned.includes(hwClean) || hwClean.includes(cleaned))) {
      // If the highlight word is also a number/money, prefer more specific
      if (isNumber(word)) return "number";
      if (isMoney(word)) return "money";
      if (isWarning(word)) return "warning";
      return "highlight";
    }
  }

  if (isNumber(word)) return "number";
  if (isMoney(word)) return "money";
  if (isWarning(word)) return "warning";
  return "normal";
}

// ─── Main enrichment function ──────────────────────────────────────────

/**
 * Build enriched caption chunks from Whisper word-level timestamps.
 *
 * Chunks are grouped at natural phrase boundaries (punctuation, long pauses,
 * 3-5 word max). Each chunk gets:
 *  - Uppercase display text
 *  - Per-word timings inside `words[]` for karaoke effect
 *  - Power-word style classification per word
 *  - isHook flag for the first chunk (bigger display)
 */
export function buildEnrichedCaptions(
  rawWords: RawWord[],
  highlightWords: string[] = [],
): EnrichedCaption[] {
  const captions: EnrichedCaption[] = [];
  if (rawWords.length === 0) return captions;

  let chunk: RawWord[] = [];

  const flush = () => {
    if (chunk.length === 0) return;
    const words: EnrichedWord[] = chunk.map((w) => ({
      word: w.word.trim().toUpperCase(),
      start: w.start,
      end: w.end,
      style: classifyWord(w.word, highlightWords),
    }));
    const text = words.map((w) => w.word).join(" ");
    captions.push({
      text,
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      isHook: captions.length === 0,
      words,
    });
    chunk = [];
  };

  for (let i = 0; i < rawWords.length; i++) {
    const w = rawWords[i];
    chunk.push(w);

    const wordText = w.word.trim();
    const nextWord = rawWords[i + 1];
    const endsWithPunctuation = /[.!?,;:\-—]$/.test(wordText);
    const hasLongPause = nextWord && nextWord.start - w.end > 0.3;
    const atMaxWords = chunk.length >= 5;
    const atGoodLength = chunk.length >= 3;
    const isLastWord = i === rawWords.length - 1;

    if (isLastWord || atMaxWords || (atGoodLength && (endsWithPunctuation || hasLongPause)) || endsWithPunctuation) {
      flush();
    }
  }
  flush();

  return captions;
}

/**
 * Fallback for when Whisper only returned segments (no word timestamps).
 * Builds captions without word-level data — renderer will fall back to
 * static (non-karaoke) rendering.
 */
export function buildFallbackCaptions(
  segments: { start: number; end: number; text: string }[],
  highlightWords: string[] = [],
): EnrichedCaption[] {
  return segments.map((seg, i) => {
    const text = seg.text.trim().toUpperCase();
    // Synthesize per-word timings by dividing segment duration evenly
    const tokens = text.split(/\s+/).filter(Boolean);
    const segDur = Math.max(seg.end - seg.start, 0.1);
    const perWord = segDur / Math.max(tokens.length, 1);
    const words: EnrichedWord[] = tokens.map((tok, j) => ({
      word: tok,
      start: seg.start + j * perWord,
      end: seg.start + (j + 1) * perWord,
      style: classifyWord(tok, highlightWords),
    }));
    return {
      text,
      start: seg.start,
      end: seg.end,
      isHook: i === 0,
      words,
    };
  });
}
