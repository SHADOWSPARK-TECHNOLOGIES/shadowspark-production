import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || 'ShadowSpark <ops@shadowspark-tech.org>';

export type EmailResult = { sent: true } | { sent: false; reason: string };

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<EmailResult> {
  const recipients = Array.isArray(to) ? to : [to];
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const reason = 'RESEND_API_KEY not set';
    console.warn(`sendEmail skipped: ${reason}. Subject: "${subject}" to:`, recipients);
    return { sent: false, reason };
  }

  try {
    const client = new Resend(apiKey);
    await client.emails.send({
      from: FROM,
      to: recipients,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('Resend send failed:', err);
    throw err;
  }
}

export async function resend(to: string, content: string): Promise<EmailResult> {
  return sendEmail(to, 'Resend Message', content);
}

export async function sendWelcomeEmail(to: string, name?: string): Promise<EmailResult> {
  const html = `<div><p>Hi ${name || ''},</p><p>Welcome to ShadowSpark.</p></div>`;
  return sendEmail(to, 'Welcome to ShadowSpark', html);
}

export default { sendEmail, resend, sendWelcomeEmail };
