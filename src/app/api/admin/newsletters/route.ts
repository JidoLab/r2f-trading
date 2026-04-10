import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";

export const dynamic = "force-dynamic";

interface NewsletterRecord {
  date: string;
  sentAt: string;
  subject: string;
  recipientCount: number;
  failedCount: number;
  totalSubscribers: number;
  content: {
    greeting: string;
    marketRecap: string;
    articles: { title: string; slug: string; excerpt: string }[];
    videoOfTheWeek?: { title: string; url: string };
    tipOfTheWeek: string;
    comingUp: string;
    ctaText: string;
    ctaUrl: string;
  };
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const newsletters: NewsletterRecord[] = [];

  try {
    const files = await listFiles("data/newsletters", ".json");
    for (const file of files) {
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw) as NewsletterRecord;
        newsletters.push(data);
      } catch { /* skip malformed */ }
    }
  } catch { /* directory may not exist yet */ }

  // Sort newest first
  newsletters.sort((a, b) => (a.date > b.date ? -1 : 1));

  return NextResponse.json({ newsletters });
}
