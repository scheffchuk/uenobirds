import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { GUIDE_SPECIES_TAG, speciesCacheTag } from "./cache-tags";

/**
 * Cached Atlas detail payload for a Listed Guide species Slug.
 * Long-lived; invalidated by Convex public-content mutations.
 */
export async function loadListedSpecies(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(GUIDE_SPECIES_TAG, speciesCacheTag(slug));
  return await fetchQuery(api.species.getSpecies, { slug });
}
