"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { hrefWithSeason } from "@/lib/season/url";
import { hitTestCollageTiles } from "@/lib/collage/mask";
import type {
  CollageLabelInkTier,
  CollageLabelPath,
} from "@/lib/collage/label-path";
import { useCollageLabelsVisible } from "@/lib/collage/label-preference";
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

const INK_FILTER_TIERS: {
  tier: CollageLabelInkTier;
  baseFrequency: number;
  scale: number;
}[] = [
  { tier: "subtle", baseFrequency: 0.5, scale: 0.4 },
  { tier: "medium", baseFrequency: 0.48, scale: 0.65 },
  { tier: "strong", baseFrequency: 0.45, scale: 0.9 },
];

function lcpSlug(tiles: SeasonTile[]): string | undefined {
  return [...tiles]
    .filter((tile) => tile.portrait.y < 30)
    .sort(
      (a, b) =>
        a.portrait.y - b.portrait.y || a.portrait.x - b.portrait.x,
    )[0]?.slug;
}

function CurvedTileLabel({
  idPrefix,
  slug,
  orientation,
  label,
  text,
  locale,
  active,
  className,
}: {
  idPrefix: string;
  slug: string;
  orientation: "portrait" | "landscape";
  label: CollageLabelPath;
  text: string;
  locale: AppLocale;
  active: boolean;
  className: string;
}) {
  const pathId = `${idPrefix}-${orientation}-${slug}`;
  const isLatin = locale === "en";
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${label.vbW} ${label.vbH}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn(
        "collage-label pointer-events-none absolute inset-0 size-full overflow-visible transition-opacity duration-200",
        active ? "collage-label-active" : undefined,
        className,
      )}
    >
      <defs>
        <path id={pathId} d={label.d} fill="none" />
      </defs>
      <text
        data-ink={label.ink}
        className={cn(
          "collage-label-text font-heading",
          isLatin && "italic",
        )}
        style={{
          fontSize: `${label.fontSize}px`,
        }}
      >
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </svg>
  );
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
  const idPrefix = useId();
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [labelsVisible] = useCollageLabelsVisible();
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
    if (event.target instanceof Element && event.target.closest("a, button")) {
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
      {/* Subtle ink-on-paper SVG filters shared across curved silhouette labels */}
      <svg
        className="pointer-events-none absolute size-0 overflow-hidden"
        aria-hidden="true"
      >
        <defs>
          {INK_FILTER_TIERS.map(({ tier, baseFrequency, scale }) => (
            <filter
              key={tier}
              id={`collage-ink-${tier}`}
              x="-6%"
              y="-16%"
              width="112%"
              height="132%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency={baseFrequency}
                numOctaves={2}
                seed={17}
                result="tooth"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="tooth"
                scale={scale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
        </defs>
      </svg>

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
                  "collage-tile pointer-events-none overflow-visible rounded-lg outline-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring/60",
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
                {labelsVisible && tile.label?.portrait ? (
                  <CurvedTileLabel
                    idPrefix={idPrefix}
                    slug={tile.slug}
                    orientation="portrait"
                    label={tile.label.portrait}
                    text={name}
                    locale={locale}
                    active={isActive}
                    className="md:hidden"
                  />
                ) : null}
                {labelsVisible && tile.label?.landscape ? (
                  <CurvedTileLabel
                    idPrefix={idPrefix}
                    slug={tile.slug}
                    orientation="landscape"
                    label={tile.label.landscape}
                    text={name}
                    locale={locale}
                    active={isActive}
                    className="hidden md:block"
                  />
                ) : null}
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
