export const roles = {
  superAdmin: "SUPER_ADMIN",
  doctorAdmin: "DOCTOR_ADMIN",
  doctor: "DOCTOR",
  receptionist: "RECEPTIONIST",
} as const;

export type Role = (typeof roles)[keyof typeof roles];

export const routeAccess: Record<string, Role[]> = {
  "/dashboard/super-admin": [roles.superAdmin],
  "/dashboard/doctor-admin": [roles.doctorAdmin],
  "/dashboard/doctor": [roles.doctor],
  "/dashboard/receptionist": [roles.receptionist],
};

export const dashboardRoutePrefixes: Record<Role, string[]> = {
  [roles.superAdmin]: ["/dashboard/super-admin"],
  [roles.doctorAdmin]: ["/dashboard/doctor-admin"],
  [roles.doctor]: ["/dashboard/doctor"],
  [roles.receptionist]: ["/dashboard/receptionist"],
};
