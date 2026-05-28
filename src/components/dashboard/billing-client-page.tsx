"use client";

import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Modal,
} from "@/components/ui";
import { buildInvoicePDF } from "@/lib/invoice-pdf";
import type { InvoiceLang } from "@/lib/invoice-pdf";

type Patient = { id: string; code: string; fullName: string };
type ServiceCatalog = {
  id: string;
  name: string;
  price: number;
  category?: string | null;
};
type InvoiceService = { name: string; amount: number | string };
type Invoice = {
  id: string;
  patientId?: string;
  totalAmount: string;
  paidAmount?: string;
  paymentMethod: string;
  status?: string;
  notes?: string;
  services?: InvoiceService[] | unknown;
  createdAt: string;
  patient?: { fullName: string; code: string } | null;
};

const PAGE_SIZE = 10;
function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ── Status colors ──
function statusBadge(status: string | undefined, isAr: boolean) {
  const map: Record<
    string,
    {
      label: string;
      labelAr: string;
      variant: "success" | "warning" | "danger" | "default";
    }
  > = {
    PAID: { label: "Paid", labelAr: "مدفوع كامل", variant: "success" },
    PARTIAL: { label: "Partial", labelAr: "جزئي", variant: "warning" },
    UNPAID: { label: "Unpaid", labelAr: "لم يُدفع", variant: "danger" },
  };
  const s = status ?? "PAID";
  const cfg = map[s] ?? { label: s, labelAr: s, variant: "default" as const };
  return <Badge variant={cfg.variant}>{isAr ? cfg.labelAr : cfg.label}</Badge>;
}

