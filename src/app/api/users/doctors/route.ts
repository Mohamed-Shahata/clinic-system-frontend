import { NextResponse } from "next/server";
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

    const res = await fetch(`${getBackendBaseUrl()}/api/users/doctors`, {
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

// POST removed - doctor creation is no longer supported
export async function POST() {
  try {
    return NextResponse.json({ error: "Doctor creation is disabled. Only DOCTOR_ADMIN accounts are created by the Super Admin." }, { status: 405 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ message }, { status: 502 });
  }
}
