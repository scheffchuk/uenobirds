"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FastLink } from "@/components/ui/fast-link";
import type { SeasonFilter } from "@/lib/season/types";
import {
  hrefWithSeason,
  SEASON_FILTERS,
  type SeasonPickerPath,
} from "@/lib/season/url";
import { cn } from "@/lib/utils";

/** Season pills as FastLink navigations — prefetch all five. */
export function SeasonPicker({
  value,
  pathname,
  className,
}: {
  value: SeasonFilter;
  pathname: SeasonPickerPath;
  className?: string;
}) {
  const t = useTranslations("Season");
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const [pendingFor, setPendingFor] = useState<SeasonFilter | null>(null);
  if (pendingFor === value) {
    setPendingFor(null);
  }
  const pending = pendingFor !== null && pendingFor !== value;

  useLayoutEffect(() => {
    const track = trackRef.current;
    const pill = pillRef.current;
    if (!track || !pill) return;

    const sync = () => {
      const active = track.querySelector<HTMLElement>("[data-pressed]");
      if (!active) return;
      pill.style.width = `${active.offsetWidth}px`;
      pill.style.transform = `translateX(${active.offsetLeft}px)`;
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(track);
    for (const link of track.querySelectorAll("a")) {
      ro.observe(link);
    }
    return () => ro.disconnect();
  }, [value]);

  return (
    <nav
      ref={trackRef}
      aria-label={t("ariaLabel")}
      data-filtering={pending || undefined}
      className={cn(
        "relative inline-flex h-8 items-center rounded-full bg-paper-2 p-1 shadow-(--recess)",
        className,
      )}
    >
      <span
        ref={pillRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-0 z-0 rounded-full bg-background shadow-(--raised) transition-[transform,width] duration-[320ms] ease-[cubic-bezier(0.7,0.05,0.2,1)] will-change-[transform,width]"
      />
      {SEASON_FILTERS.map((id) => {
        const active = id === value;
        return (
          <FastLink
            key={id}
            href={hrefWithSeason(pathname, id)}
            replace
            prefetch={true}
            aria-label={t(id)}
            aria-current={active ? "page" : undefined}
            data-pressed={active ? "" : undefined}
            onPressNavigate={() => setPendingFor(id)}
            className={cn(
              "relative z-10 inline-flex h-full min-h-0 min-w-0 items-center justify-center rounded-full px-3 font-mono text-[10px] leading-none text-ink-soft uppercase",
              "hover:text-ink",
              active && "text-ink",
            )}
          >
            <span className="hidden tracking-[0.14em] pl-[0.14em] sm:inline">
              {t(id)}
            </span>
            <span className="tracking-[0.14em] pl-[0.14em] sm:hidden">
              {t(`short.${id}`)}
            </span>
          </FastLink>
        );
      })}
    </nav>
  );
}
