import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function getToken() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { patientId } = await params;
  const res = await fetch(`${getBackendBaseUrl()}/api/patients/${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const token = await getToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { patientId } = await params;
  const formData = await request.formData();
  const appointmentId = new URL(request.url).searchParams.get("appointmentId");
  const url = new URL(`${getBackendBaseUrl()}/api/patients/${patientId}/attachments`);
  if (appointmentId) url.searchParams.set("appointmentId", appointmentId);
  const res = await fetch(
    url,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
