import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

export async function POST() {
  try {
    const jar = await cookies();
    const refreshToken = jar.get("refresh_token")?.value;

    if (!refreshToken) {
      // No refresh token stored — session was never created or already cleared manually.
      // Do NOT touch any cookie; let middleware handle the redirect.
      return NextResponse.json(
        { message: "No refresh token" },
        { status: 401 },
      );
    }

    const res = await fetch(`${getBackendBaseUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      const authEnded =
        data.message?.startsWith("subscription_expired:") ||
        data.message?.startsWith("clinic_deactivated:") ||
        data.message?.startsWith("account_deactivated:");
      if (authEnded) {
        const response = NextResponse.json(
          { message: data.message, revoked: true },
          { status: 401 },
        );
        response.cookies.set("access_token", "", { path: "/", maxAge: 0 });
        response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });
        return response;
      }

      // Fix 5 — Multi-tab race condition:
      // If refresh token is invalid (already consumed by another tab), but the
      // access_token cookie is still present, another tab already refreshed
      // successfully and wrote a fresh access_token. Return ok so this tab
      // doesn't retry forever with a dead refresh token.
      if (res.status === 401) {
        const currentAccessToken = jar.get("access_token")?.value;
        if (currentAccessToken) {
          // Another tab won the race — this tab is fine, no action needed.
          return NextResponse.json({ ok: true, raceRecovered: true });
        }
      }

      return NextResponse.json({ message: "Refresh failed" }, { status: 401 });
    }

    const data = await res.json().catch(() => ({}));
    const accessToken =
      typeof data?.accessToken === "string"
        ? data.accessToken
        : typeof data?.access_token === "string"
          ? data.access_token
          : null;
    const nextRefreshToken =
      typeof data?.refreshToken === "string" ? data.refreshToken : null;

    if (!accessToken) {
      // Malformed backend response — don't clear cookies, just signal error
      return NextResponse.json(
        { message: "Invalid refresh response" },
        { status: 502 },
      );
    }
    if (!nextRefreshToken) {
      return NextResponse.json(
        { message: "Invalid refresh response" },
        { status: 502 },
      );
    }

    const expiresIn: number =
      typeof data?.expiresIn === "number" ? data.expiresIn : 365 * 24 * 60 * 60;

    const response = NextResponse.json({ ok: true, expiresIn });
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: expiresIn,
    });
    response.cookies.set("refresh_token", nextRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 365 * 24 * 60 * 60,
    });
    return response;
  } catch (err) {
    // Network / parse error — NEVER clear cookies on transient errors
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ message }, { status: 502 });
  }
}
