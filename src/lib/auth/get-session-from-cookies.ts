import { cookies } from "next/headers";
import { verifyAccessToken, type SessionClaims } from "./verify-token";

function coerceRole(value: unknown): SessionClaims["role"] | undefined {
  if (value === "DOCTOR_ADMIN" || value === "DOCTOR" || value === "RECEPTIONIST") {
    return value;
  }
  return undefined;
}

export async function getSessionFromCookies(): Promise<SessionClaims | null> {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) return null;

  try {
    const payload = await verifyAccessToken(token);

    const email = typeof payload.email === "string" ? payload.email : undefined;
    const sub = typeof payload.sub === "string" ? payload.sub : undefined;
    if (!sub) return null;

    return {
      sub,
      userId: sub,
      email,
      clinicId:
        typeof payload.clinicId === "string" ? payload.clinicId : undefined,
      clinicSlug:
        typeof payload.clinicSlug === "string" ? payload.clinicSlug : undefined,
      clinicName:
        typeof payload.clinicName === "string" ? payload.clinicName : undefined,
      isSuperAdmin: payload.isSuperAdmin === true,
      role: coerceRole(payload.role),
    };
  } catch {
    return null;
  }
}
