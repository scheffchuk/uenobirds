import { ExternalLinkIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { SpeciesRecord } from "@/lib/guide/types";
import { longFormForLocale, nameStackForLocale } from "@/lib/locale/species";
import { SeasonLink } from "@/components/season/SeasonLink";
import { SpeciesIllustrations } from "./SpeciesIllustrations";
import { PrevalenceChart } from "./PrevalenceChart";
import type { AppLocale } from "@/i18n/routing";
import { wikipediaUrlForLocale } from "@/lib/audio/links";
import { cn } from "@/lib/utils";

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function AtlasDetailView({
  species,
  locale,
}: {
  species: SpeciesRecord;
  locale: AppLocale;
}) {
  const t = await getTranslations("AtlasDetail");
  const tNav = await getTranslations("Nav");
  const stack = nameStackForLocale(species, locale);
  const description = longFormForLocale(species, "description", locale);
  const spottingTips = longFormForLocale(species, "spottingTips", locale);
  const hasArt = Boolean(species.perchUrl || species.flightUrl);
  const wikipediaUrl = wikipediaUrlForLocale(species.wikipedia, locale);

  return (
    <div
      className={cn(
        "grid flex-1 grid-cols-1 gap-6 lg:items-start lg:gap-x-14 lg:gap-y-8",
        hasArt
          ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
          : "mx-auto w-full max-w-2xl",
      )}
    >
      <header className="flex flex-col gap-1 lg:col-span-full">
        <h1 className="font-heading text-3xl tracking-tight text-ink md:text-4xl">
          {stack.primary}
        </h1>
        {stack.secondary.map((name) => (
          <p key={name} className="text-lg text-ink-2">
            {name}
          </p>
        ))}
        <p className="text-sm text-ink-soft italic">{stack.scientific}</p>
      </header>

      {hasArt ? (
        <div className="lg:sticky lg:top-8 lg:col-start-1 lg:row-start-2">
          <SpeciesIllustrations
            key={species.slug}
            species={{
              slug: species.slug,
              perchUrl: species.perchUrl,
              flightUrl: species.flightUrl,
            }}
            name={stack.primary}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-w-0 flex-col gap-8",
          hasArt && "lg:col-start-2",
        )}
      >
        {hasText(spottingTips) ? (
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-xl text-ink">
              {t("spottingTips")}
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-wrap text-ink-2">
              {spottingTips}
            </p>
          </section>
        ) : null}

        {hasText(description) ? (
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-xl text-ink">{t("about")}</h2>
            <p className="text-base leading-relaxed whitespace-pre-wrap text-ink-2">
              {description}
            </p>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl text-ink">{t("prevalence")}</h2>
          <PrevalenceChart prevalence={species.prevalence} />
        </section>

        {wikipediaUrl || species.ebird?.url ? (
          <div className="flex flex-wrap gap-2">
            {wikipediaUrl ? (
              <a
                href={wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-4 py-2 font-mono text-[10px] tracking-[0.14em] text-ink uppercase shadow-[var(--recess)] transition-colors hover:text-ink-2"
              >
                {t("viewOnWikipedia")}
                <ExternalLinkIcon aria-hidden className="size-3" />
              </a>
            ) : null}
            {species.ebird?.url ? (
              <a
                href={species.ebird.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-4 py-2 font-mono text-[10px] tracking-[0.14em] text-ink uppercase shadow-[var(--recess)] transition-colors hover:text-ink-2"
              >
                {t("viewOnEbird")}
                <ExternalLinkIcon aria-hidden className="size-3" />
              </a>
            ) : null}
          </div>
        ) : null}

        <SeasonLink pathname="/" backLabel={tNav("backToCollage")} />
      </div>
    </div>
  );
}
