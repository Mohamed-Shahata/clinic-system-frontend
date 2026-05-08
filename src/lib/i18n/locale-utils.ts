import { routing } from "./routing";

export function getDirection(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Safe locale segment for URLs (avoids `undefined` in paths when hooks are unset). */
export function normalizeAppLocale(locale: string | undefined): string {
  if (locale && routing.locales.includes(locale as "ar" | "en")) {
    return locale;
  }
  return routing.defaultLocale;
}
