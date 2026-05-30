import { Resend } from "resend";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, company, email, whatsapp, message } = body ?? {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.log("[contact] inquiry received — no RESEND_API_KEY configured");
    return Response.json({
      success: true,
      degraded: true,
      message: "Received. We will get back to you within 48 hours.",
    });
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: "ShadowSpark <onboarding@resend.dev>",
      to: process.env.CONTACT_INBOX ?? "hello@shadowspark.ng", // TODO: needs real value from operator
      replyTo: email,
      subject: `New project inquiry — ${name}${company ? ` (${company})` : ""}`,
      text: `Name: ${name}\nCompany: ${company || "—"}\nEmail: ${email}\nWhatsApp: ${whatsapp || "—"}\n\n${message}`,
    });

    return Response.json({ success: true, message: "Received. We will reply within 48 hours." });
  } catch (e) {
    console.error("[contact] Resend failed:", e);
    return Response.json(
      { error: "Could not send right now. Please email hello@shadowspark.ng directly." }, // TODO: needs real value from operator
      { status: 500 }
    );
  }
}
