"use client";

/**
 * Google Analytics 4 + Conversion Tracking Hook
 *
 * Provides safe wrappers around gtag for page views, custom events,
 * and conversion tracking. All calls are guarded by typeof window checks
 * to prevent SSR/SSG errors.
 */

declare global {
  interface Window {
    gtag: (
      command: "config" | "event" | "js",
      targetId: string,
      config?: Record<string, unknown>,
    ) => void;
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

/**
 * Tracks a page view in GA4.
 * Should be called on route changes (e.g., in a useEffect or Router event).
 */
export function trackPageView(url: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/**
 * Tracks a custom event in GA4.
 *
 * @param action - Event action name (e.g., "button_click", "form_submit")
 * @param category - Event category (e.g., "engagement", "conversion")
 * @param label - Optional event label for additional context
 * @param value - Optional numeric value associated with the event
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number,
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

/**
 * Tracks a conversion event (e.g., checkout, signup).
 *
 * @param name - Conversion name (e.g., "purchase", "signup", "lead")
 * @param value - Optional monetary value of the conversion
 */
export function trackConversion(name: string, value?: number): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", "conversion", {
    send_to: `${GA_MEASUREMENT_ID}/${name}`,
    value: value,
    currency: value ? "NGN" : undefined,
  });
}

/**
 * React hook that tracks a page view on mount.
 * Use in page-level components or layouts.
 */
export function usePageView(pageName: string): void {
  if (typeof window === "undefined") return;
  // Using a simple approach -- in a real app you'd use useEffect + pathname
  trackPageView(pageName);
}
