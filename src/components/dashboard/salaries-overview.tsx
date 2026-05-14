"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Button, Card, CardBody, CardHeader, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface StaffSalaryRow {
  clinicUserId: string;
  userId: string;
  fullName: string;
  monthlyAmount: number | null;
  dailyRate: number;
  accrued: number;
  lastPaidAt: string | null;
  lastPaidAmount: number | null;
  salaryId: string | null;
  effectiveFrom: string | null;
}

export function SalariesOverview() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const { addToast } = useToast();

  const [rows, setRows] = useState<StaffSalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<StaffSalaryRow | null>(null);
  const [payRow, setPayRow] = useState<StaffSalaryRow | null>(null);
  const [newSalary, setNewSalary] = useState("");
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmPay, setConfirmPay] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/salaries/overview");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSetSalary = async () => {
    if (!editRow || !newSalary) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/salaries/staff/${editRow.clinicUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyAmount: Number(newSalary) }),
      });
      if (res.ok) {
        addToast("success", isAr ? "تم تحديد الراتب" : "Salary set");
        setEditRow(null);
        void load();
      } else {
        addToast("error", isAr ? "حدث خطأ" : "Error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    if (!payRow?.salaryId) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/salaries/${payRow.salaryId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payRow.accrued }),
      });
      if (res.ok) {
        addToast("success", isAr ? "تم تسجيل صرف الراتب" : "Salary paid");
        setPayRow(null);
        setConfirmPay(false);
        void load();
      } else {
        addToast("error", isAr ? "حدث خطأ" : "Error");
      }
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted">
        {isAr ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted">
        {isAr ? "لا توجد سكيرتيرات في العيادة" : "No receptionists in clinic"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const hasNoSalary = row.monthlyAmount === null;
        const urgency = row.accrued > 0 && row.monthlyAmount !== null;

        return (
          <Card
            key={row.clinicUserId}
            className={urgency ? "border-warning/40" : ""}
          >
            <CardBody className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {row.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {row.fullName}
                    </p>
                    {row.effectiveFrom && (
                      <p className="text-xs text-muted">
                        {isAr ? "منذ" : "Since"}{" "}
                        {new Date(row.effectiveFrom).toLocaleDateString(
                          isAr ? "ar-EG" : "en-GB",
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditRow(row);
                    setNewSalary(row.monthlyAmount?.toString() ?? "");
                  }}
                >
                  {isAr ? "تعديل الراتب" : "Set Salary"}
                </Button>
              </div>

              {hasNoSalary ? (
                <div className="rounded-lg bg-surface-2 border border-dashed border-border p-3 text-center text-xs text-muted">
                  {isAr ? "لم يتم تحديد راتب بعد" : "No salary set yet"}
                </div>
              ) : (
                <>
                  {/* Salary stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface-2 px-2 py-2">
                      <p className="text-[10px] text-muted">
                        {isAr ? "شهري" : "Monthly"}
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {row.monthlyAmount!.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-2 px-2 py-2">
                      <p className="text-[10px] text-muted">
                        {isAr ? "يومي" : "Daily"}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        {row.dailyRate.toFixed(0)}
                      </p>
                    </div>
                    <div
                      className={`rounded-lg px-2 py-2 ${row.accrued > 0 ? "bg-warning/10" : "bg-surface-2"}`}
                    >
                      <p className="text-[10px] text-muted">
                        {isAr ? "المتراكم" : "Accrued"}
                      </p>
                      <p
                        className={`text-sm font-bold ${row.accrued > 0 ? "text-warning" : "text-muted"}`}
                      >
                        {row.accrued.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Last payment */}
                  {row.lastPaidAt && (
                    <p className="text-xs text-muted">
                      {isAr ? "آخر صرف:" : "Last paid:"}{" "}
                      <span className="font-medium text-foreground">
                        {row.lastPaidAmount?.toLocaleString()} EGP —{" "}
                        {new Date(row.lastPaidAt).toLocaleDateString(
                          isAr ? "ar-EG" : "en-GB",
                        )}
                      </span>
                    </p>
                  )}

                  {/* Pay button */}
                  {row.salaryId && row.accrued > 0 && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        setPayRow(row);
                        setConfirmPay(true);
                      }}
                    >
                      {isAr
                        ? `تم استلام الراتب — ${row.accrued.toLocaleString()} EGP`
                        : `Mark Salary Paid — ${row.accrued.toLocaleString()} EGP`}
                    </Button>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        );
      })}

      {/* Edit salary modal */}
      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={isAr ? "تحديد الراتب الشهري" : "Set Monthly Salary"}
        closeLabel={isAr ? "إلغاء" : "Cancel"}
      >
        {editRow && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {isAr ? "السكيرتيرة:" : "Receptionist:"}{" "}
              <span className="font-semibold text-foreground">
                {editRow.fullName}
              </span>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                {isAr ? "الراتب الشهري (EGP)" : "Monthly Salary (EGP)"}
              </label>
              <input
                type="number"
                min="1"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
              />
            </div>
            {newSalary && (
              <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted space-y-1">
                <div className="flex justify-between">
                  <span>{isAr ? "راتب يومي:" : "Daily rate:"}</span>
                  <span className="font-semibold text-foreground">
                    {(Number(newSalary) / 30).toFixed(0)} EGP
                  </span>
                </div>
              </div>
            )}
            <Button
              className="w-full"
              loading={saving}
              onClick={() => void handleSetSalary()}
            >
              {isAr ? "حفظ الراتب" : "Save Salary"}
            </Button>
          </div>
        )}
      </Modal>

      {/* Confirm pay modal */}
      <Modal
        open={confirmPay && !!payRow}
        onClose={() => {
          setConfirmPay(false);
          setPayRow(null);
        }}
        title={isAr ? "تأكيد صرف الراتب" : "Confirm Salary Payment"}
        closeLabel={isAr ? "إلغاء" : "Cancel"}
      >
        {payRow && (
          <div className="space-y-4">
            <div className="rounded-lg bg-warning/10 border border-warning/30 p-4 text-center space-y-1">
              <p className="text-2xl font-extrabold text-warning">
                {payRow.accrued.toLocaleString()} EGP
              </p>
              <p className="text-xs text-muted">
                {isAr ? "المبلغ المستحق لـ" : "Amount due for"}{" "}
                {payRow.fullName}
              </p>
            </div>
            <p className="text-xs text-center text-muted">
              {isAr
                ? "بعد التأكيد سيتم تسجيل الصرف ويبدأ العداد من الصفر"
                : "After confirmation, payment is logged and counter resets to zero"}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setConfirmPay(false);
                  setPayRow(null);
                }}
              >
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                loading={paying}
                onClick={() => void handlePay()}
              >
                {isAr ? "تأكيد الصرف" : "Confirm Payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
