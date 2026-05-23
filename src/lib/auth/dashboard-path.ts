import { normalizeAppLocale } from "../i18n/locale-utils";
import { dashboardRoutePrefixes, roles } from "../rbac/roles";
import type { SessionClaims } from "./verify-token";

/**
 * Canonical dashboard path including locale segment, e.g. `/ar/dashboard/doctor-admin`.
 */
export function getDashboardHref(
  locale: string | undefined,
  claims: SessionClaims,
): string {
  const loc = normalizeAppLocale(locale);
  if (claims.isSuperAdmin === true) {
    return `/${loc}/dashboard/super-admin`;
  }
  switch (claims.role) {
    case "DOCTOR_ADMIN":
      return `/${loc}/dashboard/doctor-admin`;
    case "DOCTOR":
      return `/${loc}/dashboard/doctor`;
    case "RECEPTIONIST":
      return `/${loc}/dashboard/receptionist`;
    default:
      return `/${loc}/dashboard`;
  }
}

function normalizeDashboardPath(pathWithoutLocale: string) {
  return pathWithoutLocale.replace(/\/+$/, "") || "/";
}

function canAccessRoleDashboardPath(
  pathWithoutLocale: string,
  role: keyof typeof roles,
): boolean {
  const normalized = normalizeDashboardPath(pathWithoutLocale);
  return (
    normalized === "/dashboard" ||
    dashboardRoutePrefixes[roles[role]].some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
    )
  );
}

/**
 * Path must start with `/` and exclude the locale segment, e.g. `/dashboard/receptionist`.
 */
export function canAccessDashboardPath(
  pathWithoutLocale: string,
  claims: SessionClaims,
): boolean {
  const trimmed = normalizeDashboardPath(pathWithoutLocale);
  if (!trimmed.startsWith("/dashboard")) {
    return false;
  }

  if (claims.isSuperAdmin === true) {
    return canAccessRoleDashboardPath(trimmed, "superAdmin");
  }

  if (!claims.role) {
    return trimmed === "/dashboard";
  }

  switch (claims.role) {
    case "DOCTOR_ADMIN":
      return canAccessRoleDashboardPath(trimmed, "doctorAdmin");
    case "DOCTOR":
      return canAccessRoleDashboardPath(trimmed, "doctor");
    case "RECEPTIONIST":
      return canAccessRoleDashboardPath(trimmed, "receptionist");
    default:
      return trimmed === "/dashboard";
  }
}
