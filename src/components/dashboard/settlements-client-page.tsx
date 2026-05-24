"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Modal,
} from "@/components/ui";
import type { DoctorSettlementRow } from "@/app/[locale]/(dashboard)/dashboard/doctor-admin/settlements/page";

function fmt(n: number, locale: string) {
  return n.toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function monthLabel(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-GB",
    { year: "numeric", month: "long" },
  );
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function statusBadge(
  status: DoctorSettlementRow["status"],
  isAr: boolean,
): { variant: "success" | "warning" | "danger" | "muted"; label: string } {
  switch (status) {
    case "PAID":
      return { variant: "success", label: isAr ? "تم الدفع" : "Paid" };
    case "PARTIAL":
      return { variant: "warning", label: isAr ? "جزئي" : "Partial" };
    case "PENDING":
      return { variant: "danger", label: isAr ? "متأخر" : "Pending" };
    default:
      return { variant: "muted", label: isAr ? "لم يُسوَّ" : "Not settled" };
  }
}

type PayModal = {
  row: DoctorSettlementRow;
};

export function SettlementsClientPage({
  rows: allRows,
  month,
  locale,
}: {
  rows: DoctorSettlementRow[];
  month: string;
  locale: string;
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // DOCTOR_ADMIN هو صاحب العيادة — مش بيدفع لنفسه
  const rows = allRows.filter(
    (r) => !("role" in r) || (r as any).role !== "DOCTOR_ADMIN",
  );

  const [payModal, setPayModal] = useState<PayModal | null>(null);
  const [payStatus, setPayStatus] = useState<"PAID" | "PARTIAL">("PAID");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function navigate(m: string) {
    startTransition(() => {
      router.push(`?month=${m}`);
    });
  }

  function openPayModal(row: DoctorSettlementRow) {
    setPayModal({ row });
    setPayStatus("PAID");
    setPayAmount(String(row.clinicShare));
    setPayMethod("cash");
    setPayNotes("");
    setError(null);
  }

  async function confirmSettlement() {
    if (!payModal) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/billing/settlements/${payModal.row.doctorUserId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month,
            status: payStatus,
            paidAmount: payAmount ? Number(payAmount) : undefined,
            paymentMethod: payMethod,
            notes: payNotes || undefined,
          }),
        },
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setError(d.message ?? (isAr ? "حدث خطأ" : "Something went wrong"));
        return;
      }
      setPayModal(null);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  // DOCTOR_ADMIN هو صاحب العيادة — مش بيدفع لنفسه
  const rows = allRows.filter((r) => r.status !== undefined);

  // Summary totals — بدون DOCTOR_ADMIN
  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
  const totalClinicShare = rows.reduce((s, r) => s + r.clinicShare, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paidAmount, 0);
  const totalPending = totalClinicShare - totalPaid;
  const isFutureMonth = month > currentMonth();

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "التسوية الشهرية" : "Monthly Settlement"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {isAr
              ? "تتبع مستحقات العيادة من كل طبيب"
              : "Track clinic dues from each doctor"}
          </p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(prevMonth(month))}
            disabled={isPending}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points={isAr ? "9 18 15 12 9 6" : "15 18 9 12 15 6"} />
            </svg>
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {monthLabel(month, locale)}
          </span>
          <button
            onClick={() => navigate(nextMonth(month))}
            disabled={isPending || month >= currentMonth()}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-2 transition-colors disabled:opacity-40"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points={isAr ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: isAr ? "إجمالي إيرادات الأطباء" : "Total Doctor Revenue",
            value: fmt(totalRevenue, locale),
            color: "text-foreground",
          },
          {
            label: isAr ? "مستحق للعيادة" : "Clinic Share Due",
            value: fmt(totalClinicShare, locale),
            color: "text-foreground",
          },
          {
            label: isAr ? "تم استلامه" : "Collected",
            value: fmt(totalPaid, locale),
            color: "text-[var(--color-text-success)]",
          },
          {
            label: isAr ? "متبقي" : "Remaining",
            value: fmt(totalPending, locale),
            color:
              totalPending > 0
                ? "text-[var(--color-text-danger)]"
                : "text-[var(--color-text-success)]",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-xl p-4"
          >
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">
              {c.label}
            </p>
            <p className={`text-lg font-semibold font-mono ${c.color}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Doctor rows ── */}
      {isFutureMonth ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted text-center py-8">
              {isAr
                ? "لا يمكن عرض تسوية شهر مستقبلي"
                : "Cannot show settlement for a future month"}
            </p>
          </CardBody>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted text-center py-8">
              {isAr ? "لا يوجد أطباء نشطون" : "No active doctors found"}
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">
              {isAr ? "تفاصيل كل طبيب" : "Per-Doctor Breakdown"}
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-[var(--color-border-tertiary)]">
              {rows.map((row) => {
                const badge = statusBadge(row.status, isAr);
                const remaining = row.clinicShare - row.paidAmount;
                return (
                  <div
                    key={row.doctorUserId}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    {/* Left: doctor info + numbers */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">
                          {row.doctorName}
                        </p>
                        {row.specialty && (
                          <span className="text-xs text-muted">
                            {row.specialty}
                          </span>
                        )}
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {row.paymentMode && (
                          <span className="text-[11px] bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded font-mono">
                            {row.paymentMode === "FIXED_RENT"
                              ? `${isAr ? "إيجار" : "Rent"} ${fmt(row.fixedMonthlyRent, locale)}`
                              : `${row.adminPercentage}%`}
                          </span>
                        )}
                      </div>

                      {/* Revenue breakdown */}
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-muted mb-0.5">
                            {isAr ? "الإيرادات" : "Revenue"}
                          </p>
                          <p className="font-mono font-medium">
                            {fmt(row.totalRevenue, locale)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted mb-0.5">
                            {isAr ? "نصيب العيادة" : "Clinic Share"}
                          </p>
                          <p className="font-mono font-medium text-[var(--color-text-info)]">
                            {fmt(row.clinicShare, locale)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted mb-0.5">
                            {isAr ? "صافي الطبيب" : "Doctor Net"}
                          </p>
                          <p className="font-mono font-medium text-[var(--color-text-success)]">
                            {fmt(row.doctorNet, locale)}
                          </p>
                        </div>
                      </div>

                      {/* Paid info */}
                      {row.paidAmount > 0 && (
                        <p className="text-xs text-muted">
                          {isAr ? "مدفوع: " : "Paid: "}
                          <span className="font-mono text-[var(--color-text-success)]">
                            {fmt(row.paidAmount, locale)}
                          </span>
                          {remaining > 0 && (
                            <>
                              {" · "}
                              {isAr ? "متبقي: " : "Remaining: "}
                              <span className="font-mono text-[var(--color-text-danger)]">
                                {fmt(remaining, locale)}
                              </span>
                            </>
                          )}
                          {row.settlement?.paymentMethod && (
                            <> · {row.settlement.paymentMethod}</>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Right: action */}
                    <div className="flex items-center gap-2 shrink-0">
                      {row.clinicShare > 0 &&
                        row.status !== "PAID" &&
                        !isFutureMonth && (
                          <Button
                            size="sm"
                            variant={
                              row.status === "NOT_SETTLED" ||
                              row.status === "PENDING"
                                ? "primary"
                                : "secondary"
                            }
                            onClick={() => openPayModal(row)}
                          >
                            {row.status === "PARTIAL"
                              ? isAr
                                ? "تسوية باقي"
                                : "Settle Remaining"
                              : isAr
                                ? "تسجيل دفع"
                                : "Record Payment"}
                          </Button>
                        )}
                      {row.status === "PAID" && (
                        <button
                          onClick={() => openPayModal(row)}
                          className="text-xs text-muted hover:text-foreground transition-colors"
                        >
                          {isAr ? "تعديل" : "Edit"}
                        </button>
                      )}
                      {row.clinicShare === 0 && (
                        <span className="text-xs text-muted">
                          {isAr ? "لا يوجد مستحق" : "No dues"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Pay Modal ── */}
      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={isAr ? "تسجيل دفعة" : "Record Payment"}
        description={
          payModal
            ? isAr
              ? `تسوية مستحقات ${payModal.row.doctorName} — ${monthLabel(month, locale)}`
              : `Settle dues for ${payModal.row.doctorName} — ${monthLabel(month, locale)}`
            : ""
        }
        closeLabel={isAr ? "إلغاء" : "Cancel"}
      >
        {payModal && (
          <div className="space-y-4">
            {/* Amount info */}
            <div className="bg-[var(--color-background-secondary)] rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">
                  {isAr ? "نصيب العيادة" : "Clinic Share"}
                </span>
                <span className="font-mono font-medium">
                  {fmt(payModal.row.clinicShare, locale)}
                </span>
              </div>
              {payModal.row.paidAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">
                    {isAr ? "مدفوع سابقاً" : "Previously Paid"}
                  </span>
                  <span className="font-mono text-[var(--color-text-success)]">
                    {fmt(payModal.row.paidAmount, locale)}
                  </span>
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-medium mb-2">
                {isAr ? "حالة الدفع" : "Payment Status"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["PAID", "PARTIAL"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setPayStatus(s);
                      if (s === "PAID")
                        setPayAmount(String(payModal.row.clinicShare));
                    }}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      payStatus === s
                        ? "bg-primary text-primary-fg border-primary"
                        : "bg-transparent text-muted border-border hover:bg-surface-2"
                    }`}
                  >
                    {s === "PAID"
                      ? isAr
                        ? "دفع كامل"
                        : "Full Payment"
                      : isAr
                        ? "دفع جزئي"
                        : "Partial Payment"}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-medium mb-1.5">
                {isAr ? "المبلغ المدفوع" : "Amount Paid"}
              </label>
              <input
                type="number"
                min={0}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 ring-primary/30"
              />
            </div>

            {/* Payment method */}
            <div>
              <p className="text-xs font-medium mb-2">
                {isAr ? "طريقة الدفع" : "Payment Method"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "cash", ar: "كاش", en: "Cash" },
                  { value: "transfer", ar: "تحويل", en: "Transfer" },
                  { value: "check", ar: "شيك", en: "Check" },
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPayMethod(m.value)}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      payMethod === m.value
                        ? "bg-primary text-primary-fg border-primary"
                        : "bg-transparent text-muted border-border hover:bg-surface-2"
                    }`}
                  >
                    {isAr ? m.ar : m.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium mb-1.5">
                {isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
              </label>
              <textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 ring-primary/30 resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-[var(--color-text-danger)] bg-[var(--color-background-danger)] border border-[var(--color-border-danger)] px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setPayModal(null)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button loading={saving} onClick={() => void confirmSettlement()}>
                {isAr ? "تأكيد الدفع" : "Confirm Payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
