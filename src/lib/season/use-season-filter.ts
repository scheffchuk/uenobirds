"use client";

import { useSearchParams } from "next/navigation";
import { readSeasonSearchParam } from "@/lib/season/url";
import type { SeasonFilter } from "@/lib/season/types";

/** Present `?season=` only — undefined when missing/invalid (for nav links). */
export function useSeasonQuery(): SeasonFilter | undefined {
  const searchParams = useSearchParams();
  return readSeasonSearchParam(searchParams.get("season") ?? undefined);
}
