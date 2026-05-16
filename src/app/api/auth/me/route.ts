import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

/**
 * GET /api/auth/me
 * Proxies to backend /api/auth/me so the backend JWT strategy runs its
 * revocation checks (isUserRevoked, isClinicRevoked). If the user was
 * deactivated mid-session the backend returns 401 and the TokenRefresher
 * will redirect to /login.
 */
export async function GET() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) {
    return NextResponse.json(null, { status: 401 });
  }

  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(null, { status: res.status });
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null, { status: 502 });
  }
}
