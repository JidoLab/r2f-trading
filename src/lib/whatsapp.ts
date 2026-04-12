const GRAPH_API = "https://graph.facebook.com/v21.0";

function getPhoneNumberId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID || "";
}

function getAccessToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN || "";
}

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

async function whatsappRequest(body: Record<string, unknown>): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;

  try {
    const res = await fetch(`${GRAPH_API}/${getPhoneNumberId()}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  return whatsappRequest({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  parameters?: string[]
): Promise<boolean> {
  return whatsappRequest({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components: parameters
        ? [{ type: "body", parameters: parameters.map((p) => ({ type: "text", text: p })) }]
        : [],
    },
  });
}

export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<boolean> {
  return whatsappRequest({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

export async function sendWhatsAppMedia(
  to: string,
  type: "image" | "document",
  url: string,
  caption?: string
): Promise<boolean> {
  const mediaBody: Record<string, string> = { link: url };
  if (caption) mediaBody.caption = caption;

  return whatsappRequest({
    messaging_product: "whatsapp",
    to,
    type,
    [type]: mediaBody,
  });
}

export async function markAsRead(messageId: string): Promise<void> {
  if (!isWhatsAppConfigured()) return;

  try {
    await fetch(`${GRAPH_API}/${getPhoneNumberId()}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch {
    // Silent fail for read receipts
  }
}
