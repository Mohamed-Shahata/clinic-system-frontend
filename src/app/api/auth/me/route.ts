import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

/**
 * GET /api/auth/me
 * Returns { revoked: true } when backend says "Session revoked" (user/clinic deactivated).
 * Returns 401 with { revoked: false } when token is simply missing/expired.
 * TokenRefresher only redirects to login when revoked=true.
 */
export async function GET() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  if (!token) {
    // No token at all — normal state before refresh cycle kicks in
    return NextResponse.json({ revoked: false }, { status: 200 });
  }

  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.status === 401) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      const isRevoked =
        body.message === "Session revoked" ||
        body.message?.toLowerCase().includes("revoked") ||
        body.message?.toLowerCase().includes("deactivated");
      return NextResponse.json({ revoked: isRevoked }, { status: 401 });
    }

    if (!res.ok) {
      return NextResponse.json({ revoked: false }, { status: 200 });
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json({ revoked: false, user: data });
  } catch {
    // Network issue — don't logout on network errors
    return NextResponse.json({ revoked: false }, { status: 200 });
  }
}
