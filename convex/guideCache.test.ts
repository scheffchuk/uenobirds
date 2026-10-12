// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { PUBLIC_STORAGE_RETENTION_MS } from "./lib/retireReplacedStorage";
import { mutation } from "./functions";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const bird = {
  slug: "anas-platyrhynchos",
  sciName: "Anas platyrhynchos",
  comNameEn: "Mallard",
  comNameJa: "マガモ",
  comNameZhTw: "綠頭鴨",
  prevalence: { winter: 80, spring: 60, summer: 40, autumn: 70 },
};
const newBackend = () => convexTest(schema, modules);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("SITE_URL", "https://birds.example");
  vi.stubEnv("GUIDE_CACHE_REVALIDATE_URL", "");
  vi.stubEnv("ILLUSTRATION_PIPELINE_SECRET", "secret");
  vi.stubEnv("AUDIO_SYNC_SECRET", "audio-secret");
  vi.stubEnv("CONVEX_CLOUD_URL", "https://test.convex.cloud");
  vi.stubEnv("ADMIN_GITHUB_IDS", "1234");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function flush(t: ReturnType<typeof newBackend>) {
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
}
async function seed(t: ReturnType<typeof newBackend>) {
  await t.mutation(internal.species.seedGuideSpecies, { species: [bird] });
  await flush(t);
  vi.mocked(fetch).mockClear();
  const speciesId = await t.run(
    async (ctx) => (await ctx.db.query("species").first())!._id,
  );
  const userId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {});
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "github",
      providerAccountId: "1234",
    });
    return userId;
  });
  return { speciesId, admin: t.withIdentity({ subject: userId }) };
}

