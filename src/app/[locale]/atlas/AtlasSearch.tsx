"use client";

import { ArrowDownAZIcon, BarChart3Icon, CalendarRangeIcon } from "lucide-react";
import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  sortAtlasItems,
  type AtlasSortKey,
  type SortableAtlasItem,
} from "@/lib/atlas/sort";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type AtlasSearchItem = SortableAtlasItem & {
  names: string;
  content: ReactNode;
};

const SORT_OPTIONS: { key: AtlasSortKey; labelKey: string }[] = [
  { key: "prevalence", labelKey: "sortPrevalence" },
  { key: "alpha", labelKey: "sortAlpha" },
  { key: "peak", labelKey: "sortPeak" },
];

export function AtlasSearch({ items }: { items: AtlasSearchItem[] }) {
  const t = useTranslations("Atlas");
  const locale = useLocale() as AppLocale;
  const inputId = useId();
  const resultsId = useId();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<AtlasSortKey>("prevalence");
  const sortTrackRef = useRef<HTMLDivElement>(null);
  const sortPillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const track = sortTrackRef.current;
    const pill = sortPillRef.current;
    if (!track || !pill) return;

    const sync = () => {
      const current = track.querySelector<HTMLElement>(
        'button[aria-pressed="true"]',
      );
      if (!current) return;
      pill.style.width = `${current.offsetWidth}px`;
      pill.style.transform = `translateX(${current.offsetLeft}px)`;
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(track);
    return () => ro.disconnect();
  }, [sortBy]);

  const matches = useMemo(() => {
    const terms = query
      .normalize("NFKC")
      .toLocaleLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const filtered =
      terms.length === 0
        ? items
        : items.filter((item) => {
            const names = item.names.normalize("NFKC").toLocaleLowerCase();
            return terms.every((term) => names.includes(term));
          });
    return sortAtlasItems(filtered, sortBy, locale);
  }, [items, locale, query, sortBy]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Label htmlFor={inputId} className="sr-only">
          {t("searchLabel")}
        </Label>
        <Input
          id={inputId}
          type="search"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-controls={resultsId}
          className="h-10 sm:max-w-sm"
        />

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p role="status" className="font-mono text-[11px] text-ink-soft tabular-nums">
            {t("results", { count: matches.length })}
          </p>

          <div
            ref={sortTrackRef}
            role="group"
            aria-label={t("sortLabel")}
            className="relative inline-flex items-center rounded-full bg-paper-2 p-[3px] shadow-(--recess)"
          >
            <span
              ref={sortPillRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-[3px] left-0 z-0 rounded-full bg-background shadow-(--raised) transition-[transform,width] duration-300 ease-[cubic-bezier(0.7,0.05,0.2,1)]"
            />
            {SORT_OPTIONS.map((option) => {
              const active = sortBy === option.key;
              const label = t(option.labelKey);
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => setSortBy(option.key)}
                  className={cn(
                    "group/sort relative z-10 inline-flex h-7 w-8 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    active ? "text-ink" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {option.key === "prevalence" ? (
                    <BarChart3Icon aria-hidden className="size-3.5" />
                  ) : option.key === "alpha" ? (
                    <ArrowDownAZIcon aria-hidden className="size-3.5" />
                  ) : (
                    <CalendarRangeIcon aria-hidden className="size-3.5" />
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 z-30 -translate-x-1/2 rounded bg-background px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] whitespace-nowrap text-ink-soft uppercase opacity-0 shadow-(--raised) transition-opacity duration-150 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100"
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {matches.length > 0 ? (
        <ul
          id={resultsId}
          className="grid grid-cols-1 gap-3 group-has-[[data-filtering]]:opacity-60 group-has-[[data-filtering]]:transition-opacity sm:grid-cols-2 sm:gap-5 lg:grid-cols-4"
        >
          {matches.map((item) => (
            <li key={item.slug}>{item.content}</li>
          ))}
        </ul>
      ) : (
        <Empty id={resultsId} className="py-12">
          <EmptyHeader>
            <EmptyTitle>{t("noResultsTitle")}</EmptyTitle>
            <EmptyDescription>{t("noResultsDescription")}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => setQuery("")}>
            {t("clearSearch")}
          </Button>
        </Empty>
      )}
    </div>
  );
}
