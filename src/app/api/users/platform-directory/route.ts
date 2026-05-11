import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

async function getToken() {
  const jar = await cookies();
  return jar.get("access_token")?.value ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken();
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(`${getBackendBaseUrl()}/api/users/platform-directory`);
    for (const key of ["role", "clinicId", "q"]) {
      const value = request.nextUrl.searchParams.get(key);
      if (value) url.searchParams.set(key, value);
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ message }, { status: 502 });
  }
}
