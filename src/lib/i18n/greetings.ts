const GREETING_MAP = {
  en: "Hello",
  yo: "Ẹ káàbọ̀",
  ha: "Sannu",
  ig: "Nnọọ",
} as const;

type SupportedLanguage = keyof typeof GREETING_MAP;

function normalizeLanguageTag(value: string): SupportedLanguage | null {
  const baseLanguage = value.trim().toLowerCase().split("-")[0];
  return baseLanguage in GREETING_MAP
    ? (baseLanguage as SupportedLanguage)
    : null;
}

export function getGreetingFromAcceptLanguage(
  acceptLanguageHeader: string | null | undefined
): string {
  if (!acceptLanguageHeader) {
    return GREETING_MAP.en;
  }

  const candidates = acceptLanguageHeader
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter((entry): entry is string => Boolean(entry));

  for (const candidate of candidates) {
    const normalizedLanguage = normalizeLanguageTag(candidate);
    if (normalizedLanguage) {
      return GREETING_MAP[normalizedLanguage];
    }
  }

  return GREETING_MAP.en;
}

export function prependGreeting(
  content: string,
  acceptLanguageHeader: string | null | undefined
): string {
  const greeting = getGreetingFromAcceptLanguage(acceptLanguageHeader);
  return `${greeting}, ${content}`;
}
