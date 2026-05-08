import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/verify-token";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) {
    return NextResponse.json(null, { status: 401 });
  }

  try {
    const claims = await verifyAccessToken(token);
    return NextResponse.json({
      email: typeof claims.email === "string" ? claims.email : null,
      isSuperAdmin: claims.isSuperAdmin === true,
      role: typeof claims.role === "string" ? claims.role : null,
      clinicId: typeof claims.clinicId === "string" ? claims.clinicId : null,
      clinicSlug: typeof claims.clinicSlug === "string" ? claims.clinicSlug : null,
      clinicName: typeof claims.clinicName === "string" ? claims.clinicName : null,
      sub: typeof claims.sub === "string" ? claims.sub : null,
    });
  } catch {
    return NextResponse.json(null, { status: 401 });
  }
}
