import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function getToken() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

export async function GET(request: NextRequest) {
  const token = await getToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(`${getBackendBaseUrl()}/api/patients`);
  const q = request.nextUrl.searchParams.get("q");
  const doctorId = request.nextUrl.searchParams.get("doctorId");
  if (q) url.searchParams.set("q", q);
  if (doctorId) url.searchParams.set("doctorId", doctorId);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
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
}
