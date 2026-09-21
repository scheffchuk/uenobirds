import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { seasonAt } from "./calendar";
import { readSeasonSearchParam, type SeasonPickerPath } from "./url";
import type { SeasonFilter } from "./types";

export type SeasonSearch = { season?: string | string[] };

/**
 * Season from `searchParams` after proxy canonicalize.
 * Redirects if the query is still missing (proxy miss / tests).
 */
export async function requireSeasonParam(
  search: SeasonSearch,
  pathname: SeasonPickerPath,
  instant?: Date | number,
): Promise<SeasonFilter> {
  const season = readSeasonSearchParam(search.season);
  if (season) return season;
  await connection();
  return redirect({
    href: { pathname, query: { season: seasonAt(instant ?? Date.now()) } },
    locale: await getLocale(),
  });
}
