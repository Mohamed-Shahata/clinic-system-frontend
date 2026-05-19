import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function getToken() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken();
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(`${getBackendBaseUrl()}/api/patients`);
    const q = request.nextUrl.searchParams.get("q");
    const doctorId = request.nextUrl.searchParams.get("doctorId");
    const cursor = request.nextUrl.searchParams.get("cursor");
    const limit = request.nextUrl.searchParams.get("limit");
    if (q) url.searchParams.set("q", q);
    if (doctorId) url.searchParams.set("doctorId", doctorId);
    if (cursor) url.searchParams.set("cursor", cursor);
    if (limit) url.searchParams.set("limit", limit);

    const res = await fetch(url, {
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

export async function POST(request: NextRequest) {
  try {
    const token = await getToken();
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const res = await fetch(`${getBackendBaseUrl()}/api/patients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
