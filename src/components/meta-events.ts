"use client";

type MetaEventName =
  | "PageView"
  | "Lead"
  | "InitiateCheckout"
  | "Purchase"
  | "Contact";

type MetaEventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    fbq?: (
      command: "track" | "init" | "consent",
      eventOrId: string,
      params?: MetaEventParams
    ) => void;
  }
}

export function trackMetaEvent(event: MetaEventName, params?: MetaEventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;

  window.fbq("track", event, params);

  if (process.env.NODE_ENV === "development") {
    console.info("[meta-event]", event, params ?? {});
  }
}
