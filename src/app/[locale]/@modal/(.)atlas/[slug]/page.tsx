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
      className="postcard-sheet grid grid-cols-1 gap-2 p-2 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]"
      aria-hidden
    >
      <div className="postcard-visual-panel min-h-72 lg:min-h-112" />
      <div className="flex flex-col gap-2">
        <div className="postcard-panel h-28" />
        <div className="postcard-panel h-36" />
        <div className="postcard-panel h-44" />
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
    <PostcardModal>
      <AnimatedSuspense fallback={<ModalSkeleton />}>
        <ModalSpeciesBody params={params} />
      </AnimatedSuspense>
    </PostcardModal>
  );
}
