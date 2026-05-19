import { NextResponse, type NextRequest } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-url";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(
      `${getBackendBaseUrl()}/api/billing/public/subscription-requests`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ message }, { status: 502 });
  }
}
