import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    // Remove from subscribers
    let subscribers: Record<string, unknown>[] = [];
    try {
      subscribers = JSON.parse(await readFile("data/subscribers.json"));
    } catch {}

    const before = subscribers.length;
    subscribers = subscribers.filter((s) => (s.email as string)?.toLowerCase() !== email.toLowerCase());

    if (subscribers.length < before) {
      await commitFile(
        "data/subscribers.json",
        JSON.stringify(subscribers, null, 2),
        `Unsubscribe: ${email}`
      );
    }

    // Also remove from Resend audience if configured
    try {
      const audienceId = process.env.RESEND_AUDIENCE_ID;
      const apiKey = process.env.RESEND_API_KEY;
      if (audienceId && apiKey) {
        // Find contact in Resend
        const listRes = await fetch(
          `https://api.resend.com/audiences/${audienceId}/contacts?email=${encodeURIComponent(email)}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const contact = listData.data?.find((c: { email: string }) => c.email.toLowerCase() === email.toLowerCase());
          if (contact?.id) {
            await fetch(
              `https://api.resend.com/audiences/${audienceId}/contacts/${contact.id}`,
              { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } }
            );
          }
        }
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
