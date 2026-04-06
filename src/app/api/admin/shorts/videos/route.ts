import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const videos: {
    slug: string;
    title: string;
    status: string;
    videoUrl?: string;
    youtubeUrl?: string;
    copyText?: string;
    createdAt: string;
    completedAt?: string;
    uploadResults?: { platform: string; status: string }[];
  }[] = [];

  try {
    const files = await listFiles("data/shorts/renders");
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw);
        videos.push({
          slug: data.slug,
          title: data.title,
          status: data.status,
          videoUrl: data.videoUrl,
          youtubeUrl: data.youtubeUrl,
          copyText: data.copyText,
          createdAt: data.createdAt,
          completedAt: data.completedAt,
          uploadResults: data.uploadResults,
        });
      } catch {}
    }
  } catch {}

  // Sort newest first
  videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ videos });
}
