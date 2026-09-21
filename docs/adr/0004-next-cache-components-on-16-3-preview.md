# Next Cache Components on 16.4; URL-driven Season

Adopt Next.js **16.4 canary** with `cacheComponents`, `partialPrefetching`, `reactCompiler`, and `typedRoutes` (`experimental.useOffline` on; no `inlineCss`). Workflow wrapper preserved. Public atlas detail uses `'use cache'` (`cacheLife('hours')`, tags `guide-species` / `species:{slug}`); the atlas list and collage cache the Convex fetch the same way (`guide-species`). Packing still covers every Season in one hourly entry; the page **sends that Season’s layout only**.

**Season is URL-driven RSC.** Collage home and the Atlas list always carry explicit `?season=`. `src/proxy.ts` folds next-intl locale negotiation and Season canonicalize into one 307: missing or invalid `?season=` on `/` and `/atlas` (per Locale) becomes the current Season in `Asia/Tokyo`. All-year only when the URL says `all`. Species detail, about, audio, and admin are not canonicalized. Season pills are FastLink `replace` navigations with eager prefetch of all five hrefs — not a client layout swap.

`/admin` opts out with `export const instant = false`.

Public chrome: `LocaleChromeBar` (Locale switcher) and footer live in the Locale layout; home overlay title stays on the home page. Named view transitions: `site-header`, `offline-toast`, and `art-${slug}` (collage tile / atlas card / detail perch). `default="none"` elsewhere; `::view-transition-old(root)` is hidden; `prefers-reduced-motion` zeroes VT animations.

The Locale layout’s `NextIntlClientProvider` receives client namespaces (`Collage`, `Season`, `Atlas`, `AtlasDetail`, `LocaleSwitcher`, `Offline`, `Error`) — not the full catalog. Avoid `getTranslations` / next-intl Link trees inside `'use cache'` — they still touch `headers()`. Fallbacks are layout-stable skeletons via `AnimatedSuspense`, not "Loading…" text. Auth providers live under `/admin` only; public routes do not mount a Convex React client. Illustration API routes drop `export const runtime = "nodejs"` (incompatible with Cache Components; Node remains the default). Generate / reject-and-regenerate bust `guide-species` and `species:{slug}` via injectable `revalidateTags` → `revalidateTag(tag, "max")` on success only.

Invalidation is TTL-first: tag busts only from those illustration Next API routes. Curated edits, Listed toggles, and approve stay Convex-direct from admin — no write-path proxy and no Convex→Next revalidate webhook for v1. Collage therefore shares atlas staleness: visitors refresh or wait for hourly TTL / generate-path busts rather than a live Convex subscription.

First-viewport collage tiles use `loading="eager"` / `fetchPriority="high"` on the LCP candidate. Homepage image `<link rel="preload">` in a `connection()` hole is still not current practice.

Previously (16.3): Season filtering stayed client-side on a cached full pack so collage/atlas pages had no `searchParams` hole. That is superseded: canonicalize makes the query the cache *key*, Convex reads stay 1/hour, and Instant Navigations (mousedown FastLink, prefetch, view transitions) cover Season switches.

Considered and rejected: staying on 16.3 stable, keeping collage on `preloadQuery` + `usePreloadedQuery` for mid-session admin updates (v1 is a curated static guide; live BirdNET is v2), proxying all public-affecting admin writes through Next solely for `revalidateTag`, a Convex webhook for cache busts, `experimental.inlineCss`, live public Convex `useQuery`, and keying Convex queries per Season (would multiply reads without a schema change).