describe("public guide cache invalidation", () => {
  it("batches species and four prevalence writes into one authenticated webhook", async () => {
    const t = newBackend();
    await t.mutation(internal.species.seedGuideSpecies, { species: [bird] });
    await flush(t);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://birds.example/api/guide/revalidate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret" }),
        body: JSON.stringify({
          slugs: [bird.slug],
          convexUrl: "https://test.convex.cloud",
        }),
      }),
    );
  });

  it("invalidates approval, names, copy, listing, and prevalence edits", async () => {
    const t = newBackend();
    const { speciesId, admin } = await seed(t);
    await t.run(async (ctx) => {
      const illustrationPerch = await ctx.storage.store(new Blob(["perch"]));
      const illustrationFlight = await ctx.storage.store(new Blob(["flight"]));
      await ctx.db.patch(speciesId, { illustrationPerch, illustrationFlight });
    });
    await admin.mutation(api.admin.approveIllustrations, { speciesId });
    await admin.mutation(api.admin.updateNames, {
      speciesId,
      comNameEn: "Edited mallard",
    });
    await admin.mutation(api.admin.updateCopy, {
      speciesId,
      descriptionEn: "Edited description",
    });
    await admin.mutation(api.admin.setListed, { speciesId, listed: false });
    await admin.mutation(api.admin.updatePrevalence, { speciesId, winter: 99 });
    await flush(t);
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("invalidates generated copy and audio sync", async () => {
    const t = newBackend();
    await seed(t);
    await t.mutation(internal.species.seedSpeciesCopy, {
      copies: [
        {
          slug: bird.slug,
          descriptionEn: "A duck",
          descriptionJa: "カモ",
          descriptionZhTw: "鴨",
          spottingTipsEn: "Look at the pond",
          spottingTipsJa: "池",
          spottingTipsZhTw: "池塘",
        },
      ],
    });
    await t.mutation(api.audio.syncSpeciesMedia, {
      secret: "audio-secret",
      slug: bird.slug,
      audio: { status: "unavailable", reason: "No recording" },
    });
    await flush(t);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("schedules another delivery after an HTTP failure", async () => {
    const t = newBackend();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
    await t.action(internal.guideCache.invalidate, {
      slugs: [bird.slug],
      attempt: 0,
    });
    const jobs = await t.run(async (ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].args).toEqual([{ slugs: [bird.slug], attempt: 1 }]);
    await flush(t);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not invalidate an unauthorized mutation", async () => {
    const t = newBackend();
    const { speciesId } = await seed(t);
    await expect(
      t.mutation(api.admin.setListed, { speciesId, listed: false }),
    ).rejects.toThrow("Not authenticated");
    await flush(t);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rolls back the writes and invalidation job together", async () => {
    const failAfterWriting = mutation({
      args: {},
      returns: v.null(),
      handler: async (ctx) => {
        await ctx.db.insert("species", {
          slug: bird.slug,
          sciName: bird.sciName,
          comNameEn: bird.comNameEn,
          comNameJa: bird.comNameJa,
          comNameZhTw: bird.comNameZhTw,
          listed: true,
          curatedFields: [],
          illustrationStatus: "queued",
        });
        throw new Error("Abort after write");
      },
    });
    const t = convexTest(schema, {
      ...modules,
      "./rollbackFixture.ts": async () => ({ failAfterWriting }),
    });
    await expect(
      t.mutation(
        makeFunctionReference<"mutation">("rollbackFixture:failAfterWriting"),
      ),
    ).rejects.toThrow("Abort after write");
    expect(
      await t.run(async (ctx) => ctx.db.query("species").collect()),
    ).toEqual([]);
    await flush(t);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("cached media retention", () => {
  it("protects replaced and cleared illustrations through the cache lifetime, then allows GC", async () => {
    const t = newBackend();
    const { speciesId, admin } = await seed(t);
    const oldId = await t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob(["old"]));
      await ctx.db.patch(speciesId, { illustrationPerch: id });
      return id;
    });
    const nextId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["next"])),
    );
    await t.mutation(api.illustrationPipeline.stageIllustrationPose, {
      secret: "secret",
      slug: bird.slug,
      pose: "perch",
      storageId: nextId,
      mask: { w: 1, h: 1, bits: "/w==" },
      dims: [1, 1],
    });
    expect(
      await t.run(async (ctx) => (await ctx.storage.get(oldId)) !== null),
    ).toBe(true);
    expect(
      (await t.query(internal.storageGc.listOrphanStorage, { now: Date.now() }))
        .orphanIds,
    ).not.toContain(oldId);
    expect(
      await t.mutation(internal.storageGc.deleteOrphanStorageBatch, {
        ids: [oldId],
      }),
    ).toBe(0);

    await admin.mutation(api.illustrationPipeline.rejectAndRegenerate, {
      speciesId,
      pose: "perch",
    });
    expect(
      await t.run(async (ctx) => ctx.db.query("retiredStorage").collect()),
    ).toHaveLength(2);
    await flush(t);
    vi.setSystemTime(Date.now() + PUBLIC_STORAGE_RETENTION_MS + 1);
    expect(
      (await t.query(internal.storageGc.listOrphanStorage, { now: Date.now() }))
        .orphanIds,
    ).toContain(oldId);
    expect(
      await t.mutation(internal.storageGc.deleteOrphanStorageBatch, {
        ids: [oldId],
      }),
    ).toBe(1);
    expect(
      await t.run(async (ctx) => (await ctx.storage.get(oldId)) === null),
    ).toBe(true);
  });

  it("rechecks references before deleting a reattached file", async () => {
    const t = newBackend();
    const { speciesId } = await seed(t);
    const id = await t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob(["reattached"]));
      await ctx.db.patch(speciesId, { illustrationFlight: id });
      return id;
    });
    expect(
      await t.mutation(internal.storageGc.deleteOrphanStorageBatch, {
        ids: [id],
      }),
    ).toBe(0);
    expect(
      await t.run(async (ctx) => (await ctx.storage.get(id)) !== null),
    ).toBe(true);
  });

  it("protects current audio and retains it when a sync removes the recording", async () => {
    const t = newBackend();
    const { speciesId } = await seed(t);
    const id = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["audio"]));
      await ctx.db.patch(speciesId, {
        audio: { status: "available", storageId },
      });
      return storageId;
    });
    expect(
      (await t.query(internal.storageGc.listOrphanStorage, { now: Date.now() }))
        .orphanIds,
    ).not.toContain(id);
    await t.mutation(api.audio.syncSpeciesMedia, {
      secret: "audio-secret",
      slug: bird.slug,
      audio: { status: "unavailable", reason: "Removed" },
    });
    await flush(t);
    expect(
      await t.run(async (ctx) => (await ctx.storage.get(id)) !== null),
    ).toBe(true);
    expect(
      await t.mutation(internal.storageGc.deleteOrphanStorageBatch, {
        ids: [id],
      }),
    ).toBe(0);
  });
});
