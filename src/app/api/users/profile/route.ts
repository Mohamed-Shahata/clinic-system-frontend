import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function getToken() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

export async function GET() {
  try {
    const token = await getToken();
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const res = await fetch(`${getBackendBaseUrl()}/api/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ message }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = await getToken();
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const res = await fetch(`${getBackendBaseUrl()}/api/users/me/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ message }, { status: 502 });
  }
}
