import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function getToken() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const token = await getToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { invoiceId } = await params;
  const body = await request.json().catch(() => ({}));
  const res = await fetch(
    `${getBackendBaseUrl()}/api/billing/invoices/${invoiceId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const token = await getToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { invoiceId } = await params;
  const res = await fetch(
    `${getBackendBaseUrl()}/api/billing/invoices/${invoiceId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
