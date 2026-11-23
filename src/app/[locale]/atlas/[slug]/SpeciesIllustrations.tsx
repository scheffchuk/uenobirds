"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SpeciesArtTransition } from "@/components/site/species-art-transition";
import type { SpeciesRecord } from "@/lib/guide/types";

export function SpeciesIllustrations({
  species,
  name,
}: {
  species: Pick<SpeciesRecord, "slug" | "perchUrl" | "flightUrl">;
  name: string;
}) {
  const t = useTranslations("AtlasDetail");
  const [pose, setPose] = useState<"perched" | "flight">("perched");
  const illustrations = [
    {
      pose: "perched",
      url: species.perchUrl,
      label: t("perched"),
      alt: t("altPerched", { name }),
    },
    {
      pose: "flight",
      url: species.flightUrl,
      label: t("flight"),
      alt: t("altFlight", { name }),
    },
  ].flatMap((item) => (item.url ? [{ ...item, url: item.url }] : []));
  const active =
    illustrations.find((item) => item.pose === pose) ?? illustrations[0];
  if (!active) return null;

  const art = (
    <Image
      src={active.url}
      alt={active.alt}
      fill
      sizes="(max-width: 639px) 240px, (max-width: 1023px) 320px, 400px"
      className="object-contain"
      loading="eager"
      fetchPriority="high"
    />
  );

  return (
    <section
      aria-label={t("illustrations")}
      className="flex flex-col items-center gap-3"
    >
      <div className="relative aspect-square w-full max-w-60 sm:max-w-80 lg:max-w-100">
        {active.pose === "perched" ? (
          <SpeciesArtTransition slug={species.slug}>{art}</SpeciesArtTransition>
        ) : (
          art
        )}
      </div>
      {illustrations.length > 1 ? (
        <ToggleGroup
          value={[active.pose]}
          onValueChange={(values) => {
            const next = values[0];
            if (next === "perched" || next === "flight") setPose(next);
          }}
          variant="outline"
          aria-label={t("illustrations")}
        >
          {illustrations.map((item) => (
            <ToggleGroupItem key={item.pose} value={item.pose}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        <p className="text-xs text-ink-soft">{active.label}</p>
      )}
    </section>
  );
}
