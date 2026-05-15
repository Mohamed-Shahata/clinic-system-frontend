import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function tok() { return (await cookies()).get("access_token")?.value ?? null; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  const token = await tok();
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { serviceId } = await params;
  const body = await req.json();
  const res = await fetch(`${getBackendBaseUrl()}/api/services/${serviceId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  const token = await tok();
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { serviceId } = await params;
  const res = await fetch(`${getBackendBaseUrl()}/api/services/${serviceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
