import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

export async function POST() {
  try {
    const jar = await cookies();
    const refreshToken = jar.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token" }, { status: 401 });
    }

    const res = await fetch(`${getBackendBaseUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!res.ok) {
      const response = NextResponse.json({ message: "Session expired" }, { status: 401 });
      const cookieOpts = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 };
      response.cookies.set("access_token", "", cookieOpts);
      response.cookies.set("refresh_token", "", cookieOpts);
      return response;
    }

    const data = await res.json().catch(() => ({}));
    const accessToken =
      typeof data?.accessToken === "string" ? data.accessToken :
      typeof data?.access_token === "string" ? data.access_token : null;

    if (!accessToken) {
      return NextResponse.json({ message: "Invalid refresh response" }, { status: 502 });
    }

    const expiresIn: number = typeof data?.expiresIn === "number" ? data.expiresIn : 15 * 60;

    const response = NextResponse.json({ ok: true });
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: expiresIn,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ message }, { status: 502 });
  }
}
