"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FastLink } from "@/components/ui/fast-link";
import type { SeasonFilter } from "@/lib/season/types";
import {
  hrefWithSeason,
  SEASON_FILTERS,
  type SeasonPickerPath,
} from "@/lib/season/url";
import { useSlidingPill } from "@/lib/ui/use-sliding-pill";
import { cn } from "@/lib/utils";
import {
  SeasonPickerLabel,
  seasonPickerItem,
  seasonPickerTrack,
} from "./season-picker-layout";

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

  useSlidingPill(trackRef, pillRef, "[data-pressed]", value, "a");

  return (
    <nav
      ref={trackRef}
      aria-label={t("ariaLabel")}
      data-filtering={pending || undefined}
      className={cn(
        seasonPickerTrack,
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
              seasonPickerItem,
              "hover:text-ink",
              active && "text-ink",
            )}
          >
            <SeasonPickerLabel full={t(id)} short={t(`short.${id}`)} />
          </FastLink>
        );
      })}
    </nav>
  );
}
