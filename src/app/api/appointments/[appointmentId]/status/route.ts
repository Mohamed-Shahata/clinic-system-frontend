import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { appointmentId } = await params;
  const body = await request.json();
  const res = await fetch(`${getBackendBaseUrl()}/api/appointments/${appointmentId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
