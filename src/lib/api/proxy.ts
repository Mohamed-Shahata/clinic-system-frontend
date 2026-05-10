/**
 * FRONT-01: Shared proxy helper for all Next.js API route handlers.
 *
 * Every route that calls the NestJS backend is now wrapped in this helper,
 * which catches network-level failures (backend down, ECONNREFUSED, timeout)
 * and returns a clean 502 instead of an unhandled crash / blank response.
 *
 * Usage:
 *   export async function GET(request: NextRequest) {
 *     return proxyToBackend(request, { path: '/api/appointments', method: 'GET' });
 *   }
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-url";

interface ProxyOptions {
  /** Backend path, e.g. "/api/appointments" */
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Forward query params from the incoming request */
  forwardQuery?: boolean;
  /** Pass a pre-serialised body (for POST/PATCH/PUT) */
  body?: unknown;
  /** Skip Authorization header — used for public routes like /api/auth/login */
  skipAuth?: boolean;
  /** Override response status code */
  statusOverride?: number;
}

export async function proxyToBackend(
  request: NextRequest,
  options: ProxyOptions,
): Promise<NextResponse> {
  const {
    path,
    method = "GET",
    forwardQuery = false,
    body,
    skipAuth = false,
    statusOverride,
  } = options;

  const backend = getBackendBaseUrl();
  const url = new URL(`${backend}${path}`);

  if (forwardQuery) {
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = {};

  if (!skipAuth) {
    const jar = await cookies();
    const token = jar.get("access_token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Upstream request failed";
    return NextResponse.json(
      {
        message: `Cannot reach API server. (${message})`,
        statusCode: 502,
      },
      { status: 502 },
    );
  }

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, {
    status: statusOverride ?? upstream.status,
  });
}

/** Convenience: parse request body safely */
export async function parseBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
