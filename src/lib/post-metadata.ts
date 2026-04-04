/**
 * Shared metadata extraction for MDX blog posts.
 * Used by publish, share, and social posting routes.
 * Uses string parsing instead of new Function() which is blocked on Vercel.
 */

export function extractField(src: string, field: string): string {
  const patterns = [
    `${field}: "`, `${field}: '`, `${field}: \``,
    `${field}:"`, `${field}:'`, `${field}:\``,
  ];
  for (const p of patterns) {
    const start = src.indexOf(p);
    if (start === -1) continue;
    const valStart = start + p.length;
    const quote = p[p.length - 1];
    const end = src.indexOf(quote, valStart);
    if (end === -1) continue;
    return src.substring(valStart, end);
  }
  return "";
}

export function extractArray(src: string, field: string): string[] {
  const start = src.indexOf(`${field}:`);
  if (start === -1) return [];
  const bracketStart = src.indexOf("[", start);
  const bracketEnd = src.indexOf("]", bracketStart);
  if (bracketStart === -1 || bracketEnd === -1) return [];
  const inner = src.substring(bracketStart + 1, bracketEnd);
  const items: string[] = [];
  let inQuote = false;
  let current = "";
  for (const ch of inner) {
    if (ch === '"' && !inQuote) { inQuote = true; continue; }
    if (ch === '"' && inQuote) { items.push(current); current = ""; inQuote = false; continue; }
    if (inQuote) current += ch;
  }
  return items;
}

export interface PostMetadata {
  title: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
}

export function extractPostMetadata(content: string): PostMetadata | null {
  const title = extractField(content, "title");
  if (!title) return null;

  return {
    title,
    excerpt: extractField(content, "excerpt") || extractField(content, "seoDescription"),
    coverImage: extractField(content, "coverImage"),
    tags: extractArray(content, "tags"),
  };
}
