"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SpeciesArtTransition } from "@/components/site/species-art-transition";
import { useSlidingPill } from "@/lib/ui/use-sliding-pill";
import type { SpeciesRecord } from "@/lib/guide/types";
import { cn } from "@/lib/utils";

/* Font Awesome Free 6.7.2 crow and dove glyphs, copied verbatim
   from FortAwesome's free-solid SVG set (icons: CC BY 4.0). */
function PerchedBirdIcon() {
  return (
    <svg
      viewBox="0 0 640 512"
      fill="currentColor"
      aria-hidden="true"
      className="size-4 transition-opacity duration-200"
    >
      <path d="M456 0c-48.6 0-88 39.4-88 88l0 29.2L12.5 390.6c-14 10.8-16.6 30.9-5.9 44.9s30.9 16.6 44.9 5.9L126.1 384l133.1 0 46.6 113.1c5 12.3 19.1 18.1 31.3 13.1s18.1-19.1 13.1-31.3L311.1 384l40.9 0c1.1 0 2.1 0 3.2 0l46.6 113.2c5 12.3 19.1 18.1 31.3 13.1s18.1-19.1 13.1-31.3l-42-102C484.9 354.1 544 280 544 192l0-64 0-8 80.5-20.1c8.6-2.1 13.8-10.8 11.6-19.4C629 52 603.4 32 574 32l-50.1 0C507.7 12.5 483.3 0 456 0zm0 64a24 24 0 1 1 0 48 24 24 0 1 1 0-48z" />
    </svg>
  );
}

function FlightBirdIcon() {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden="true"
      className="size-4 transition-opacity duration-200"
    >
      <path d="M160.8 96.5c14 17 31 30.9 49.5 42.2c25.9 15.8 53.7 25.9 77.7 31.6l0-31.5C265.8 108.5 250 71.5 248.6 28c-.4-11.3-7.5-21.5-18.4-24.4c-7.6-2-15.8-.2-21 5.8c-13.3 15.4-32.7 44.6-48.4 87.2zM320 144l0 30.6s0 0 0 0l0 1.3s0 0 0 0l0 32.1c-60.8-5.1-185-43.8-219.3-157.2C97.4 40 87.9 32 76.6 32c-7.9 0-15.3 3.9-18.8 11C46.8 65.9 32 112.1 32 176c0 116.9 80.1 180.5 118.4 202.8L11.8 416.6C6.7 418 2.6 421.8 .9 426.8s-.8 10.6 2.3 14.8C21.7 466.2 77.3 512 160 512c3.6 0 7.2-1.2 10-3.5L245.6 448l74.4 0c88.4 0 160-71.6 160-160l0-160 29.9-44.9c1.3-2 2.1-4.4 2.1-6.8c0-6.8-5.5-12.3-12.3-12.3L400 64c-44.2 0-80 35.8-80 80zm80-16a16 16 0 1 1 0 32 16 16 0 1 1 0-32z" />
    </svg>
  );
}

export function SpeciesIllustrations({
  species,
  name,
  footerEnd,
  compact = false,
}: {
  species: Pick<SpeciesRecord, "slug" | "perchUrl" | "flightUrl">;
  name: string;
  footerEnd?: ReactNode;
  compact?: boolean;
}) {
  const t = useTranslations("AtlasDetail");
  const [pose, setPose] = useState<"perched" | "flight">("perched");
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const illustrations = [
    {
      pose: "perched" as const,
      url: species.perchUrl,
      label: t("perched"),
      alt: t("altPerched", { name }),
    },
    {
      pose: "flight" as const,
      url: species.flightUrl,
      label: t("flight"),
      alt: t("altFlight", { name }),
    },
  ].flatMap((item) => (item.url ? [{ ...item, url: item.url }] : []));

  const active =
    illustrations.find((item) => item.pose === pose) ?? illustrations[0];

  useSlidingPill(trackRef, pillRef, 'button[aria-pressed="true"]', active?.pose ?? "");

  if (!active) return null;

  const art = (
    <Image
      src={active.url}
      alt={active.alt}
      fill
      sizes="(max-width: 639px) 280px, (max-width: 1023px) 360px, 440px"
      className="postcard-bird-img object-contain"
      loading="eager"
      fetchPriority="high"
    />
  );

  return (
    <section
      aria-label={t("illustrations")}
      className={cn(
        "postcard-visual-panel relative flex w-full flex-col items-center justify-center overflow-hidden md:h-full",
        compact
          ? "min-h-56 px-5 pt-5 pb-14 sm:min-h-64 md:min-h-[420px]"
          : "min-h-64 px-5 pt-6 pb-14 sm:min-h-72 md:min-h-[440px]",
      )}
    >
      <div
        className={cn(
          "relative aspect-square w-full",
          compact
            ? "max-w-52 sm:max-w-60 md:max-w-[270px]"
            : "max-w-56 sm:max-w-64 md:max-w-[285px]",
        )}
      >
        {active.pose === "perched" && !compact ? (
          <SpeciesArtTransition slug={species.slug}>{art}</SpeciesArtTransition>
        ) : (
          art
        )}
      </div>

      {/* Bottom-left in-frame pose toggle (sliding icon pill) */}
      <div className="absolute bottom-3 left-3 z-10">
        {illustrations.length > 1 ? (
          <div
            ref={trackRef}
            role="group"
            aria-label={t("illustrations")}
            className="relative inline-flex items-center rounded-full bg-paper-2/95 p-[3px] shadow-(--recess)"
          >
            <span
              ref={pillRef}
              aria-hidden
              className="pointer-events-none absolute inset-y-[3px] left-0 z-0 rounded-full bg-background shadow-(--raised) transition-[transform,width] duration-300 ease-[cubic-bezier(0.7,0.05,0.2,1)]"
            />
            {illustrations.map((item) => {
              const selected = item.pose === active.pose;
              return (
                <button
                  key={item.pose}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={selected}
                  onClick={() => setPose(item.pose)}
                  className={cn(
                    "relative z-10 inline-flex h-7 w-8 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    selected
                      ? "text-ink [&_svg]:opacity-72"
                      : "text-ink-soft hover:text-ink hover:[&_svg]:opacity-72 focus-visible:[&_svg]:opacity-72",
                  )}
                >
                  {item.pose === "perched" ? (
                    <PerchedBirdIcon />
                  ) : (
                    <FlightBirdIcon />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="inline-flex h-7 items-center rounded-full bg-paper-2/90 px-2.5 font-mono text-[9px] tracking-[0.12em] text-ink-soft uppercase shadow-(--recess)">
            {active.label}
          </span>
        )}
      </div>

      {/* Bottom-right in-frame slot for external reference pills */}
      {footerEnd ? (
        <div className="absolute right-3 bottom-3 z-10">{footerEnd}</div>
      ) : null}
    </section>
  );
}
