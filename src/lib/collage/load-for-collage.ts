import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { GUIDE_SPECIES_TAG } from "@/lib/guide/cache-tags";
import { buildCollageLayouts } from "@/lib/collage/layouts";
import type { CollageLayouts } from "@/lib/collage/types";

/**
 * Cached collage layouts for Listed Guide species with approved art.
 * Long-lived; invalidated by Convex public-content mutations.
 * Packing still covers every Season; the page sends one layout on the wire.
 */
export async function loadForCollage(): Promise<CollageLayouts> {
  "use cache";
  cacheLife("max");
  cacheTag(GUIDE_SPECIES_TAG);
  const species = await fetchQuery(api.species.listForCollage);
  return buildCollageLayouts(species);
}
