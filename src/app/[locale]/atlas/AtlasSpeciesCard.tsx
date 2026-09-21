import Image from "next/image";
import { ExternalLinkIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import { hrefWithSeason } from "@/lib/season/url";
import type { SeasonFilter } from "@/lib/season/types";
import {
  AtlasAudioControl,
  type AtlasAudioLabels,
} from "@/components/atlas/AtlasAudioControl";
import { SpeciesArtTransition } from "@/components/site/species-art-transition";
import { wikipediaUrlForLocale } from "@/lib/audio/links";
import type {
  PublicAudio,
  PublicEbirdLink,
  PublicWikipediaLinks,
} from "@/lib/audio/types";
import type { AppLocale } from "@/i18n/routing";

export type AtlasSpeciesCardLabels = AtlasAudioLabels & {
  wikipedia: string;
  ebird: string;
  opensNewTab: string;
};

export function AtlasSpeciesCard({
  slug,
  comName,
  sciName,
  imageUrl,
  index,
  season,
  locale,
  audio,
  ebird,
  wikipedia,
  labels,
}: {
  slug: string;
  comName: string;
  sciName: string;
  imageUrl?: string;
  index: number;
  season: SeasonFilter;
  locale: AppLocale;
  audio?: PublicAudio;
  ebird?: PublicEbirdLink;
  wikipedia?: PublicWikipediaLinks;
  labels: AtlasSpeciesCardLabels;
}) {
  const delayMs = Math.min(index, 12) * 40;
  const detailHref = hrefWithSeason(`/atlas/${slug}`, season);
  const wikipediaUrl = wikipediaUrlForLocale(wikipedia, locale);
  const hasAudio = audio?.status === "available" && Boolean(audio.url);
  const eager = index < 4;

  return (
    <Card
      size="sm"
      className="atlas-card-enter h-full overflow-hidden ring-0 shadow-[var(--raised)]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <HoverPrefetchLink
        eager={eager}
        href={detailHref}
        className="atlas-card-detail block rounded-t-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="px-(--card-spacing) pt-(--card-spacing)">
          <div className="relative aspect-square w-full overflow-hidden">
            {imageUrl ? (
              <SpeciesArtTransition slug={slug}>
                <Image
                  src={imageUrl}
                  alt={comName}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 288px"
                  loading={eager ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className="atlas-card-specimen object-contain"
                />
              </SpeciesArtTransition>
            ) : (
              <div
                className="atlas-card-specimen absolute inset-[12%] rounded-[40%_40%_35%_35%] bg-silhouette/25"
                aria-hidden
              />
            )}
          </div>
        </div>
        <CardHeader className="gap-0.5">
          <CardTitle className="atlas-card-title line-clamp-2 text-sm leading-snug text-ink underline-offset-4 decoration-hairline">
            {comName}
          </CardTitle>
        </CardHeader>
      </HoverPrefetchLink>
      <div className="-mt-2 px-(--card-spacing)">
        <CardDescription className="truncate text-xs text-ink-soft italic">
          {sciName}
        </CardDescription>
      </div>
      <Separator className="mx-auto w-[90%] self-center bg-hairline opacity-50 data-horizontal:w-[90%]" />
      <div className="flex items-center justify-between px-3 py-2">
        <AtlasAudioControl
          slug={slug}
          audioUrl={audio?.url}
          available={hasAudio}
          labels={{
            play: labels.play,
            pause: labels.pause,
            loading: labels.loading,
            retry: labels.retry,
            unavailable: labels.unavailable,
          }}
        />
        <div className="flex items-center gap-1">
          {wikipediaUrl ? (
            <a
              href={wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${labels.wikipedia} (${labels.opensNewTab})`}
              className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.7rem] text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span>{labels.wikipedia}</span>
              <ExternalLinkIcon aria-hidden className="size-3" />
            </a>
          ) : null}
          {ebird?.url ? (
            <a
              href={ebird.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${labels.ebird} (${labels.opensNewTab})`}
              className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.7rem] text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span>{labels.ebird}</span>
              <ExternalLinkIcon aria-hidden className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
