import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { seasonCanonicalLocation } from "./lib/season/canonicalize";
import { requiresConvexAuthMiddleware } from "./lib/proxy/path-scope";

const handleI18nRouting = createMiddleware(routing);

const handleAuthRoutes = convexAuthNextjsMiddleware();

function copyCookies(from: Response, to: NextResponse) {
  const cookies =
    typeof from.headers.getSetCookie === "function"
      ? from.headers.getSetCookie()
      : [];
  for (const cookie of cookies) {
    to.headers.append("set-cookie", cookie);
  }
}

function applySeasonCanonical(
  request: NextRequest,
  i18nResponse: Response,
): Response {
  const location = i18nResponse.headers.get("location");
  const target = location
    ? new URL(location, request.url)
    : new URL(request.url);
  const canonical = seasonCanonicalLocation(target);
  if (!canonical) return i18nResponse;

  if (location) {
    const next = NextResponse.redirect(canonical, {
      status: i18nResponse.status === 308 ? 307 : (i18nResponse.status || 307),
    });
    copyCookies(i18nResponse, next);
    return next;
  }

  const redirect = NextResponse.redirect(canonical, 307);
  copyCookies(i18nResponse, redirect);
  return redirect;
}

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (requiresConvexAuthMiddleware(request.nextUrl.pathname)) {
    return handleAuthRoutes(request, event);
  }
  const i18nResponse = await handleI18nRouting(request);
  return applySeasonCanonical(request, i18nResponse);
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
