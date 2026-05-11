import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function token() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

export async function GET() {
  try {
    const accessToken = await token();
    if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const res = await fetch(`${getBackendBaseUrl()}/api/prescriptions/template`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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
    const accessToken = await token();
    if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const res = await fetch(`${getBackendBaseUrl()}/api/prescriptions/template`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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
