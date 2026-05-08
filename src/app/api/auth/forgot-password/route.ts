import { NextResponse, type NextRequest } from 'next/server';
import { getBackendBaseUrl } from '@/lib/backend-url';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const backend = getBackendBaseUrl();

  // Determine endpoint: body.code means reset step, otherwise request step
  const endpoint = body.code
    ? `${backend}/api/auth/forgot-password/reset`
    : `${backend}/api/auth/forgot-password/request`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => null);

  if (!res) {
    return NextResponse.json({ message: 'Cannot reach API server' }, { status: 502 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
