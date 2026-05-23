interface Props {
  paymentMode: "FIXED_RENT" | "PERCENTAGE" | null;
  fixedMonthlyRent: number | null;
  adminPercentage: number | null;
  isAr: boolean;
}

export function DoctorPaymentBadge({
  paymentMode,
  fixedMonthlyRent,
  adminPercentage,
  isAr,
}: Props) {
  if (!paymentMode) return null;

  if (paymentMode === "FIXED_RENT") {
    return (
      <span className="text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
        {isAr ? "إيجار " : "Rent "}
        {fixedMonthlyRent != null ? `${fixedMonthlyRent}` : "—"}
      </span>
    );
  }

  if (paymentMode === "PERCENTAGE") {
    return (
      <span className="text-[11px] bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
        {adminPercentage != null ? `${adminPercentage}%` : "—"}
        {isAr ? " نسبة" : " share"}
      </span>
    );
  }

  return null;
}
