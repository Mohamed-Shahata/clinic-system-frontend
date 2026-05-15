import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clinicUserId: string }> },
) {
  const token = (await cookies()).get("access_token")?.value;
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { clinicUserId } = await params;
  const body = await req.json();
  const res = await fetch(
    `${getBackendBaseUrl()}/api/salaries/staff/${clinicUserId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  return NextResponse.json(await res.json().catch(() => ({})), {
    status: res.status,
  });
}
