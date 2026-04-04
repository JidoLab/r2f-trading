import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";
import { postToAll } from "@/lib/social";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

function extractField(src: string, field: string): string {
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

function extractArray(src: string, field: string): string[] {
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

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  try {
    // Read the post content
    let content: string;
    const localPath = path.join(process.cwd(), "content", "blog", `${slug}.mdx`);
    if (fs.existsSync(localPath)) {
      content = fs.readFileSync(localPath, "utf-8");
    } else {
      content = await readFile(`content/blog/${slug}.mdx`);
    }

    const title = extractField(content, "title");
    const excerpt = extractField(content, "excerpt") || extractField(content, "seoDescription");
    const coverImage = extractField(content, "coverImage");
    const tags = extractArray(content, "tags");

    if (!title) {
      return NextResponse.json({ error: "Could not extract post metadata" }, { status: 400 });
    }

    const results = await postToAll({ title, excerpt, slug, coverImage, tags });

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Share failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
