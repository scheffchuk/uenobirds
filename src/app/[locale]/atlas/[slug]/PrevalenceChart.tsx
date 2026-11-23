"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import type { SeasonalPrevalence } from "@/lib/guide/types";
import { SEASONS, type Season, type SeasonFilter } from "@/lib/season/types";
import { isSeasonFilter } from "@/lib/season/url";
import { cn } from "@/lib/utils";

function PrevalenceStrip({
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
      className="grid grid-cols-4 gap-3 border-t border-hairline/70 pt-3"
      role="img"
      aria-label={tDetail("prevalence")}
    >
      {SEASONS.map((season: Season) => {
        const value = prevalence[season];
        const label = t(season);
        const widthPct = Math.max(value, value > 0 ? 4 : 0);
        const isActive = activeSeason === season;
        return (
          <div
            key={season}
            data-season={season}
            data-active-season={isActive ? "true" : undefined}
            className="flex min-w-0 flex-col gap-1"
          >
            <div className="flex items-baseline justify-between gap-1 font-mono text-[11px] leading-[1.45]">
              <span
                className={cn(
                  "whitespace-nowrap transition-colors",
                  isActive ? "font-medium text-ink" : "text-ink-soft",
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  "tabular-nums transition-colors",
                  isActive
                    ? "font-semibold text-ink"
                    : value > 0
                      ? "text-ink-2"
                      : "text-ink-soft/60",
                )}
              >
                {value}
              </span>
            </div>
            <div className="h-[2px] w-full overflow-hidden rounded-full bg-hairline/55">
              <div
                className={cn(
                  "h-full rounded-full transition-[width,background-color]",
                  isActive ? "bg-ink" : "bg-ink-2/50",
                  value === 0 && "opacity-0",
                )}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SearchParamsPrevalenceStrip({
  prevalence,
}: {
  prevalence: SeasonalPrevalence;
}) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("season");
  const active = raw && isSeasonFilter(raw) ? raw : undefined;
  return <PrevalenceStrip prevalence={prevalence} activeSeason={active} />;
}

/** Compact inline 4-season prevalence metadata strip (0–100). */
export function PrevalenceChart({
  prevalence,
  activeSeason,
}: {
  prevalence: SeasonalPrevalence;
  /** Optional explicit highlight (bypasses URL query reading in tests/static renders). */
  activeSeason?: SeasonFilter;
}) {
  if (activeSeason !== undefined) {
    return (
      <PrevalenceStrip prevalence={prevalence} activeSeason={activeSeason} />
    );
  }

  return (
    <Suspense fallback={<PrevalenceStrip prevalence={prevalence} />}>
      <SearchParamsPrevalenceStrip prevalence={prevalence} />
    </Suspense>
  );
}
