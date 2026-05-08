import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import {
  canAccessDashboardPath,
  getDashboardHref,
} from "@/lib/auth/dashboard-path";
import { verifyAccessToken } from "@/lib/auth/verify-token";
import { routing } from "./lib/i18n/routing";

const handleI18n = createMiddleware(routing);

function matchLocalePrefix(pathname: string): {
  locale: string;
  pathWithoutLocale: string;
} {
  for (const loc of routing.locales) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      const rest =
        pathname.length === `/${loc}`.length
          ? "/"
          : pathname.slice(`/${loc}`.length) || "/";
      return {
        locale: loc,
        pathWithoutLocale: rest.startsWith("/") ? rest : `/${rest}`,
      };
    }
  }
  return { locale: routing.defaultLocale, pathWithoutLocale: pathname || "/" };
}

function expireAccessTokenCookie(response: NextResponse): NextResponse {
  response.cookies.set("access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

// ✅ صفحات عامة - مش محتاج auth
const PUBLIC_PATHS = ["/login", "/forgot-password"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  let claims: Awaited<ReturnType<typeof verifyAccessToken>> | null = null;
  let invalidSessionCookie = false;
  if (token) {
    try {
      claims = await verifyAccessToken(token);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "JWT_SECRET is not configured"
      ) {
        return new NextResponse(
          "Server misconfiguration: JWT_SECRET is not set in the Next.js environment.\n" +
            "Copy .env.local.example to .env.local, fill in the same JWT_SECRET value as the backend, and restart the dev server.",
          { status: 500, headers: { "content-type": "text/plain" } },
        );
      }
      claims = null;
      invalidSessionCookie = true;
    }
  }

  const { locale, pathWithoutLocale } = matchLocalePrefix(pathname);

  const isPublicAuthPage = PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/"),
  );
  const isLogin = pathWithoutLocale === "/login";
  const isDashboard =
    pathWithoutLocale === "/dashboard" ||
    pathWithoutLocale.startsWith("/dashboard/");
  const isHome = pathWithoutLocale === "/" || pathWithoutLocale === "";

  const maybeClearCookie = (response: NextResponse): NextResponse =>
    invalidSessionCookie && token
      ? expireAccessTokenCookie(response)
      : response;

  // Redirect home → login or dashboard
  if (isHome) {
    const redirectUrl = request.nextUrl.clone();
    if (!claims?.sub) {
      redirectUrl.pathname = `/${locale}/login`;
    } else {
      redirectUrl.pathname = getDashboardHref(locale, claims);
    }
    return maybeClearCookie(NextResponse.redirect(redirectUrl));
  }

  // ✅ لو مسجل دخول وحاول يفتح login أو forgot-password → روح للداشبورد
  if (isPublicAuthPage && claims?.sub) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDashboardHref(locale, claims);
    return maybeClearCookie(NextResponse.redirect(redirectUrl));
  }

  // ✅ الـ forgot-password مش محتاج auth - متوقفش عليه
  if (isPublicAuthPage && !claims?.sub) {
    const i18nResponse = handleI18n(request);
    const response =
      i18nResponse instanceof NextResponse ? i18nResponse : NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return maybeClearCookie(response);
  }

  // Dashboard بدون auth → login
  if (isDashboard && !claims?.sub) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/login`;
    return maybeClearCookie(NextResponse.redirect(redirectUrl));
  }

  // Dashboard مع auth لكن مش متاح للرول ده → redirect للصفحة الصح
  if (
    isDashboard &&
    claims?.sub &&
    !canAccessDashboardPath(pathWithoutLocale, claims)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDashboardHref(locale, claims);
    return maybeClearCookie(NextResponse.redirect(redirectUrl));
  }

  const i18nResponse = handleI18n(request);
  const response =
    i18nResponse instanceof NextResponse ? i18nResponse : NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return maybeClearCookie(response);
}

export const config = {
  matcher: ["/", "/((?!api|_next|.*\\..*).*)"],
};
