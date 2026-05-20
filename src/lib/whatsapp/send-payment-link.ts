/**
 * WhatsApp Payment Link Sender
 *
 * Sends a personalized Paystack payment link to a lead via Meta Cloud API.
 * Uses the WhatsApp Business API to deliver Nigeria-optimized payment nudges.
 *
 * Environment variables required:
 *   META_ACCESS_TOKEN  — WhatsApp Cloud API access token
 *   META_PHONE_NUMBER_ID — WhatsApp Business phone number ID
 */

const META_API_VERSION = "v21.0";
const META_GRAPH_URL = "https://graph.facebook.com";

function getConfig() {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token) {
    throw new Error("META_ACCESS_TOKEN is not set");
  }
  if (!phoneNumberId) {
    throw new Error("META_PHONE_NUMBER_ID is not set");
  }

  return { token, phoneNumberId };
}

export type SendPaymentLinkResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Sends a payment link via WhatsApp template message.
 *
 * Uses the `demo_payment_nudge` template with parameters:
 *   - {{1}}: Lead first name or "there"
 *   - {{2}}: Amount in NGN (e.g., "₦149")
 *   - {{3}}: Tier name (e.g., "Starter")
 *   - {{4}}: Paystack authorization URL
 */
export async function sendPaymentLinkWhatsApp(
  phoneNumber: string,
  params: {
    firstName?: string;
    amountNgn: string;
    tier: string;
    authorizationUrl: string;
  }
): Promise<SendPaymentLinkResult> {
  try {
    const { token, phoneNumberId } = getConfig();

    // Normalize phone number: ensure it starts with +
    const to = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;

    const response = await fetch(
      `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: "demo_payment_nudge",
            language: {
              code: "en",
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: params.firstName ?? "there",
                  },
                  {
                    type: "text",
                    text: params.amountNgn,
                  },
                  {
                    type: "text",
                    text: params.tier,
                  },
                  {
                    type: "text",
                    text: params.authorizationUrl,
                  },
                ],
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message ?? data.error ?? "Unknown WhatsApp API error";
      console.error("[WhatsApp] Send payment link failed:", errorMsg);
      return { success: false, error: String(errorMsg) };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[WhatsApp] Send payment link error:", message);
    return { success: false, error: message };
  }
}

/**
 * Sends a plain text message via WhatsApp (fallback if template not approved).
 */
export async function sendTextWhatsApp(
  phoneNumber: string,
  text: string
): Promise<SendPaymentLinkResult> {
  try {
    const { token, phoneNumberId } = getConfig();

    const to = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;

    const response = await fetch(
      `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: {
            preview_url: true,
            body: text,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message ?? data.error ?? "Unknown WhatsApp API error";
      console.error("[WhatsApp] Send text failed:", errorMsg);
      return { success: false, error: String(errorMsg) };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[WhatsApp] Send text error:", message);
    return { success: false, error: message };
  }
}
