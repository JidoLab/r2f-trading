"use client";

import { useEffect, useState } from "react";

interface Message {
  role: string;
  content: string;
  timestamp: string;
  name?: string;
}

interface Conversation {
  phoneNumber: string;
  name: string;
  messageCount: number;
  lastMessage: string;
  lastActive: string;
  messages: Message[];
}

interface WhatsAppData {
  configured: boolean;
  conversations: Conversation[];
  stats: {
    totalConversations: number;
    messagesToday: number;
  };
}

export default function AdminWhatsAppPage() {
  const [data, setData] = useState<WhatsAppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/whatsapp")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white/50 text-sm">Loading WhatsApp data...</div>;

  if (!data) return <div className="text-red-400 text-sm">Failed to load WhatsApp data.</div>;

  if (!data.configured) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">WhatsApp</h1>
        <p className="text-white/50 text-sm mb-8">
          Connect WhatsApp Business to receive messages and auto-reply with AI.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Setup Instructions</h2>

          <div className="space-y-4">
            {[
              {
                step: 1,
                title: "Get Meta Business Manager access",
                desc: "Go to business.facebook.com and set up or access your Business Manager account.",
              },
              {
                step: 2,
                title: "Create WhatsApp product in Meta Developer Console",
                desc: "Visit developers.facebook.com, create an app, and add the WhatsApp product.",
              },
              {
                step: 3,
                title: "Connect your business phone number",
                desc: "Add and verify your business phone number in the WhatsApp settings.",
              },
              {
                step: 4,
                title: "Get credentials",
                desc: "From the WhatsApp API settings, copy your Phone Number ID, Access Token, and Business Account ID.",
              },
              {
                step: 5,
                title: "Add environment variables to Vercel",
                desc: "Add the following env vars in your Vercel project settings:",
              },
              {
                step: 6,
                title: "Set webhook URL",
                desc: "In Meta Developer Console, set the webhook URL to:",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{item.title}</p>
                  <p className="text-white/50 text-xs mt-1">{item.desc}</p>
                  {item.step === 5 && (
                    <div className="mt-2 bg-black/30 rounded p-3 font-mono text-xs text-white/70 space-y-1">
                      <p>WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id</p>
                      <p>WHATSAPP_ACCESS_TOKEN=your_access_token</p>
                      <p>WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id</p>
                      <p>WHATSAPP_WEBHOOK_VERIFY_TOKEN=any_secret_string_you_choose</p>
                    </div>
                  )}
                  {item.step === 6 && (
                    <div className="mt-2 bg-black/30 rounded p-3 font-mono text-xs text-gold">
                      https://r2ftrading.com/api/whatsapp/webhook
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">WhatsApp</h1>
      <p className="text-white/50 text-sm mb-6">
        WhatsApp Business conversations with AI auto-reply.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider">Total Conversations</p>
          <p className="text-2xl font-bold text-white mt-1">{data.stats.totalConversations}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider">Messages Today</p>
          <p className="text-2xl font-bold text-white mt-1">{data.stats.messagesToday}</p>
        </div>
      </div>

      {/* Conversations */}
      {data.conversations.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <p className="text-white/30 text-sm">
            No WhatsApp conversations yet. Messages will appear here once someone contacts you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.conversations.map((c) => (
            <div
              key={c.phoneNumber}
              className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpanded(expanded === c.phoneNumber ? null : c.phoneNumber)
                }
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-semibold">{c.name}</p>
                    <span className="text-white/20 text-xs">{c.phoneNumber}</span>
                  </div>
                  <p className="text-white/40 text-xs mt-1 truncate">
                    &ldquo;{c.lastMessage}&rdquo;
                  </p>
                  <p className="text-white/20 text-[10px] mt-1">
                    {c.messageCount} messages &middot; Last active{" "}
                    {new Date(c.lastActive).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-white/30 text-sm ml-3">
                  {expanded === c.phoneNumber ? "▼" : "▶"}
                </span>
              </button>

              {expanded === c.phoneNumber && (
                <div className="border-t border-white/10 p-4 space-y-3 max-h-96 overflow-y-auto">
                  {c.messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                          m.role === "user"
                            ? "bg-green-900/30 text-white"
                            : "bg-white/10 text-white/80"
                        }`}
                      >
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
