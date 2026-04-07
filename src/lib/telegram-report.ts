/**
 * Send formatted reports to Telegram
 * Uses Harvest's personal chat or a dedicated channel
 */

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || "";
const OWNER_CHAT_ID = () => process.env.TELEGRAM_OWNER_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID || "";

export async function sendTelegramReport(message: string): Promise<boolean> {
  const token = BOT_TOKEN();
  const chatId = OWNER_CHAT_ID();
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Format Thailand time
 */
export function thaiTime(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function thaiDate(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
