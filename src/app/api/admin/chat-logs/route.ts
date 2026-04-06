import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations: {
    sessionId: string;
    date: string;
    messageCount: number;
    firstMessage: string;
    messages: { role: string; content: string; timestamp: string }[];
  }[] = [];

  try {
    const files = await listFiles("data/chat-transcripts");
    // Get last 7 days of transcripts
    const recentFiles = files.filter(f => f.endsWith(".json")).slice(-7);

    for (const file of recentFiles) {
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw);
        const date = file.replace("data/chat-transcripts/", "").replace(".json", "");

        for (const [sessionId, session] of Object.entries(data)) {
          const s = session as { messages: { role: string; content: string; timestamp: string }[]; startedAt: string };
          const userMessages = s.messages.filter(m => m.role === "user");
          if (userMessages.length === 0) continue;

          conversations.push({
            sessionId,
            date,
            messageCount: s.messages.length,
            firstMessage: userMessages[0]?.content?.slice(0, 100) || "",
            messages: s.messages,
          });
        }
      } catch {}
    }
  } catch {}

  // Sort newest first
  conversations.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ conversations });
}
