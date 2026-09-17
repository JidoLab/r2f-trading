/**
 * One-shot Discord server setup for R2F Trading.
 *
 *   npm run discord-setup            dry run: prints what it would create
 *   npm run discord-setup -- --live  creates everything
 *
 * Needs in .env.local:
 *   DISCORD_BOT_TOKEN   bot token from discord.com/developers (bot invited to
 *                       the server with Administrator, or Manage Channels +
 *                       Manage Roles + Manage Webhooks + Create Invite)
 *   DISCORD_GUILD_ID    the server id (976772511196938261)
 *
 * Idempotent: channels and roles that already exist by name are reused.
 * Prints the #live-announcements webhook URL at the end; that value goes into
 * DISCORD_WEBHOOK_URL on Vercel so the stream reminder, replay and blog posts
 * land in the right channel.
 */
import fs from "fs";
import path from "path";

const API = "https://discord.com/api/v10";
const LIVE = process.argv.includes("--live");

function env(key: string): string {
  const line = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8")
    .split(/\r?\n/).find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} missing from .env.local`);
  return line.slice(key.length + 1).trim();
}

const TOKEN = env("DISCORD_BOT_TOKEN");
const GUILD = env("DISCORD_GUILD_ID");
const H = { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json" };

async function api<T = Record<string, unknown>>(method: string, route: string, body?: unknown): Promise<T> {
  const res = await fetch(API + route, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

// Discord permission bits (plain numbers; all well under 2^53, and Discord
// takes them as decimal strings)
const VIEW = 2 ** 10;
const SEND = 2 ** 11;
const ADD_REACTIONS = 2 ** 6;
const READ_HISTORY = 2 ** 16;
const CREATE_THREADS = 2 ** 34 + 2 ** 35;

type Channel = { id: string; name: string; type: number; parent_id?: string | null };
type Role = { id: string; name: string };

const LAYOUT: { category: string; channels: { name: string; topic: string; readOnly?: boolean }[] }[] = [
  {
    category: "START HERE",
    channels: [
      { name: "start-here", topic: "Rules, stream schedule, and the free playbook. Read this first.", readOnly: true },
      { name: "live-announcements", topic: "Going-live links, replays, and new articles. Posted automatically.", readOnly: true },
    ],
  },
  {
    category: "TRADING",
    channels: [
      { name: "stream-chat", topic: "Talk during the live stream. NQ, ICT concepts, what is on the chart right now." },
      { name: "trade-reviews", topic: "Post a chart with your entry, stop and target. Say what you saw. Get feedback." },
      { name: "questions", topic: "Anything about ICT concepts, funded challenges, or the method used on stream." },
      { name: "wins-and-lessons", topic: "Passed a challenge, took a clean trade, or learned something the hard way. Share it." },
    ],
  },
  {
    category: "OFF TOPIC",
    channels: [{ name: "lounge", topic: "Everything that is not trading." }],
  },
];

const START_HERE = `**Welcome to R2F Trading.**

Harvest trades NQ live every weekday at the 8 AM London open (2 PM Bangkok, 3 AM New York) using ICT concepts. Entries, stops and the reasoning are said out loud.

**Schedule in your time zone:** https://www.r2ftrading.com/live
**Free ICT Funded-Trader Playbook:** https://www.r2ftrading.com/free-class
**Stream links and replays:** <#live-announcements>

**Rules**
1. No signals, no "DM me", no selling anything. Instant ban.
2. Charts welcome in <#trade-reviews>. Say what you saw and where the stop was.
3. Nothing here is financial advice. Every trade is your own decision and your own risk.
4. Be decent. Losses get respect here; that is where the learning is.`;

async function main() {
  const me = await api<{ username: string; id: string }>("GET", "/users/@me");
  const guild = await api<{ name: string }>("GET", `/guilds/${GUILD}`);
  console.log(`bot @${me.username} on server "${guild.name}" (${LIVE ? "LIVE" : "dry run"})`);

  const channels = await api<Channel[]>("GET", `/guilds/${GUILD}/channels`);
  const roles = await api<Role[]>("GET", `/guilds/${GUILD}/roles`);
  const everyone = roles.find((r) => r.name === "@everyone")!;
  const byName = (name: string, type: number) => channels.find((c) => c.name === name && c.type === type);

  let announceId: string | undefined;
  let startHereId: string | undefined;

  for (const group of LAYOUT) {
    let cat = byName(group.category, 4);
    if (!cat) {
      console.log(`  category  ${group.category}`);
      if (LIVE) cat = await api<Channel>("POST", `/guilds/${GUILD}/channels`, { name: group.category, type: 4 });
    } else console.log(`  category  ${group.category} (exists)`);

    for (const ch of group.channels) {
      let c = byName(ch.name, 0);
      const overwrites = ch.readOnly
        ? [{ id: everyone.id, type: 0, allow: String(VIEW + READ_HISTORY + ADD_REACTIONS), deny: String(SEND + CREATE_THREADS) }]
        : [];
      if (!c) {
        console.log(`    #${ch.name}${ch.readOnly ? " (read only)" : ""}`);
        if (LIVE) c = await api<Channel>("POST", `/guilds/${GUILD}/channels`, { name: ch.name, type: 0, topic: ch.topic, parent_id: cat?.id, permission_overwrites: overwrites });
      } else {
        console.log(`    #${ch.name} (exists)`);
        if (LIVE) await api("PATCH", `/channels/${c.id}`, { topic: ch.topic, parent_id: cat?.id, permission_overwrites: overwrites });
      }
      if (ch.name === "live-announcements") announceId = c?.id;
      if (ch.name === "start-here") startHereId = c?.id;
    }
  }

  if (!LIVE) {
    console.log("\nDry run complete. Re-run with --live to create.");
    return;
  }

  // Welcome post, pinned.
  if (startHereId) {
    const msgs = await api<{ id: string; author: { id: string } }[]>("GET", `/channels/${startHereId}/messages?limit=10`);
    if (!msgs.some((m) => m.author.id === me.id)) {
      const m = await api<{ id: string }>("POST", `/channels/${startHereId}/messages`, { content: START_HERE });
      await api("PUT", `/channels/${startHereId}/pins/${m.id}`);
      console.log("  posted and pinned the welcome message");
    }
  }

  // Webhook for the site in #live-announcements.
  if (announceId) {
    const hooks = await api<{ name: string; url?: string; id: string; token?: string }[]>("GET", `/channels/${announceId}/webhooks`);
    type Hook = { name: string; url?: string; id: string; token?: string };
    let hook: Hook | undefined = hooks.find((h) => h.name === "R2F Trading Site");
    if (!hook) {
      hook = await api<Hook>("POST", `/channels/${announceId}/webhooks`, { name: "R2F Trading Site" });
      console.log("  created webhook in #live-announcements");
    }
    const url = hook.url || `https://discord.com/api/webhooks/${hook.id}/${hook.token}`;
    console.log(`\nDISCORD_WEBHOOK_URL=${url}\n  Set this on Vercel (replace the old one) and redeploy.`);
  }

  // System channel for join messages, and a permanent invite.
  if (startHereId) {
    await api("PATCH", `/guilds/${GUILD}`, { system_channel_id: startHereId });
    const inv = await api<{ code: string }>("POST", `/channels/${startHereId}/invites`, { max_age: 0, max_uses: 0, unique: false });
    console.log(`Permanent invite: https://discord.gg/${inv.code}`);
  }

  console.log("\nDone. Still manual (Server Settings): AutoMod (block links from new members, spam), Community mode, and a server icon.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
