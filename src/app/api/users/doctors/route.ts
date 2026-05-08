import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function getToken() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${getBackendBaseUrl()}/api/users/doctors`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

// POST removed - doctor creation is no longer supported
export async function POST() {
  return NextResponse.json({ error: "Doctor creation is disabled. Only DOCTOR_ADMIN accounts are created by the Super Admin." }, { status: 405 });
}
