import { Resend } from "resend";

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const SITE_URL = "https://r2ftrading.com";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[]
) {
  const resend = getClient();
  // One-click unsubscribe (RFC 8058) — required by Gmail/Yahoo for bulk senders,
  // and a strong signal against spam-foldering. reply_to routes replies to a real inbox.
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(to)}`;
  await resend.emails.send({
    from: "R2F Trading <noreply@r2ftrading.com>",
    to,
    subject,
    html,
    replyTo: "road2funded@gmail.com",
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:road2funded@gmail.com?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });
}

export async function addToAudience(email: string) {
  const resend = getClient();
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) return;

  try {
    await resend.contacts.create({
      audienceId,
      email,
    });
  } catch {
    // Contact may already exist — that's fine
  }
}
