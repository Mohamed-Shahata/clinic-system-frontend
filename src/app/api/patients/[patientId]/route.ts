import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { proxyToBackend } from "@/lib/api-proxy";

async function getToken() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const token = await getToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { patientId } = await params;
  const res = await proxyToBackend(
    `${getBackendBaseUrl()}/api/patients/${patientId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const token = await getToken();
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { patientId } = await params;
    const appointmentId = new URL(request.url).searchParams.get(
      "appointmentId",
    );

    // Parse the incoming FormData from browser
    const incomingForm = await request.formData();
    const file = incomingForm.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 },
      );
    }

    // Read file as ArrayBuffer → Blob so Node.js fetch sends correct multipart boundary
    // Passing the File object directly can lose the MIME type in some Node.js versions
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: file.type || "application/octet-stream",
    });

    // Build a fresh FormData to forward
    const outgoing = new FormData();
    outgoing.append("file", blob, file.name);

    const url = new URL(
      `${getBackendBaseUrl()}/api/patients/${patientId}/attachments`,
    );
    if (appointmentId) url.searchParams.set("appointmentId", appointmentId);

    // Do NOT set Content-Type — fetch sets it automatically with the correct boundary
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ message }, { status: 502 });
  }
}
