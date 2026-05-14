"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Button, Card, CardBody, CardHeader, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

type InstallmentStatus = "PENDING" | "PARTIAL" | "PAID";

interface Payment {
  id: string;
  amount: number;
  note?: string;
  paidAt: string;
}

interface Plan {
  id: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  status: InstallmentStatus;
  notes?: string;
  createdAt: string;
  patient: { id: string; fullName: string; code: string; phone?: string };
  payments: Payment[];
  appointment?: { id: string; startsAt: string } | null;
}

const STATUS_CONFIG: Record<
  InstallmentStatus,
  { label: string; labelAr: string; color: string; bg: string; border: string }
> = {
  PENDING: {
    label: "Not Paid",
    labelAr: "لم يُدفع",
    color: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
  PARTIAL: {
    label: "Partial",
    labelAr: "دفع جزء",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  PAID: {
    label: "Fully Paid",
    labelAr: "مدفوع كامل",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
};

function StatusBadge({
  status,
  isAr,
}: {
  status: InstallmentStatus;
  isAr: boolean;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === "PAID" ? "bg-success" : status === "PARTIAL" ? "bg-warning" : "bg-danger"}`}
      />
      {isAr ? cfg.labelAr : cfg.label}
    </span>
  );
}

function ProgressBar({ total, paid }: { total: number; paid: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted">
        <span>{paid.toLocaleString()} EGP</span>
        <span>{total.toLocaleString()} EGP</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-success" : pct > 0 ? "bg-warning" : "bg-danger/50"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-[11px] text-muted">{pct}%</p>
    </div>
  );
}

interface Props {
  patientId?: string;
  patientName?: string;
  showCreate?: boolean;
}

export function InstallmentsClient({
  patientId,
  patientName,
  showCreate = true,
}: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const { addToast } = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [showCreate_, setShowCreate_] = useState(false);
  const [addPaymentPlan, setAddPaymentPlan] = useState<Plan | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | InstallmentStatus>(
    "all",
  );

  // Create form
  const [form, setForm] = useState({
    title: "",
    totalAmount: "",
    initialPayment: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paying, setPaying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const url = `/api/installments${patientId ? `?patientId=${patientId}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [patientId]);

  const handleCreate = async () => {
    if (!form.title || !form.totalAmount) return;
    setCreating(true);
    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          title: form.title,
          totalAmount: Number(form.totalAmount),
          initialPayment: Number(form.initialPayment || 0),
          notes: form.notes || undefined,
        }),
      });
      if (res.ok) {
        addToast(
          "success",
          isAr ? "تم إنشاء خطة التقسيط" : "Installment plan created",
        );
        setShowCreate_(false);
        setForm({ title: "", totalAmount: "", initialPayment: "", notes: "" });
        void load();
      } else {
        addToast("error", isAr ? "حدث خطأ" : "Error occurred");
      }
    } finally {
      setCreating(false);
    }
  };

  const handlePayment = async () => {
    if (!addPaymentPlan || !payAmount) return;
    setPaying(true);
    try {
      const res = await fetch(
        `/api/installments/${addPaymentPlan.id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(payAmount),
            note: payNote || undefined,
          }),
        },
      );
      if (res.ok) {
        addToast("success", isAr ? "تم تسجيل الدفعة" : "Payment recorded");
        setAddPaymentPlan(null);
        setPayAmount("");
        setPayNote("");
        void load();
      } else {
        addToast("error", isAr ? "حدث خطأ" : "Error occurred");
      }
    } finally {
      setPaying(false);
    }
  };

  const filtered = plans.filter(
    (p) => statusFilter === "all" || p.status === statusFilter,
  );
  const counts = {
    all: plans.length,
    PENDING: plans.filter((p) => p.status === "PENDING").length,
    PARTIAL: plans.filter((p) => p.status === "PARTIAL").length,
    PAID: plans.filter((p) => p.status === "PAID").length,
  };

  const filters: {
    key: "all" | InstallmentStatus;
    labelAr: string;
    labelEn: string;
  }[] = [
    { key: "all", labelAr: "الكل", labelEn: "All" },
    { key: "PENDING", labelAr: "لم يُدفع", labelEn: "Unpaid" },
    { key: "PARTIAL", labelAr: "جزئي", labelEn: "Partial" },
    { key: "PAID", labelAr: "مكتمل", labelEn: "Paid" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-foreground">
            {isAr ? "التقسيط" : "Installments"}
            {patientName && (
              <span className="text-muted font-normal text-sm">
                {" "}
                — {patientName}
              </span>
            )}
          </h2>
        </div>
        {showCreate && patientId && (
          <Button size="sm" onClick={() => setShowCreate_(true)}>
            {isAr ? "+ خطة تقسيط" : "+ New Plan"}
          </Button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              statusFilter === f.key
                ? "bg-primary text-primary-fg"
                : "bg-surface-2 border border-border text-muted hover:text-foreground"
            }`}
          >
            {isAr ? f.labelAr : f.labelEn}
            <span
              className={`rounded-full px-1.5 text-[10px] font-bold ${statusFilter === f.key ? "bg-white/20 text-white" : "bg-border text-muted"}`}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Plans list */}
      {loading ? (
        <div className="py-10 text-center text-sm text-muted">
          {isAr ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted">
          {isAr ? "لا توجد خطط تقسيط" : "No installment plans"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((plan) => {
            const remaining =
              Number(plan.totalAmount) - Number(plan.paidAmount);
            return (
              <Card
                key={plan.id}
                className={`border-l-4 ${STATUS_CONFIG[plan.status].border}`}
              >
                <CardBody className="space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {plan.title}
                      </p>
                      {!patientId && (
                        <p className="text-xs text-muted mt-0.5">
                          {plan.patient.fullName} · {plan.patient.code}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={plan.status} isAr={isAr} />
                  </div>

                  {/* Progress */}
                  <ProgressBar
                    total={Number(plan.totalAmount)}
                    paid={Number(plan.paidAmount)}
                  />

                  {/* Amounts */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface-2 px-2 py-2">
                      <p className="text-[10px] text-muted">
                        {isAr ? "الإجمالي" : "Total"}
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {Number(plan.totalAmount).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-success/10 px-2 py-2">
                      <p className="text-[10px] text-muted">
                        {isAr ? "المدفوع" : "Paid"}
                      </p>
                      <p className="text-sm font-bold text-success">
                        {Number(plan.paidAmount).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-danger/10 px-2 py-2">
                      <p className="text-[10px] text-muted">
                        {isAr ? "المتبقي" : "Remaining"}
                      </p>
                      <p className="text-sm font-bold text-danger">
                        {remaining.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelected(plan)}
                      className="flex-1"
                    >
                      {isAr ? "السجل" : "History"}
                    </Button>
                    {plan.status !== "PAID" && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setAddPaymentPlan(plan);
                          setPayAmount("");
                          setPayNote("");
                        }}
                        className="flex-1"
                      >
                        {isAr ? "تسجيل دفعة" : "Add Payment"}
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate_}
        onClose={() => setShowCreate_(false)}
        title={isAr ? "خطة تقسيط جديدة" : "New Installment Plan"}
        closeLabel={isAr ? "إلغاء" : "Cancel"}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              {isAr ? "وصف الخدمة" : "Service Description"}
            </label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={
                isAr ? "مثال: عملية ضرس العقل" : "e.g. Wisdom tooth extraction"
              }
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                {isAr ? "المبلغ الإجمالي" : "Total Amount"} (EGP)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.totalAmount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, totalAmount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                {isAr ? "المدفوع الآن" : "Paid Now"} (EGP)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.initialPayment}
                onChange={(e) =>
                  setForm((p) => ({ ...p, initialPayment: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              {isAr ? "ملاحظات" : "Notes"}
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>
          {form.totalAmount && form.initialPayment && (
            <div className="rounded-lg bg-surface-2 p-3">
              <ProgressBar
                total={Number(form.totalAmount)}
                paid={Number(form.initialPayment)}
              />
            </div>
          )}
          <Button
            className="w-full"
            loading={creating}
            onClick={() => void handleCreate()}
          >
            {isAr ? "إنشاء الخطة" : "Create Plan"}
          </Button>
        </div>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        open={!!addPaymentPlan}
        onClose={() => setAddPaymentPlan(null)}
        title={isAr ? "تسجيل دفعة" : "Record Payment"}
        closeLabel={isAr ? "إلغاء" : "Cancel"}
      >
        {addPaymentPlan && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-2 p-3 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {addPaymentPlan.title}
              </p>
              <ProgressBar
                total={Number(addPaymentPlan.totalAmount)}
                paid={Number(addPaymentPlan.paidAmount)}
              />
              <p className="text-xs text-muted">
                {isAr ? "المتبقي:" : "Remaining:"}{" "}
                <span className="font-semibold text-danger">
                  {(
                    Number(addPaymentPlan.totalAmount) -
                    Number(addPaymentPlan.paidAmount)
                  ).toLocaleString()}{" "}
                  EGP
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                {isAr ? "مبلغ الدفعة" : "Payment Amount"} (EGP)
              </label>
              <input
                type="number"
                min="1"
                max={
                  Number(addPaymentPlan.totalAmount) -
                  Number(addPaymentPlan.paidAmount)
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                {isAr ? "ملاحظة" : "Note"}
              </label>
              <input
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              variant="primary"
              loading={paying}
              onClick={() => void handlePayment()}
            >
              {isAr ? "تأكيد الدفعة" : "Confirm Payment"}
            </Button>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={isAr ? "سجل الدفعات" : "Payment History"}
        closeLabel={isAr ? "إغلاق" : "Close"}
      >
        {selected && (
          <div className="space-y-3">
            <div className="rounded-lg bg-surface-2 p-3 space-y-2">
              <p className="font-semibold text-sm text-foreground">
                {selected.title}
              </p>
              <ProgressBar
                total={Number(selected.totalAmount)}
                paid={Number(selected.paidAmount)}
              />
            </div>
            {selected.payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                {isAr ? "لا توجد دفعات" : "No payments yet"}
              </p>
            ) : (
              <div className="space-y-2">
                {selected.payments.map((pay, i) => (
                  <div
                    key={pay.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-[11px] font-bold text-success">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {Number(pay.amount).toLocaleString()} EGP
                        </p>
                        {pay.note && (
                          <p className="text-xs text-muted">{pay.note}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted">
                      {new Date(pay.paidAt).toLocaleDateString(
                        isAr ? "ar-EG" : "en-GB",
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
