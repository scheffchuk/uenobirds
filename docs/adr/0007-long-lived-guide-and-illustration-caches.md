# Long-lived guide caches with mutation-driven invalidation

Public bird illustrations use file-specific Convex Storage URLs. Set Next's
`images.minimumCacheTTL` to 31536000 seconds (one year). Replacing artwork changes
the source URL, which creates new optimized image variants. This setting controls
Next's optimized-image cache; it does not change direct Convex response headers.

Atlas list data, Atlas detail data, and computed collage layouts use
`cacheLife("max")`: five-minute client freshness, 30-day background revalidation,
and one-year expiration in the pinned Next version. The collage still packs all
Season filters in one cache entry. This supersedes ADR-0004's hourly TTL and
TTL-first invalidation decision.

Convex mutations use the builders in `convex/functions.ts`. Database triggers
collect changes to `species` and `prevalence`, then schedule one invalidation job
per successful transaction. This covers admin curation, Listed changes,
Illustration status changes, workflow staging, histogram/copy seeds, and audio
sync. Failed transactions do not schedule invalidation. ESLint prevents importing
raw mutation builders outside `convex/functions.ts`.

The job POSTs species Slugs and its backend URL to `/api/guide/revalidate` on
Convex's existing `SITE_URL`. It authenticates with the existing
`ILLUSTRATION_PIPELINE_SECRET`, which must match the Next deployment. The handler
expires `guide-species` and affected `species:{slug}` tags with
`revalidateTag(tag, { expire: 0 })`. The next server request reads committed data.
Already-open clients retain their normal five-minute router freshness window.
Callbacks for another backend are acknowledged without invalidating this app,
so development writes cannot invalidate production caches.

Delivery failures retry through Convex's scheduler with exponential backoff,
capped at one hour between attempts. `GUIDE_CACHE_REVALIDATE_URL` can override the
default endpoint, for example for a preview deployment or a development tunnel.
Cloud Convex cannot call `localhost`; loopback targets skip delivery. Use a
reachable tunnel when testing invalidation against a local production server.
Deploy the Next webhook before switching the production Convex functions; an
older Next deployment will reject delivery until the webhook is available.

The species trigger also records removed/replaced public illustration and audio
files in `retiredStorage`. Garbage collection retains them for 366 days after
their last removal, allowing cached pages and newly requested image sizes to
resolve the old URLs. GC protects current audio files as well as artwork, and
rechecks references and retention in the deletion transaction. Retention adds
storage cost; expired files become eligible for the existing explicit GC command.
Anatomy and style-reference replacement behavior is unchanged.

Direct dashboard edits and `convex import` bypass database triggers. After either,
invoke `guideCache:invalidate` with the affected Slugs and `attempt: 0` using the
Convex CLI for that deployment. The normal seed and sync commands run mutations
and invalidate automatically.
