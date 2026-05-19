import { NextResponse, type NextRequest } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-url";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const res = await fetch(`${getBackendBaseUrl()}/api/upload/payment-proof`, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ message }, { status: 502 });
  }
}
