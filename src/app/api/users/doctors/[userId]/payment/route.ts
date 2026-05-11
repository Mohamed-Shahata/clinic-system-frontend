import { NextResponse } from "next/server";
export async function GET() {
  try {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ message }, { status: 502 });
  }
}
export async function POST() {
  try {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ message }, { status: 502 });
  }
}
