import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-url";

export async function GET() {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/billing/subscription-plans`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ message }, { status: 502 });
  }
}
