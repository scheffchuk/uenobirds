import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
import { revalidateTag } from "next/cache";

const convexUrl = "https://test.convex.cloud";
function request(body: unknown, token = "secret") {
  return new Request("https://birds.example/api/guide/revalidate", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("ILLUSTRATION_PIPELINE_SECRET", "secret");
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", convexUrl);
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());

describe("guide invalidation webhook", () => {
  it("expires list, collage, and affected detail caches after authentication", async () => {
    const response = await POST(
      request({
        convexUrl,
        slugs: ["anas-platyrhynchos", "anas-platyrhynchos"],
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revalidated: true });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenCalledWith("guide-species", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("species:anas-platyrhynchos", {
      expire: 0,
    });
  });

  it("rejects unauthorized callers before parsing content", async () => {
    expect((await POST(request({}, "wrong"))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { convexUrl, slugs: [] },
    { convexUrl, slugs: [42] },
    { convexUrl, slugs: ["x".repeat(241)] },
  ])("rejects malformed payloads: %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("acknowledges another deployment without invalidating this app", async () => {
    const response = await POST(
      request({
        convexUrl: "https://other.convex.cloud",
        slugs: ["anas-platyrhynchos"],
      }),
    );
    expect(await response.json()).toEqual({
      revalidated: false,
      reason: "Different backend",
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("fails closed when the service secret is missing", async () => {
    vi.stubEnv("ILLUSTRATION_PIPELINE_SECRET", "");
    expect(
      (await POST(request({ convexUrl, slugs: ["anas-platyrhynchos"] })))
        .status,
    ).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
