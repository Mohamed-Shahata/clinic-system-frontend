import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/backend-url';

async function getToken() {
  const jar = await cookies();
  return jar.get('access_token')?.value ?? null;
}

export async function POST(request: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const folder = request.nextUrl.searchParams.get('folder') ?? 'clinic-assets';

  // Forward multipart form data directly to backend
  const formData = await request.formData();

  const res = await fetch(`${getBackendBaseUrl()}/api/upload/image?folder=${folder}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return NextResponse.json({ message: 'Cannot reach API server' }, { status: 502 });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const url = request.nextUrl.searchParams.get('url');
  // FRONT-06: Original condition was `!url || url.startsWith('http')` — this blocked
  // every valid absolute URL and allowed null through. Fixed: reject missing/non-http URLs.
  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ message: 'Invalid file URL' }, { status: 400 });
  }

  const upstream = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);

  if (!upstream) return NextResponse.json({ message: 'Cannot reach API server' }, { status: 502 });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'content-disposition': upstream.headers.get('content-disposition') ?? 'inline',
    },
  });
}
