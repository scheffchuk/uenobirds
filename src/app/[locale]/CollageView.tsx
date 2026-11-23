"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { hrefWithSeason } from "@/lib/season/url";
import { hitTestCollageTiles } from "@/lib/collage/mask";
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
import { SeasonLink } from "@/components/season/SeasonLink";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import { SpeciesArtTransition } from "@/components/site/species-art-transition";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

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
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const decodedCacheRef = useRef(new Map<string, Uint8Array>());

  const artBySlug = useMemo(
    () => new Map(art.map((item) => [item.slug, item])),
    [art],
  );
  const hovered = hoveredSlug ? (artBySlug.get(hoveredSlug) ?? null) : null;
  const hoverName = hovered ? commonNameForLocale(hovered, locale) : null;
  const prioritySlug = lcpSlug(tiles);

  const hitTestAt = (clientX: number, clientY: number): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const pctX = ((clientX - rect.left) / rect.width) * 100;
    const pctY = ((clientY - rect.top) / rect.height) * 100;
    const mode = rect.width >= rect.height ? "landscape" : "portrait";

    return hitTestCollageTiles(
      tiles.map((tile) => ({
        slug: tile.slug,
        rect: tile[mode],
        mask: artBySlug.get(tile.slug)?.mask,
      })),
      pctX,
      pctY,
      decodedCacheRef.current,
    );
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const hit = hitTestAt(event.clientX, event.clientY);
    if (hit !== hoveredSlug) {
      setHoveredSlug(hit);
    }
  };

  const handleStageClick = (event: MouseEvent<HTMLDivElement>) => {
    // Let direct keyboard activation on focused anchor links proceed normally.
    if (event.target instanceof Element && event.target.closest("a")) {
      return;
    }
    const hit = hitTestAt(event.clientX, event.clientY);
    if (!hit) return;
    const anchor = linkRefs.current.get(hit);
    if (!anchor) return;
    if (event.metaKey || event.ctrlKey) {
      window.open(anchor.href, "_blank", "noopener");
      return;
    }
    anchor.click();
  };

  return (
    <div
      className="group collage-frame"
      onPointerLeave={() => setHoveredSlug(null)}
    >
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
          ref={stageRef}
          className={cn(
            "collage-stage group-has-[[data-filtering]]:opacity-60 group-has-[[data-filtering]]:transition-opacity",
            hoveredSlug ? "cursor-pointer" : "cursor-default",
          )}
          aria-label={t("ariaLabel")}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoveredSlug(null)}
          onClick={handleStageClick}
        >
          {tiles.map((tile) => {
            const item = artBySlug.get(tile.slug);
            if (!item) return null;
            const name = commonNameForLocale(item, locale);
            const eager = tile.portrait.y < 45;
            const priority = tile.slug === prioritySlug;
            const isActive = hoveredSlug === tile.slug;
            return (
              <HoverPrefetchLink
                key={tile.slug}
                ref={(node: HTMLAnchorElement | null) => {
                  if (node) {
                    linkRefs.current.set(tile.slug, node);
                  } else {
                    linkRefs.current.delete(tile.slug);
                  }
                }}
                eager={eager || isActive}
                href={hrefWithSeason(`/atlas/${tile.slug}`, season)}
                data-hovered={isActive ? "" : undefined}
                className={cn(
                  "collage-tile pointer-events-none rounded-lg outline-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring/60",
                  isActive && "is-hover",
                )}
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
                onFocus={() => setHoveredSlug(tile.slug)}
                onBlur={() =>
                  setHoveredSlug((prev) => (prev === tile.slug ? null : prev))
                }
              >
                <SpeciesArtTransition slug={tile.slug}>
                  <Image
                    src={item.url}
                    alt={name}
                    fill
                    sizes={COLLAGE_IMAGE_SIZES}
                    className="collage-tile-img object-contain"
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
