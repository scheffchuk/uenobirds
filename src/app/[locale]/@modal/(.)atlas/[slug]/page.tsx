import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { loadListedSpecies } from "@/lib/guide/load-listed-species";
import { AtlasDetailView } from "@/app/[locale]/atlas/[slug]/AtlasDetailView";
import { PostcardModal } from "@/components/atlas/PostcardModal";
import { AnimatedSuspense } from "@/components/ui/animated-suspense";
import type { AppLocale } from "@/i18n/routing";

async function ModalSpeciesBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [localeRaw, species] = await Promise.all([
    getLocale(),
    loadListedSpecies(slug),
  ]);
  if (!species) notFound();

  return (
    <AtlasDetailView
      species={species}
      locale={localeRaw as AppLocale}
      inModal
    />
  );
}

function ModalSkeleton() {
  return (
    <div
      className="postcard-sheet postcard-sheet-modal grid grid-cols-1 gap-1.5 p-1.5 sm:gap-2 sm:p-2 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]"
      aria-hidden
    >
      <div className="postcard-visual-panel min-h-56 sm:min-h-64 md:min-h-[420px]" />
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="postcard-panel postcard-identity-panel h-24" />
        <div className="postcard-panel postcard-tail-panel min-h-64 flex-1" />
      </div>
    </div>
  );
}

export default function InterceptedSpeciesModalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <PostcardModal>
        <AnimatedSuspense fallback={<ModalSkeleton />}>
          <ModalSpeciesBody params={params} />
        </AnimatedSuspense>
      </PostcardModal>
    </Suspense>
  );
}
