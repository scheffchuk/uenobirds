import { notFound } from "next/navigation";
import { AtlasListView } from "../atlas/AtlasListView";
import { BROWSER_FIXTURE_SPECIES } from "@/lib/fixtures/browser-species";
import {
  requireSeasonParam,
  type SeasonSearch,
} from "@/lib/season/require-param";
import { AnimatedSuspense } from "@/components/ui/animated-suspense";

async function FixtureList({
  searchParams,
}: {
  searchParams: Promise<SeasonSearch>;
}) {
  const params = await searchParams;
  const season = await requireSeasonParam(params, "/test-fixture");
  return (
    <AtlasListView
      species={BROWSER_FIXTURE_SPECIES}
      season={season}
      pickerPath="/test-fixture"
    />
  );
}

/** Dev-only fixture for the Playwright Atlas interaction tests. */
export default function AtlasBrowserFixturePage({
  searchParams,
}: {
  searchParams: Promise<SeasonSearch>;
}) {
  if (process.env.BROWSER_TEST_FIXTURES !== "1") notFound();

  return (
    <main className="min-h-0 flex-1 bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <h1 className="font-heading text-2xl text-ink">Atlas browser fixture</h1>
        <AnimatedSuspense
          fallback={<div className="min-h-[50vh]" aria-hidden />}
        >
          <FixtureList searchParams={searchParams} />
        </AnimatedSuspense>
      </div>
    </main>
  );
}
