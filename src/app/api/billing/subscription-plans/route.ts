import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-url";

export async function GET() {
  const res = await fetch(`${getBackendBaseUrl()}/api/billing/subscription-plans`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
