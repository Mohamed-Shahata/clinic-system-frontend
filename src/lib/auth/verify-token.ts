import { JWTPayload, jwtVerify } from "jose";

export type SessionClaims = JWTPayload & {
  // FRONT-02: JWT_PAYLOAD uses `sub` (standard JWT claim) not `userId`.
  // The original type had `userId` which was always undefined; fixed to `sub`.
  sub: string;           // ← this is the userId (set by NestJS JwtService)
  userId?: string;
  email?: string;
  isSuperAdmin?: boolean;
  clinicId?: string;
  clinicSlug?: string;
  clinicName?: string;
  role?: "DOCTOR_ADMIN" | "DOCTOR" | "RECEPTIONIST";
};

export async function verifyAccessToken(token: string): Promise<SessionClaims> {
  const secretRaw = process.env.JWT_SECRET;
  if (!secretRaw) {
    throw new Error("JWT_SECRET is not configured");
  }
  const secret = new TextEncoder().encode(secretRaw);
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  const raw = payload as Record<string, unknown>;
  const isSuperAdmin =
    raw.isSuperAdmin === true ||
    raw.isSuperAdmin === "true" ||
    raw.isSuperAdmin === 1;

  return {
    ...(payload as SessionClaims),
    userId: typeof raw.sub === "string" ? raw.sub : "",
    isSuperAdmin,
  };
}
