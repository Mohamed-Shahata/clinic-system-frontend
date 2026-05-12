export function numberLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-GB";
}

export function formatNumber(value: number | string, locale: string) {
  return Number(value || 0).toLocaleString(numberLocale(locale));
}

export function formatPercent(value: number, locale: string) {
  return `${formatNumber(value, locale)}%`;
}

export function appointmentStatusLabel(status: string, locale: string) {
  const isAr = locale === "ar";
  const labels: Record<string, [string, string]> = {
    IN_QUEUE: ["قيد الانتظار", "Waiting"],
    IN_PROGRESS: ["قيد التنفيذ", "In progress"],
    COMPLETED: ["مكتمل", "Completed"],
    CANCELLED: ["ملغي", "Cancelled"],
  };
  return (labels[status] ?? [status, status])[isAr ? 0 : 1];
}

export function roleLabel(role: string, locale: string) {
  const isAr = locale === "ar";
  const labels: Record<string, [string, string]> = {
    RECEPTIONIST: ["موظف استقبال", "Receptionist"],
    DOCTOR_ADMIN: ["طبيب", "Doctor"],
    SUPER_ADMIN: ["مدير المنصة", "Super Admin"],
  };
  return (labels[role] ?? [role, role])[isAr ? 0 : 1];
}

export function paymentMethodLabel(method: string, locale: string) {
  const isAr = locale === "ar";
  const labels: Record<string, [string, string]> = {
    cash: ["نقدي", "Cash"],
    vodafone_cash: ["فودافون كاش", "Vodafone Cash"],
  };
  return (labels[method] ?? [method, method])[isAr ? 0 : 1];
}
