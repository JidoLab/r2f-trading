import { Resend } from "resend";

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[]
) {
  const resend = getClient();
  await resend.emails.send({
    from: "R2F Trading <noreply@r2ftrading.com>",
    to,
    subject,
    html,
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