// ── Invoice Form ──
function InvoiceFormModal({
  open,
  onClose,
  patients,
  catalogServices,
  isAr,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  patients: Patient[];
  catalogServices: ServiceCatalog[];
  isAr: boolean;
  onSuccess: () => void;
}) {
  const { addToast } = useToast();
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [lines, setLines] = useState<{ name: string; amount: string }[]>([
    { name: "", amount: "" },
  ]);
  const [paymentMode, setPaymentMode] = useState<"full" | "partial" | "zero">(
    "full",
  );
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((s, l) => s + Number(l.amount || 0), 0);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    return q
      ? patients.filter((p) =>
          `${p.fullName} ${p.code}`.toLowerCase().includes(q),
        )
      : patients;
  }, [patients, patientSearch]);

  // Add service from catalog
  const addFromCatalog = (s: ServiceCatalog) => {
    setLines((prev) => {
      const empty = prev.findIndex((l) => !l.name && !l.amount);
      const newLine = { name: s.name, amount: String(s.price) };
      if (empty >= 0) {
        const n = [...prev];
        n[empty] = newLine;
        return n;
      }
      return [...prev, newLine];
    });
  };

  const computedPaid =
    paymentMode === "full"
      ? total
      : paymentMode === "zero"
        ? 0
        : Number(paidAmount || 0);

  const submit = async () => {
    setError(null);
    if (!patientId) {
      setError(isAr ? "اختر مريضاً" : "Select a patient");
      return;
    }
    if (lines.every((l) => !l.name || !l.amount)) {
      setError(isAr ? "أضف خدمة واحدة على الأقل" : "Add at least one service");
      return;
    }
    if (
      paymentMode === "partial" &&
      (Number(paidAmount) <= 0 || Number(paidAmount) >= total)
    ) {
      setError(
        isAr ? "أدخل مبلغاً جزئياً صحيحاً" : "Enter a valid partial amount",
      );
      return;
    }
    setPending(true);
    try {
      const validLines = lines.filter((l) => l.name && l.amount);
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          paymentMethod,
          notes: notes || undefined,
          services: validLines.map((l) => ({
            name: l.name,
            amount: Number(l.amount),
          })),
          paidAmount: computedPaid,
        }),
      });
      if (res.ok) {
        addToast("success", isAr ? "تم إنشاء الفاتورة" : "Invoice created");
        onClose();
        onSuccess();
      } else {
        const d = (await res.json().catch(() => ({}))) as { message?: string };
        setError(d.message ?? (isAr ? "حدث خطأ" : "Error"));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isAr ? "فاتورة جديدة" : "New Invoice"}
      closeLabel={isAr ? "إلغاء" : "Cancel"}
    >
      <div className="space-y-5">
        {/* Patient */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">
            {isAr ? "المريض" : "Patient"}
          </label>
          <input
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder={
              isAr ? "بحث بالاسم أو الكود..." : "Search by name or code..."
            }
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
          />
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {filteredPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} — {p.code}
              </option>
            ))}
          </select>
        </div>

        {/* Services from catalog */}
        {catalogServices.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">
              {isAr ? "اختر من الكتالوج" : "Pick from Catalog"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {catalogServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addFromCatalog(s)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-2 hover:border-primary/30 transition-colors"
                >
                  {s.name}
                  <span className="text-primary font-bold">
                    {Number(s.price).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Service lines */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">
            {isAr ? "الخدمات" : "Services"}
          </label>
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={isAr ? "اسم الخدمة" : "Service name"}
                value={line.name}
                onChange={(e) => {
                  const n = [...lines];
                  n[i] = { ...n[i], name: e.target.value };
                  setLines(n);
                }}
              />
              <input
                type="number"
                min="0"
                className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="EGP"
                value={line.amount}
                onChange={(e) => {
                  const n = [...lines];
                  n[i] = { ...n[i], amount: e.target.value };
                  setLines(n);
                }}
              />
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  className="rounded-lg border border-border px-2 text-danger hover:bg-danger/10 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLines([...lines, { name: "", amount: "" }])}
            className="text-xs text-primary hover:underline"
          >
            {isAr ? "+ إضافة خدمة" : "+ Add service"}
          </button>
          {total > 0 && (
            <div className="flex justify-end">
              <span className="text-sm font-bold text-foreground">
                {isAr ? "الإجمالي:" : "Total:"} {total.toLocaleString()} EGP
              </span>
            </div>
          )}
        </div>

        {/* Payment mode */}
        {total > 0 && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">
              {isAr ? "حالة الدفع" : "Payment Status"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  key: "full",
                  labelAr: "✓ مدفوع كامل",
                  labelEn: "✓ Fully Paid",
                  color: "border-success/40 bg-success/10 text-success",
                },
                {
                  key: "partial",
                  labelAr: "⟳ تقسيط",
                  labelEn: "⟳ Installment",
                  color: "border-warning/40 bg-warning/10 text-warning",
                },
                {
                  key: "zero",
                  labelAr: "✕ لم يدفع",
                  labelEn: "✕ Not Paid",
                  color: "border-danger/40 bg-danger/10 text-danger",
                },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() =>
                    setPaymentMode(opt.key as "full" | "partial" | "zero")
                  }
                  className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${paymentMode === opt.key ? opt.color : "border-border text-muted hover:border-border/80"}`}
                >
                  {isAr ? opt.labelAr : opt.labelEn}
                </button>
              ))}
            </div>

            {paymentMode === "partial" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">
                  {isAr
                    ? `المبلغ المدفوع الآن (من ${total.toLocaleString()} EGP)`
                    : `Amount paid now (of ${total.toLocaleString()} EGP)`}
                </label>
                <input
                  type="number"
                  min="1"
                  max={total - 1}
                  className="w-full rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-warning/30"
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
                {paidAmount && Number(paidAmount) > 0 && (
                  <p className="text-xs text-danger">
                    {isAr
                      ? `المتبقي: ${(total - Number(paidAmount)).toLocaleString()} EGP`
                      : `Remaining: ${(total - Number(paidAmount)).toLocaleString()} EGP`}
                  </p>
                )}
              </div>
            )}

            {paymentMode !== "zero" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">
                  {isAr ? "طريقة الدفع" : "Payment Method"}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="cash">{isAr ? "كاش" : "Cash"}</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">
            {isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
          </label>
          <input
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* Summary */}
        {total > 0 && (
          <div className="rounded-xl bg-surface-2 border border-border p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{isAr ? "الإجمالي" : "Total"}</span>
              <span className="font-bold text-foreground">
                {total.toLocaleString()} EGP
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{isAr ? "المدفوع" : "Paid"}</span>
              <span className="font-bold text-success">
                {computedPaid.toLocaleString()} EGP
              </span>
            </div>
            {total - computedPaid > 0 && (
              <div className="flex justify-between text-sm border-t border-border pt-1.5">
                <span className="text-muted">
                  {isAr ? "المتبقي" : "Remaining"}
                </span>
                <span className="font-bold text-danger">
                  {(total - computedPaid).toLocaleString()} EGP
                </span>
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full"
          loading={pending}
          onClick={() => void submit()}
        >
          {isAr ? "إصدار الفاتورة" : "Issue Invoice"}
        </Button>
      </div>
    </Modal>
  );
}

// ── Main Page ──
export function BillingClientPage({
  invoices: initial,
  patients,
  locale,
  canExport = true,
  clinicName = "",
}: {
  invoices: Invoice[];
  patients: Patient[];
  locale: string;
  canExport?: boolean;
  clinicName?: string;
}) {
  const isAr = locale === "ar";
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState(initial);
  const [catalogServices, setCatalogServices] = useState<ServiceCatalog[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [dateFilter, setDateFilter] = useState(dateInputValue(new Date()));
  const [rxLang, setRxLang] = useState<InvoiceLang>(
    locale === "ar" ? "ar" : "en",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  // Load catalog services
  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setCatalogServices(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const reload = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("date", dateFilter);
    const res = await fetch(`/api/billing/invoices?date=${dateFilter}`);
    if (res.ok) {
      const d = await res.json();
      setInvoices(Array.isArray(d) ? d : []);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter(
      (inv) =>
        !q ||
        `${inv.patient?.fullName} ${inv.patient?.code}`
          .toLowerCase()
          .includes(q),
    );
  }, [invoices, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalToday = invoices.reduce(
    (s, inv) => s + Number(inv.totalAmount || 0),
    0,
  );
  const totalPaid = invoices.reduce(
    (s, inv) => s + Number(inv.paidAmount || inv.totalAmount || 0),
    0,
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/billing/invoices/${deleteTarget}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast("success", isAr ? "تم حذف الفاتورة" : "Invoice deleted");
        setDeleteTarget(null);
        void reload();
      } else {
        addToast("error", isAr ? "حدث خطأ" : "Error");
      }
    } finally {
      setDeleting(false);
    }
  };

  function printInvoice(inv: Invoice) {
    const svcs = Array.isArray(inv.services)
      ? (inv.services as InvoiceService[]).map((s) => ({
          name: s.name,
          amount: Number(s.amount),
        }))
      : [];

    const html = buildInvoicePDF(
      {
        invoice: {
          id: inv.id,
          totalAmount: Number(inv.totalAmount),
          paidAmount: Number(inv.paidAmount ?? inv.totalAmount),
          status: inv.status,
          paymentMethod: inv.paymentMethod,
          notes: inv.notes ?? null,
          createdAt: inv.createdAt,
          services: svcs,
        },
        patient: {
          fullName: inv.patient?.fullName ?? "—",
          code: inv.patient?.code ?? "—",
          phone: null,
        },
        clinic: { name: clinicName },
        doctor: null,
      },
      rxLang,
    );

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 1200);
  }

  function exportCsv() {
    // FIX: Trigger browser download for clinic-scoped invoice CSV export.
    window.location.href = "/api/billing/invoices/export/csv";
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isAr ? "الفواتير" : "Invoices"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {isAr
              ? "إنشاء الفواتير وتسجيل المدفوعات"
              : "Create invoices and record payments"}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Lang toggle for invoice printing */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => setRxLang("ar")}
              className={`px-2.5 py-1.5 transition-colors ${rxLang === "ar" ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2"}`}
            >
              ع
            </button>
            <button
              type="button"
              onClick={() => setRxLang("en")}
              className={`px-2.5 py-1.5 transition-colors ${rxLang === "en" ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2"}`}
            >
              EN
            </button>
          </div>
          {canExport && (
            <Button variant="secondary" onClick={exportCsv}>
              {isAr ? "تصدير CSV" : "Export CSV"}
            </Button>
          )}
          <Button onClick={() => setShowCreate(true)}>
            {isAr ? "+ فاتورة جديدة" : "+ New Invoice"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardBody className="text-center py-3">
            <p className="text-xs text-muted">
              {isAr ? "إجمالي اليوم" : "Today Total"}
            </p>
            <p className="text-lg font-bold text-foreground">
              {totalToday.toLocaleString()} EGP
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-3">
            <p className="text-xs text-muted">
              {isAr ? "المحصّل" : "Collected"}
            </p>
            <p className="text-lg font-bold text-success">
              {totalPaid.toLocaleString()} EGP
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            void reload();
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none"
        />
        <input
          className="flex-1 min-w-40 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none"
          placeholder={
            isAr ? "بحث بالاسم أو الرقم..." : "Search by name or code..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr
              ? `الفواتير (${filtered.length})`
              : `Invoices (${filtered.length})`}
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {paged.length === 0 ? (
            <EmptyState title={isAr ? "لا توجد فواتير" : "No invoices"} />
          ) : (
            <div className="divide-y divide-border">
              {paged.map((inv) => {
                const total = Number(inv.totalAmount);
                const paid = Number(inv.paidAmount ?? inv.totalAmount);
                const remaining = total - paid;
                const svcs = Array.isArray(inv.services)
                  ? (inv.services as InvoiceService[])
                  : [];
                return (
                  <div key={inv.id} className="px-4 py-3 space-y-2">
                    {/* Row 1: patient + status + amount */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {inv.patient?.fullName ?? "—"}
                        </p>
                        <p className="text-xs text-muted font-mono">
                          {inv.patient?.code}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusBadge(inv.status, isAr)}
                        <span className="text-sm font-bold text-foreground">
                          {total.toLocaleString()} EGP
                        </span>
                      </div>
                    </div>
                    {/* Row 2: services */}
                    {svcs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {svcs.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-surface-2 border border-border px-2 py-0.5 text-[11px] text-muted"
                          >
                            {s.name} — {Number(s.amount).toLocaleString()}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Row 3: paid/remaining */}
                    {(inv.status === "PARTIAL" || inv.status === "UNPAID") && (
                      <div className="flex gap-3 text-xs">
                        <span className="text-success">
                          ✓ {paid.toLocaleString()} EGP{" "}
                          {isAr ? "مدفوع" : "paid"}
                        </span>
                        <span className="text-danger">
                          ⟳ {remaining.toLocaleString()} EGP{" "}
                          {isAr ? "متبقي" : "remaining"}
                        </span>
                      </div>
                    )}
                    {/* Row 4: actions + time */}
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted">
                        {new Date(inv.createdAt).toLocaleTimeString(
                          isAr ? "ar-EG" : "en-GB",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                        {" · "}
                        {inv.paymentMethod === "cash"
                          ? isAr
                            ? "كاش"
                            : "Cash"
                          : "Vodafone Cash"}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => printInvoice(inv)}
                          className="text-xs text-primary/70 hover:text-primary px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
                          title={isAr ? "طباعة الفاتورة" : "Print Invoice"}
                        >
                          🖨
                        </button>
                        <button
                          onClick={() => setDeleteTarget(inv.id)}
                          className="text-xs text-danger/70 hover:text-danger px-2 py-0.5 rounded hover:bg-danger/10 transition-colors"
                        >
                          {isAr ? "حذف" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {isAr ? "السابق" : "Prev"}
          </Button>
          <span className="text-sm text-muted self-center">
            {page} / {Math.ceil(filtered.length / PAGE_SIZE)}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page * PAGE_SIZE >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            {isAr ? "التالي" : "Next"}
          </Button>
        </div>
      )}

      {/* Create Modal */}
      <InvoiceFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        patients={patients}
        catalogServices={catalogServices}
        isAr={isAr}
        onSuccess={() => void reload()}
      />

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={isAr ? "تأكيد الحذف" : "Confirm Delete"}
        closeLabel={isAr ? "إلغاء" : "Cancel"}
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {isAr
              ? "هل أنت متأكد من حذف هذه الفاتورة؟"
              : "Are you sure you want to delete this invoice?"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={deleting}
              onClick={() => void handleDelete()}
            >
              {isAr ? "حذف" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
