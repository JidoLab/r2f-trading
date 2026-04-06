import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { listFiles, readFile } from "@/lib/github";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drafts: { slug: string; title: string; date: string; tags: string[] }[] = [];

  // Try local filesystem first (dev)
  const localDir = path.join(process.cwd(), "content", "drafts");
  let files: string[] = [];

  if (fs.existsSync(localDir)) {
    files = fs.readdirSync(localDir).filter((f) => f.endsWith(".mdx"));
  }

  // Also check GitHub
  if (files.length === 0) {
    try {
      files = await listFiles("content/drafts", ".mdx");
    } catch { /* no drafts directory yet */ }
  }

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    try {
      let content: string;
      const localPath = path.join(localDir, file);
      if (fs.existsSync(localPath)) {
        content = fs.readFileSync(localPath, "utf-8");
      } else {
        content = await readFile(`content/drafts/${file}`);
      }

      const getField = (f: string): string => {
        const m = content.match(new RegExp(`${f}:\\s*"([^"]*)"`) );
        return m ? m[1] : "";
      };
      const getArray = (f: string): string[] => {
        const m = content.match(new RegExp(`${f}:\\s*\\[([^\\]]*)]`));
        return m ? (m[1].match(/"([^"]*)"/g)?.map(s => s.replace(/"/g, "")) || []) : [];
      };
      const title = getField("title");
      if (title) {
        drafts.push({
          slug,
          title: title || slug,
          date: getField("date"),
          tags: getArray("tags"),
        });
      }
    } catch { /* skip unreadable drafts */ }
  }

  drafts.sort((a, b) => (a.date > b.date ? -1 : 1));
  return NextResponse.json({ drafts });
}
