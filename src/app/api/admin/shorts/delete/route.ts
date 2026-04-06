import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { deleteFile, listFiles, readFile } from "@/lib/github";

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

    // Find and delete the render file
    const files = await listFiles("data/shorts/renders");
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw);
        if (data.slug === slug) {
          await deleteFile(file, `Delete short: ${slug}`);
          break;
        }
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
