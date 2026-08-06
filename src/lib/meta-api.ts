type MetaUserDataInput = {
  email?: string;
  phone?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
};

type MetaCustomData = Record<string, string | number | boolean | null | undefined>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashUserData(
  email?: string,
  phone?: string
): Promise<{ em?: string[]; ph?: string[] }> {
  const result: { em?: string[]; ph?: string[] } = {};

  if (email) {
    result.em = [await sha256(normalizeEmail(email))];
  }
  if (phone) {
    result.ph = [await sha256(normalizePhone(phone))];
  }

  return result;
}

export function buildMetaPayload(args: {
  eventName: string;
  eventTime: number;
  userData: MetaUserDataInput & { em?: string[]; ph?: string[] };
  customData?: MetaCustomData;
}) {
  return {
    data: [
      {
        event_name: args.eventName,
        event_time: args.eventTime,
        action_source: "website",
        user_data: args.userData,
        custom_data: args.customData ?? {},
      },
    ],
  };
}

export async function sendToMetaAPI(args: {
  pixelId: string;
  accessToken: string;
  payload: ReturnType<typeof buildMetaPayload>;
}): Promise<{ events_received?: number; fbtrace_id?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${encodeURIComponent(args.pixelId)}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.accessToken}`,
      },
      body: JSON.stringify(args.payload),
    }
  );

  const data = (await response.json()) as { events_received?: number; fbtrace_id?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || "Meta Conversions API request failed");
  }

  return data;
}
