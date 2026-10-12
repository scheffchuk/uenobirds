import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// Public data expires after a year; allow another day for client-held pages.
export const PUBLIC_STORAGE_RETENTION_MS = 366 * 24 * 60 * 60 * 1000;

/** Keep replaced public media available to cached pages and image variants. */
export async function retireReplacedStorage(
  ctx: MutationCtx,
  previous: Id<"_storage"> | undefined,
  next: Id<"_storage"> | undefined,
): Promise<void> {
  if (previous === undefined || previous === next) return;
  const retired = await ctx.db
    .query("retiredStorage")
    .withIndex("by_storageId", (q) => q.eq("storageId", previous))
    .unique();
  const retiredAt = Date.now();
  if (retired) {
    await ctx.db.patch(retired._id, { retiredAt });
  } else {
    await ctx.db.insert("retiredStorage", { storageId: previous, retiredAt });
  }
}
