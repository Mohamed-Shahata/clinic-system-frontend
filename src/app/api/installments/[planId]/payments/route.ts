import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function getToken() {
  return (await cookies()).get("access_token")?.value ?? null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { planId } = await params;
  const body = await req.json();
  const res = await fetch(`${getBackendBaseUrl()}/api/installments/${planId}/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
