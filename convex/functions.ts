import {
  customMutation,
  type Customization,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "./_generated/dataModel";
import { retireReplacedStorage } from "./lib/retireReplacedStorage";
import { internal } from "./_generated/api";
import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
  type MutationCtx,
} from "./_generated/server";

/** Batch all public-content changes into one transactional invalidation job. */
const invalidateGuide: Customization<
  MutationCtx,
  Record<never, never>,
  Pick<MutationCtx, "db">,
  Record<never, never>
> = {
  args: {},
  input(ctx) {
    const slugs = new Set<string>();
    const triggers = new Triggers<DataModel>();
    triggers.register("species", async (triggerCtx, change) => {
      if (change.oldDoc) slugs.add(change.oldDoc.slug);
      if (change.newDoc) slugs.add(change.newDoc.slug);
      await retireReplacedStorage(
        triggerCtx,
        change.oldDoc?.illustrationPerch,
        change.newDoc?.illustrationPerch,
      );
      await retireReplacedStorage(
        triggerCtx,
        change.oldDoc?.illustrationFlight,
        change.newDoc?.illustrationFlight,
      );
      await retireReplacedStorage(
        triggerCtx,
        change.oldDoc?.audio?.storageId,
        change.newDoc?.audio?.storageId,
      );
    });
    triggers.register("prevalence", async (triggerCtx, change) => {
      const row = change.newDoc ?? change.oldDoc;
      const species = await triggerCtx.db.get(row.speciesId);
      if (species) slugs.add(species.slug);
    });
    return {
      ctx: { db: triggers.wrapDB(ctx).db },
      args: {},
      onSuccess: async () => {
        if (slugs.size > 0) {
          await ctx.scheduler.runAfter(0, internal.guideCache.invalidate, {
            slugs: [...slugs],
            attempt: 0,
          });
        }
      },
    };
  },
};

export const mutation = customMutation(rawMutation, invalidateGuide);
export const internalMutation = customMutation(
  rawInternalMutation,
  invalidateGuide,
);
