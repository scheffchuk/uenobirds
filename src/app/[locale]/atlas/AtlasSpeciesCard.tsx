import Image from "next/image";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import { hrefWithSeason } from "@/lib/season/url";
import type { SeasonFilter } from "@/lib/season/types";
import {
  AtlasAudioControl,
  type AtlasAudioLabels,
} from "@/components/atlas/AtlasAudioControl";
import { SpeciesArtTransition } from "@/components/site/species-art-transition";
import type { PublicAudio } from "@/lib/audio/types";

export function AtlasSpeciesCard({
  slug,
  comName,
  sciName,
  imageUrl,
  index,
  season,
  audio,
  labels,
}: {
  slug: string;
  comName: string;
  sciName: string;
  imageUrl?: string;
  index: number;
  season: SeasonFilter;
  audio?: PublicAudio;
  labels: AtlasAudioLabels;
}) {
  const eager = index < 4;

  return (
    <Card
      size="sm"
      className="atlas-card-enter relative h-full flex-row items-center gap-0 overflow-hidden py-2 pr-12 ring-0 shadow-[var(--raised)] sm:flex-col sm:items-stretch sm:py-3 sm:pr-0"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <HoverPrefetchLink
        eager={eager}
        href={hrefWithSeason(`/atlas/${slug}`, season)}
        className="atlas-card-detail flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:block"
      >
        <div className="w-24 shrink-0 pl-3 sm:w-auto sm:px-4 sm:pt-1">
          <div className="relative aspect-square w-full overflow-hidden">
            {imageUrl ? (
              <SpeciesArtTransition slug={slug}>
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 639px) 96px, (max-width: 1023px) 45vw, 256px"
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
        <CardHeader className="min-w-0 flex-1 gap-1 px-0 py-2 sm:px-4 sm:pt-3 sm:pb-0">
          <CardTitle className="atlas-card-title line-clamp-2 underline-offset-4 decoration-hairline">
            {comName}
          </CardTitle>
          <CardDescription className="truncate text-xs italic">
            {sciName}
          </CardDescription>
        </CardHeader>
      </HoverPrefetchLink>
      <div className="absolute right-2 flex size-10 items-center justify-center sm:static sm:mt-2 sm:mr-3 sm:ml-auto">
        <AtlasAudioControl
          slug={slug}
          audioUrl={audio?.url}
          available={audio?.status === "available" && Boolean(audio.url)}
          labels={labels}
        />
      </div>
    </Card>
  );
}
