"use client";

import { useEffect, useState } from "react";

interface Conversation {
  sessionId: string;
  date: string;
  messageCount: number;
  firstMessage: string;
  messages: { role: string; content: string; timestamp: string }[];
}

export default function AdminChatLogsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/chat-logs")
      .then(r => r.ok ? r.json() : { conversations: [] })
      .then(d => { setConversations(d.conversations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white/50 text-sm">Loading chat logs...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Chat Logs</h1>
      <p className="text-white/50 text-sm mb-8">
        Conversations from the website chatbot. You get an email for each new conversation.
      </p>

      {conversations.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <p className="text-white/30 text-sm">No conversations yet. Chats will appear here once visitors use the chatbot.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => (
            <div key={c.sessionId} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === c.sessionId ? null : c.sessionId)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">&ldquo;{c.firstMessage}&rdquo;</p>
                  <p className="text-white/30 text-xs mt-1">
                    {c.date} &middot; {c.messageCount} messages
                  </p>
                </div>
                <span className="text-white/30 text-sm ml-3">{expanded === c.sessionId ? "▼" : "▶"}</span>
              </button>

              {expanded === c.sessionId && (
                <div className="border-t border-white/10 p-4 space-y-3 max-h-96 overflow-y-auto">
                  {c.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                        m.role === "user"
                          ? "bg-gold/20 text-white"
                          : "bg-white/10 text-white/80"
                      }`}>
                        <p className="text-xs leading-relaxed">{m.content}</p>
                        <p className="text-[10px] mt-1 opacity-40">
                          {new Date(m.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
