import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { patientId } = await params;
  const res = await fetch(`${getBackendBaseUrl()}/api/prescriptions/patient/${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
