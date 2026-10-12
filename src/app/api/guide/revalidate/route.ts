import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { GUIDE_SPECIES_TAG, speciesCacheTag } from "@/lib/guide/cache-tags";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.ILLUSTRATION_PIPELINE_SECRET;
  if (!secret)
    return Response.json(
      { error: "Invalidation is not configured" },
      { status: 503 },
    );
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("slugs" in body) ||
    !Array.isArray(body.slugs) ||
    body.slugs.length === 0 ||
    body.slugs.length > 1000 ||
    !body.slugs.every(
      (slug: unknown) =>
        typeof slug === "string" && slug.length > 0 && slug.length <= 240,
    ) ||
    !("convexUrl" in body) ||
    typeof body.convexUrl !== "string"
  ) {
    return Response.json(
      { error: "Expected species slugs and backend URL" },
      { status: 400 },
    );
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return Response.json(
      { error: "Backend is not configured" },
      { status: 503 },
    );
  }
  if (body.convexUrl !== process.env.NEXT_PUBLIC_CONVEX_URL) {
    return Response.json({ revalidated: false, reason: "Different backend" });
  }
  // Webhooks cannot use updateTag. Expire immediately so the next server
  // request reads committed content instead of serving the previous snapshot.
  revalidateTag(GUIDE_SPECIES_TAG, { expire: 0 });
  for (const slug of new Set<string>(body.slugs)) {
    revalidateTag(speciesCacheTag(slug), { expire: 0 });
  }
  return Response.json({ revalidated: true });
}
