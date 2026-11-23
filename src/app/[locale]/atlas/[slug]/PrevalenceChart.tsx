"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import type { SeasonalPrevalence } from "@/lib/guide/types";
import { SEASONS, type Season, type SeasonFilter } from "@/lib/season/types";
import { isSeasonFilter } from "@/lib/season/url";
import { cn } from "@/lib/utils";

function PrevalenceBars({
  prevalence,
  activeSeason,
}: {
  prevalence: SeasonalPrevalence;
  activeSeason?: SeasonFilter;
}) {
  const t = useTranslations("Season");
  const tDetail = useTranslations("AtlasDetail");

  return (
    <div
      className="grid grid-cols-4 items-end gap-3 border-t border-hairline pt-4"
      role="img"
      aria-label={tDetail("prevalence")}
    >
      {SEASONS.map((season: Season) => {
        const value = prevalence[season];
        const label = t(season);
        const heightPct = Math.max(value, value > 0 ? 6 : 0);
        const isActive = activeSeason === season;
        return (
          <div
            key={season}
            data-season={season}
            data-active-season={isActive ? "true" : undefined}
            className="flex flex-col items-center gap-2"
          >
            <span
              className={cn(
                "font-mono text-xs tabular-nums transition-colors",
                isActive ? "font-semibold text-ink" : "text-ink-soft",
              )}
            >
              {value}
            </span>
            <div className="relative flex h-32 w-full items-end justify-center">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-hairline/65"
              />
              <div
                className={cn(
                  "stipple-bar relative z-10 w-full max-w-11 rounded-t-[2px] transition-opacity",
                  isActive ? "stipple-bar-active" : undefined,
                  value === 0 && "opacity-0",
                )}
                style={{ height: `${heightPct}%` }}
                title={`${label}: ${value}`}
              />
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-center font-mono text-[10px] tracking-[0.12em] uppercase",
                isActive ? "font-semibold text-ink" : "text-ink-soft",
              )}
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-ink"
                />
              ) : null}
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SearchParamsPrevalenceBars({
  prevalence,
}: {
  prevalence: SeasonalPrevalence;
}) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("season");
  const active = raw && isSeasonFilter(raw) ? raw : undefined;
  return <PrevalenceBars prevalence={prevalence} activeSeason={active} />;
}

/** Four-bar Season Prevalence chart (0–100) with stippled letterpress ink bars. */
export function PrevalenceChart({
  prevalence,
  activeSeason,
}: {
  prevalence: SeasonalPrevalence;
  /** Optional explicit highlight (bypasses URL query reading in tests/static renders). */
  activeSeason?: SeasonFilter;
}) {
  if (activeSeason !== undefined) {
    return <PrevalenceBars prevalence={prevalence} activeSeason={activeSeason} />;
  }

  return (
    <Suspense fallback={<PrevalenceBars prevalence={prevalence} />}>
      <SearchParamsPrevalenceBars prevalence={prevalence} />
    </Suspense>
  );
}
