import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function token() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

function backendKind(kind: string) {
  if (kind === "imaging") return "imaging";
  if (kind === "tests") return "tests";
  return "medications";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  try {
    const accessToken = await token();
    if (!accessToken)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { kind } = await params;
    const url = new URL(
      `${getBackendBaseUrl()}/api/prescriptions/catalog/${backendKind(kind)}`,
    );
    const q = request.nextUrl.searchParams.get("q");
    if (q) url.searchParams.set("q", q);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ message }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  try {
    const accessToken = await token();
    if (!accessToken)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { kind } = await params;
    const body = await request.json();
    const res = await fetch(
      `${getBackendBaseUrl()}/api/prescriptions/catalog/${backendKind(kind)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
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
