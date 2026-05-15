import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function tok() {
  return (await cookies()).get("access_token")?.value ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salaryId: string }> },
) {
  const token = await tok();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { salaryId } = await params;
  const body = await req.json();
  const res = await fetch(
    `${getBackendBaseUrl()}/api/salaries/${salaryId}/pay`,
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
