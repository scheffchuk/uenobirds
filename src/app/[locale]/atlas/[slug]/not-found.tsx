import { getTranslations } from "next-intl/server";
import { FastLink } from "@/components/ui/fast-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AtlasSpeciesNotFound() {
  const t = await getTranslations("AtlasDetail");
  const tNav = await getTranslations("Nav");
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="font-heading text-xl text-ink">{t("notFound")}</h1>
      <FastLink
        href="/atlas"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "font-mono text-[10px] tracking-[0.14em] uppercase",
        )}
      >
        {tNav("backToAtlas")}
      </FastLink>
    </div>
  );
}
