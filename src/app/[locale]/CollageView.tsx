"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { hrefWithSeason } from "@/lib/season/url";
import type { CollageArt, SeasonTile } from "@/lib/collage/types";
import type { SeasonFilter } from "@/lib/season/types";
import { commonNameForLocale } from "@/lib/locale/species";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { SeasonFilterControl } from "@/components/season/SeasonFilterControl";
import { SeasonLink } from "@/components/season/SeasonLink";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import { SpeciesArtTransition } from "@/components/site/species-art-transition";
import type { AppLocale } from "@/i18n/routing";

const COLLAGE_IMAGE_SIZES = "(max-width: 767px) 30vw, 12vw";

function lcpSlug(tiles: SeasonTile[]): string | undefined {
  return [...tiles]
    .filter((tile) => tile.portrait.y < 30)
    .sort(
      (a, b) =>
        a.portrait.y - b.portrait.y || a.portrait.x - b.portrait.x,
    )[0]?.slug;
}

export function CollageView({
  art,
  tiles,
  season,
}: {
  art: CollageArt[];
  tiles: SeasonTile[];
  season: SeasonFilter;
}) {
  const t = useTranslations("Collage");
  const locale = useLocale() as AppLocale;
  const [hovered, setHovered] = useState<CollageArt | null>(null);

  const artBySlug = new Map(art.map((item) => [item.slug, item]));
  const hoverName = hovered ? commonNameForLocale(hovered, locale) : null;
  const prioritySlug = lcpSlug(tiles);

  return (
    <div className="group collage-frame" onMouseLeave={() => setHovered(null)}>
      <SeasonFilterControl
        season={season}
        pathname="/"
        className="fixed top-4 left-4 z-30 md:top-5 md:left-7"
      />

      {tiles.length === 0 ? (
        <Empty className="absolute inset-0 border-0">
          <EmptyHeader>
            <EmptyTitle className="font-heading text-xl">
              {t("emptyTitle")}
            </EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <SeasonLink
              pathname="/atlas"
              prefetch={true}
              className="rounded-full bg-background px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-ink uppercase shadow-[var(--raised)]"
            >
              {t("browseAtlas")}
            </SeasonLink>
          </EmptyContent>
        </Empty>
      ) : (
        <div
          className="collage-stage group-has-[[data-filtering]]:opacity-60 group-has-[[data-filtering]]:transition-opacity"
          aria-label={t("ariaLabel")}
        >
          {tiles.map((tile) => {
            const item = artBySlug.get(tile.slug);
            if (!item) return null;
            const name = commonNameForLocale(item, locale);
            const eager = tile.portrait.y < 45;
            const priority = tile.slug === prioritySlug;
            return (
              <HoverPrefetchLink
                key={tile.slug}
                eager={eager}
                href={hrefWithSeason(`/atlas/${tile.slug}`, season)}
                className="collage-tile hover:z-10"
                style={
                  {
                    "--tile-x": `${tile.portrait.x}%`,
                    "--tile-y": `${tile.portrait.y}%`,
                    "--tile-w": `${tile.portrait.width}%`,
                    "--tile-h": `${tile.portrait.height}%`,
                    "--tile-x-lg": `${tile.landscape.x}%`,
                    "--tile-y-lg": `${tile.landscape.y}%`,
                    "--tile-w-lg": `${tile.landscape.width}%`,
                    "--tile-h-lg": `${tile.landscape.height}%`,
                  } as CSSProperties
                }
                onMouseEnter={() => setHovered(item)}
                onFocus={() => setHovered(item)}
              >
                <SpeciesArtTransition slug={tile.slug}>
                  <Image
                    src={item.url}
                    alt={name}
                    fill
                    sizes={COLLAGE_IMAGE_SIZES}
                    className="object-contain"
                    loading={eager ? "eager" : "lazy"}
                    fetchPriority={priority ? "high" : "auto"}
                  />
                </SpeciesArtTransition>
              </HoverPrefetchLink>
            );
          })}
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-background px-3.5 py-1.5 font-heading text-[13px] tracking-wide text-ink-2 italic shadow-[0_2px_8px_rgba(26,22,18,0.06)] transition-opacity duration-150"
        style={{ opacity: hovered ? 1 : 0 }}
        aria-hidden={!hovered}
      >
        {hoverName ? (
          <span className="font-semibold not-italic">{hoverName}</span>
        ) : null}
      </div>
    </div>
  );
}
