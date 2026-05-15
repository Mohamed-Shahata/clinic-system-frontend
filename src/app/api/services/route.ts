import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function tok() { return (await cookies()).get("access_token")?.value ?? null; }

export async function GET() {
  const token = await tok();
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const res = await fetch(`${getBackendBaseUrl()}/api/services`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  return NextResponse.json(await res.json().catch(() => []), { status: res.status });
}

export async function POST(req: NextRequest) {
  const token = await tok();
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const res = await fetch(`${getBackendBaseUrl()}/api/services`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
