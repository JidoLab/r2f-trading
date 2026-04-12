import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

interface ChatHistory {
  phoneNumber: string;
  name: string;
  messages: { role: string; content: string; timestamp: string; name?: string }[];
  firstContact: string;
  lastActive: string;
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configured = isWhatsAppConfigured();
  const conversations: {
    phoneNumber: string;
    name: string;
    messageCount: number;
    lastMessage: string;
    lastActive: string;
    messages: { role: string; content: string; timestamp: string }[];
  }[] = [];

  let messagesToday = 0;

  if (configured) {
    try {
      const files = await listFiles("data/whatsapp-chats", ".json");

      for (const file of files) {
        try {
          const raw = await readFile(file);
          const data: ChatHistory = JSON.parse(raw);
          const lastMsg = data.messages[data.messages.length - 1];

          // Count messages from today
          const today = new Date().toISOString().split("T")[0];
          messagesToday += data.messages.filter(
            (m) => m.timestamp?.startsWith(today)
          ).length;

          conversations.push({
            phoneNumber: data.phoneNumber,
            name: data.name || "Unknown",
            messageCount: data.messages.length,
            lastMessage: lastMsg?.content?.slice(0, 100) || "",
            lastActive: data.lastActive || data.messages[data.messages.length - 1]?.timestamp || "",
            messages: data.messages,
          });
        } catch {
          // Skip malformed files
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }

  // Sort by most recent activity
  conversations.sort((a, b) => b.lastActive.localeCompare(a.lastActive));

  return NextResponse.json({
    configured,
    conversations,
    stats: {
      totalConversations: conversations.length,
      messagesToday,
    },
  });
}
