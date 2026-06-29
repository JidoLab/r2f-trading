// House copy rules for all generated content.
//
// Harvest's rule: never use em or en dashes in copy (restructure, or use
// commas/periods/colons/semicolons). LLMs ignore this instruction often, so we
// enforce it deterministically after generation. The "not X, but Y" / "Not A.
// Not B." antithesis pattern can't be safely stripped by regex without changing
// meaning, so that one stays a prompt rule (see ANTITHESIS_RULE).

/**
 * Replace em/en dashes (and stray double-hyphens used as dashes) with a comma.
 * MARKDOWN-SAFE: only collapses spaces/tabs around the dash, never newlines, so
 * paragraph breaks, headings, and lists are preserved.
 */
export function stripEmDashes(text: string): string {
  if (!text) return text;
  return text
    .replace(/[ \t]*[—–][ \t]*/g, ", ") // em/en dash -> comma
    .replace(/[ \t]+--+[ \t]+/g, ", ") // spaced double-hyphen -> comma
    .replace(/,[ \t]*([.!?,;:])/g, "$1") // ", ." -> "."
    .replace(/([.!?;:])[ \t]*,[ \t]*/g, "$1 ") // ". ," -> ". "
    .replace(/[ \t]{2,}/g, " "); // tidy double spaces (NOT newlines)
}

// Drop-in prompt block to forbid the AI-tell patterns Harvest bans. Append to
// any content-generation prompt.
export const STYLE_RULES = `STRICT STYLE RULES (non-negotiable):
- NEVER use an em dash or en dash (the "—" or "–" character). Use a comma, period, colon, or semicolon, or restructure the sentence.
- NEVER use the "not X, but Y" construction, and NEVER use repeated-negation cadence like "Not this. Not that. Not the other." Just state plainly what the thing IS.
- Write in a natural human voice. No clickbait, no hype, no generic AI filler.`;
