import { NextResponse, type NextRequest } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-url";

type NestLoginBody = {
  accessToken?: string;
  access_token?: string;
  user?: unknown;
  data?: { accessToken?: string; access_token?: string; user?: unknown };
};

function pickUser(data: NestLoginBody): unknown {
  if (data?.user !== undefined && data.user !== null) return data.user;
  if (data?.data?.user !== undefined && data.data.user !== null) return data.data.user;
  return undefined;
}

function pickAccessToken(data: NestLoginBody): string | null {
  if (typeof data?.accessToken === "string") return data.accessToken;
  if (typeof data?.access_token === "string") return data.access_token;
  if (typeof data?.data?.accessToken === "string") return data.data.accessToken;
  if (typeof data?.data?.access_token === "string") return data.data.access_token;
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const backend = getBackendBaseUrl();

  let upstream: Response;
  try {
    upstream = await fetch(`${backend}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Upstream request failed";
    return NextResponse.json(
      {
        message: `Cannot reach API at ${backend}. Set BACKEND_URL (or NEXT_PUBLIC_BACKEND_URL) and ensure Nest is running. (${message})`,
        statusCode: 502,
      },
      { status: 502 },
    );
  }

  const data = (await upstream.json().catch(() => ({}))) as NestLoginBody;
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const accessToken = pickAccessToken(data);

  if (!accessToken) {
    return NextResponse.json({ message: "Invalid login response from server (missing accessToken)" }, { status: 502 });
  }

  const user = pickUser(data);
  if (user === undefined || user === null || typeof user !== "object") {
    return NextResponse.json({ message: "Invalid login response from server (missing user)" }, { status: 502 });
  }

  const secure = process.env.NODE_ENV === "production";
  const maxAgeSeconds = 60 * 60 * 24;

  const response = NextResponse.json({
    ok: true,
    user,
  });

  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  });

  return response;
}
