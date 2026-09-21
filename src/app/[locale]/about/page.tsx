import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleChromeBar, LocaleChromeBarFallback } from "@/components/site/LocaleChromeBar";
import { SeasonLink } from "@/components/season/SeasonLink";
import { AnimatedSuspense } from "@/components/ui/animated-suspense";
import { loadMessages } from "@/i18n/load-messages";
import type { AppLocale } from "@/i18n/routing";

const SECTION_IDS = ["about", "data", "art"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("Meta");
  const t = await getTranslations("About");
  return {
    title: `${t("title")} · ${tMeta("title")}`,
    description: tMeta("description"),
  };
}

async function aboutChromeCopy(locale: AppLocale) {
  "use cache";
  cacheLife("max");
  const messages = await loadMessages(locale);
  return {
    backToCollage: messages.Nav.backToCollage,
  };
}

async function AboutChrome() {
  const locale = (await getLocale()) as AppLocale;
  const copy = await aboutChromeCopy(locale);

  return (
    <LocaleChromeBar
      leading={
        <SeasonLink pathname="/" backLabel={copy.backToCollage} prefetch={true} />
      }
      trailing={null}
    />
  );
}

async function AboutBody() {
  const t = await getTranslations("About");

  return (
    <>
      {SECTION_IDS.map((id) => (
        <section key={id} id={id} className="flex scroll-mt-6 flex-col gap-4">
          <h2 className="font-heading text-xl tracking-wide text-ink">
            {t(`sections.${id}.title`)}
          </h2>
          <p className="text-base leading-relaxed text-ink-2">
            {t(`sections.${id}.body`)}
          </p>
        </section>
      ))}
    </>
  );
}

export default function AboutPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-6 py-12 md:px-8">
      <AnimatedSuspense fallback={<LocaleChromeBarFallback showTrailing={false} />}>
        <AboutChrome />
      </AnimatedSuspense>
      <AnimatedSuspense fallback={<div className="min-h-[40vh]" aria-hidden />}>
        <AboutBody />
      </AnimatedSuspense>
    </article>
  );
}
