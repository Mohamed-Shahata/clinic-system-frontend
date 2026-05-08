import { JWTPayload, jwtVerify } from "jose";

export type SessionClaims = JWTPayload & {
  userId?: string;
  email?: string;
  isSuperAdmin?: boolean;
  clinicId?: string;
  clinicSlug?: string;
  clinicName?: string;
  role?: "DOCTOR_ADMIN" | "RECEPTIONIST"; // ✅ حذف الـ duplicate
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
    isSuperAdmin,
  };
}
