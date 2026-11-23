"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SpeciesArtTransition } from "@/components/site/species-art-transition";
import { useSlidingPill } from "@/lib/ui/use-sliding-pill";
import type { SpeciesRecord } from "@/lib/guide/types";
import { cn } from "@/lib/utils";

function PerchedBirdIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3.5"
    >
      <path d="M16 7h.01" />
      <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
      <path d="m20 7 2 .5-2 .5" />
      <path d="M10 18v3" />
      <path d="M14 17.75V21" />
      <path d="M7 18a6 6 0 0 0 3.84-10.61" />
    </svg>
  );
}

function FlightBirdIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3.5"
    >
      <path d="M2 13c4-1 7-4 10-9 1 4 3 6.5 6 7.5 1.5.5 3 .5 4 0-1.5 2-3.5 3.5-6 4 1.5 1 2.5 2.5 3 4.5-3-1-6-2-8-4-3 1-6 .5-9-3Z" />
      <path d="M13 11.5c-2.5-1.5-5.5-2.5-9-2" />
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
        "postcard-visual-panel relative flex w-full flex-col items-center justify-center overflow-hidden lg:h-full",
        compact
          ? "min-h-60 px-6 pt-6 pb-14 sm:min-h-72 lg:min-h-0"
          : "min-h-76 px-6 pt-8 pb-16 sm:min-h-96 lg:min-h-0",
      )}
    >
      <div
        className={cn(
          "relative aspect-square w-full",
          compact ? "max-w-56 sm:max-w-72" : "max-w-64 sm:max-w-80 lg:max-w-92",
        )}
      >
        {active.pose === "perched" ? (
          <SpeciesArtTransition slug={species.slug}>{art}</SpeciesArtTransition>
        ) : (
          art
        )}
      </div>

      {/* Bottom-left in-frame pose toggle (sliding icon pill with shadcn Tooltips) */}
      <div className="absolute bottom-3 left-3 z-10">
        {illustrations.length > 1 ? (
          <TooltipProvider>
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
                  <Tooltip key={item.pose}>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          aria-label={item.label}
                          aria-pressed={selected}
                          onClick={() => setPose(item.pose)}
                          className={cn(
                            "relative z-10 inline-flex h-7 w-8 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                            selected ? "text-ink" : "text-ink-soft hover:text-ink",
                          )}
                        />
                      }
                    >
                      {item.pose === "perched" ? (
                        <PerchedBirdIcon />
                      ) : (
                        <FlightBirdIcon />
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="top">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
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
