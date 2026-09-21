import { locales } from "@/i18n/routing";
import { seasonAt } from "./calendar";
import { readSeasonSearchParam } from "./url";

const LOCALES_BY_LENGTH = [...locales].sort((a, b) => b.length - a.length);

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname || "/";
}

/** Pathname without the Locale prefix (`/` or `/atlas/...`). */
export function stripLocalePrefix(pathname: string): string {
  const normalized = stripTrailingSlash(pathname);
  for (const locale of LOCALES_BY_LENGTH) {
    const prefix = `/${locale}`;
    if (normalized === prefix) return "/";
    if (normalized.startsWith(`${prefix}/`)) {
      return stripTrailingSlash(normalized.slice(prefix.length)) || "/";
    }
  }
  return normalized || "/";
}

/**
 * Collage home and Atlas list only — not about, audio, admin, or species detail.
 */
export function isSeasonCanonicalPath(pathname: string): boolean {
  const stripped = stripLocalePrefix(pathname);
  return stripped === "/" || stripped === "/atlas";
}

/** Missing or invalid `?season=` on a canonical path → current Tokyo Season. */
export function seasonCanonicalLocation(
  url: URL,
  instant: Date | number = Date.now(),
): URL | null {
  if (!isSeasonCanonicalPath(url.pathname)) return null;
  const current = readSeasonSearchParam(
    url.searchParams.get("season") ?? undefined,
  );
  if (current) return null;
  const next = new URL(url);
  next.searchParams.set("season", seasonAt(instant));
  return next;
}
