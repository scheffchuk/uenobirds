import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

/** Retry delivery independently of the already-committed content mutation. */
export const invalidate = internalAction({
  args: { slugs: v.array(v.string()), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      const siteUrl = process.env.SITE_URL;
      const target =
        process.env.GUIDE_CACHE_REVALIDATE_URL ||
        (siteUrl ? new URL("/api/guide/revalidate", siteUrl).href : undefined);
      const secret = process.env.ILLUSTRATION_PIPELINE_SECRET;
      const convexUrl = process.env.CONVEX_CLOUD_URL;
      if (!target || !secret || !convexUrl) {
        throw new Error(
          "Guide invalidation requires SITE_URL, ILLUSTRATION_PIPELINE_SECRET, and CONVEX_CLOUD_URL",
        );
      }
      if (
        ["localhost", "127.0.0.1", "[::1]"].includes(new URL(target).hostname)
      ) {
        console.info(
          "Guide cache webhook points to loopback; skipping cloud delivery. Set GUIDE_CACHE_REVALIDATE_URL to a reachable Next app or tunnel.",
        );
        return null;
      }
      const response = await fetch(target, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slugs: args.slugs, convexUrl }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
      if (!response.ok)
        throw new Error(`Guide invalidation returned HTTP ${response.status}`);
    } catch (error) {
      console.error("Guide cache invalidation failed; retrying", error);
      await ctx.scheduler.runAfter(
        Math.min(1000 * 2 ** Math.min(args.attempt, 12), 60 * 60 * 1000),
        internal.guideCache.invalidate,
        { ...args, attempt: args.attempt + 1 },
      );
    }
    return null;
  },
});
