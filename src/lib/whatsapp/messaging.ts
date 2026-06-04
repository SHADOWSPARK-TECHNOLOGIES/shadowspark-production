import { config } from "@/lib/config";

interface TemplateMessage {
  to: string;
  template: string;
  language?: string;
  parameters: string[];
}

async function sendTemplateMessage(msg: TemplateMessage): Promise<{ success: boolean; messageId?: string }> {
  if (!config.features.whatsappEnabled) {
    console.log(
      "[WhatsApp:DISABLED] Would send to %s template=%s params=%j",
      msg.to,
      msg.template,
      msg.parameters
    );
    return { success: true, messageId: "console-fallback" };
  }

  try {
    const res = await fetch(
      `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: msg.to,
          type: "template",
          template: {
            name: msg.template,
            language: { code: msg.language ?? "en" },
            components: [
              {
                type: "body",
                parameters: msg.parameters.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error("[WhatsApp:ERROR]", data);
      return { success: false };
    }
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error("[WhatsApp:EXCEPTION]", err);
    return { success: false };
  }
}

// Fire-and-forget wrapper — never awaited in request handlers
function fireAndForget(msg: TemplateMessage) {
  sendTemplateMessage(msg).catch((err) => console.error("[WhatsApp:fire-and-forget]", err));
}

export function sendKYCApproved(phone: string, userName: string) {
  fireAndForget({ to: phone, template: "kyc_approved", parameters: [userName] });
}

export function sendKYCRejected(phone: string, userName: string, reason: string) {
  fireAndForget({ to: phone, template: "kyc_rejected", parameters: [userName, reason] });
}

export function sendListingVerified(phone: string, listingTitle: string) {
  fireAndForget({ to: phone, template: "listing_verified", parameters: [listingTitle] });
}

export function sendPaymentConfirmed(phone: string, amount: string, listingTitle: string) {
  fireAndForget({ to: phone, template: "payment_confirmed", parameters: [amount, listingTitle] });
}

export function sendFraudAlert(phone: string, listingTitle: string) {
  fireAndForget({ to: phone, template: "fraud_alert", parameters: [listingTitle] });
}

export function sendListingExpiryReminder(phone: string, listingTitle: string, daysLeft: number) {
  fireAndForget({ to: phone, template: "listing_expiry_reminder", parameters: [listingTitle, String(daysLeft)] });
}
