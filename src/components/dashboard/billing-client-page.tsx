"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Modal,
} from "@/components/ui";

type Patient = { id: string; code: string; fullName: string };
type InvoiceService = { name: string; amount: number | string };
type Invoice = {
  id: string;
  patientId?: string;
  totalAmount: string;
  paymentMethod: string;
  services?: InvoiceService[] | unknown;
  createdAt: string;
  patient?: { fullName: string; code: string } | null;
};

const PAGE_SIZE = 10;

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const emptyService = (): { name: string; amount: string } => ({
  name: "",
  amount: "",
});

/* ── Invoice Form Fields — reused in Add & Edit modals ── */
function InvoiceFormFields({
  isAr,
  patients,
  patientId,
  setPatientId,
  patientSearch,
  setPatientSearch,
  services,
  setServices,
  paymentMethod,
  setPaymentMethod,
  formError,
}: {
  isAr: boolean;
  patients: Patient[];
  patientId: string;
  setPatientId: (v: string) => void;
  patientSearch: string;
  setPatientSearch: (v: string) => void;
  services: { name: string; amount: string }[];
  setServices: React.Dispatch<
    React.SetStateAction<{ name: string; amount: string }[]>
  >;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  formError: string | null;
}) {
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.fullName} ${p.code}`.toLowerCase().includes(q),
    );
  }, [patients, patientSearch]);

  return (
    <div className="space-y-4 mt-2">
      {formError && <Alert variant="error">{formError}</Alert>}

      {/* Patient */}
      <div className="rounded-lg border border-card-border p-3 space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {isAr ? "بيانات المريض" : "Patient"}
        </h3>
        <Input
          label={isAr ? "بحث عن مريض" : "Search patient"}
          placeholder={isAr ? "اكتب الاسم أو الرقم" : "Type name or code"}
          value={patientSearch}
          onChange={(e) => setPatientSearch(e.target.value)}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {isAr ? "المريض" : "Select patient"}
          </label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.code})
                </option>
              ))
            ) : (
              <option value="" disabled>
                {isAr ? "لا يوجد مرضى مطابقين" : "No matching patients"}
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Amount */}
      <div className="rounded-lg border border-card-border p-3 space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {isAr ? "المبلغ" : "Amount"}
        </h3>
        <Input
          label={isAr ? "المبلغ (EGP)" : "Amount (EGP)"}
          type="number"
          min="0"
          placeholder="0"
          value={services[0]?.amount ?? ""}
          onChange={(e) =>
            setServices([{ name: "Consultation", amount: e.target.value }])
          }
        />
      </div>

      {/* Payment method */}
      <div className="rounded-lg border border-card-border p-3 space-y-2">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {isAr ? "طريقة الدفع" : "Payment Method"}
        </h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "cash", labelAr: "نقدي", labelEn: "Cash" },
            {
              value: "vodafone_cash",
              labelAr: "فودافون كاش",
              labelEn: "Vodafone Cash",
            },
            { value: "card", labelAr: "بطاقة", labelEn: "Card" },
            {
              value: "insurance",
              labelAr: "تأمين",
              labelEn: "Insurance",
            },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPaymentMethod(opt.value)}
              className={[
                "flex-1 flex items-center justify-center rounded-lg border py-2.5 text-xs font-medium transition-colors",
                paymentMethod === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted hover:bg-surface-2",
              ].join(" ")}
            >
              {isAr ? opt.labelAr : opt.labelEn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BillingClientPage({
  patients,
  invoices: initialInvoices,
  locale,
  isAr,
}: {
  patients: Patient[];
  invoices: Invoice[];
  locale: string;
  isAr: boolean;
}) {
  const { addToast } = useToast();

  const [invoices, setInvoices] = useState(initialInvoices);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(() =>
    dateInputValue(new Date()),
  );
  const [page, setPage] = useState(1);

  // Shared form state
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [patientSearch, setPatientSearch] = useState("");
  const [services, setServices] = useState<{ name: string; amount: string }[]>([
    { name: "Consultation", amount: "300" },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const paymentLabels: Record<string, string> = {
    cash: isAr ? "نقدي" : "Cash",
    vodafone_cash: isAr ? "فودافون كاش" : "Vodafone Cash",
    card: isAr ? "بطاقة" : "Card",
    insurance: isAr ? "تأمين" : "Insurance",
  };
  const paymentIcons: Record<string, string> = {
    cash: "💵",
    vodafone_cash: "📱",
    card: "💳",
    insurance: "🏥",
  };

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (dateInputValue(new Date(inv.createdAt)) !== dateFilter) return false;
      if (!q) return true;
      const name = inv.patient?.fullName?.toLowerCase() ?? "";
      const code = inv.patient?.code?.toLowerCase() ?? "";
      return name.includes(q) || code.includes(q);
    });
  }, [invoices, search, dateFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / PAGE_SIZE),
  );
  const pagedInvoices = filteredInvoices.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  // Daily total
  const dailyTotal = filteredInvoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0,
  );

  function resetForm() {
    setPatientId(patients[0]?.id ?? "");
    setPatientSearch("");
    setServices([{ name: "Consultation", amount: "300" }]);
    setPaymentMethod("cash");
    setFormError(null);
  }

  function firstService(invoice: Invoice): InvoiceService {
    return Array.isArray(invoice.services) && invoice.services.length > 0
      ? (invoice.services[0] as InvoiceService)
      : { name: "Consultation", amount: invoice.totalAmount };
  }

  function openEdit(invoice: Invoice) {
    const svcs =
      Array.isArray(invoice.services) && invoice.services.length > 0
        ? (invoice.services as InvoiceService[]).map((s) => ({
            name: String(s.name ?? ""),
            amount: String(s.amount ?? "0"),
          }))
        : [
            {
              name: "Consultation",
              amount: String(invoice.totalAmount ?? "0"),
            },
          ];
    setEditing(invoice);
    setPatientId(invoice.patientId ?? patients[0]?.id ?? "");
    setPatientSearch("");
    setServices(svcs);
    setPaymentMethod(invoice.paymentMethod);
    setFormError(null);
  }

  function printInvoice(invoice: Invoice) {
    const svcs =
      Array.isArray(invoice.services) && invoice.services.length > 0
        ? (invoice.services as InvoiceService[])
        : [{ name: "Consultation", amount: invoice.totalAmount }];
    const servicesRows = svcs
      .map(
        (s) =>
          `<div class="row"><span>${String(s.name)}</span><strong>${Number(s.amount).toLocaleString()} EGP</strong></div>`,
      )
      .join("");
    const html = `<!doctype html><html lang="${locale}" dir="${isAr ? "rtl" : "ltr"}"><head><meta charset="utf-8" />
      <title>${isAr ? "فاتورة" : "Invoice"}</title>
      <style>body{font-family:Arial,sans-serif;margin:0;color:#17202a}.sheet{width:80mm;margin:auto;padding:18px}.top{border-bottom:1px solid #cbd5e1;padding-bottom:10px;margin-bottom:14px}h1{font-size:20px;margin:0 0 6px}.row{display:flex;justify-content:space-between;gap:10px;margin:8px 0;font-size:13px}.total{border-top:2px solid #17202a;margin-top:14px;padding-top:12px;font-weight:700;font-size:18px}.muted{color:#64748b;font-size:12px}.divider{border-top:1px dashed #cbd5e1;margin:10px 0}</style>
      </head><body><main class="sheet"><div class="top"><h1>${isAr ? "فاتورة عيادة" : "Clinic Invoice"}</h1><div class="muted">${new Date(invoice.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")}</div></div>
      <div class="row"><span>${isAr ? "كود الفاتورة" : "Invoice code"}</span><strong>${invoice.id.slice(-8).toUpperCase()}</strong></div>
      <div class="row"><span>${isAr ? "المريض" : "Patient"}</span><strong>${invoice.patient?.fullName ?? "-"}</strong></div>
      <div class="row"><span>${isAr ? "كود المريض" : "Patient code"}</span><strong>${invoice.patient?.code ?? "-"}</strong></div>
      <div class="divider"></div>
      ${servicesRows}
      <div class="row"><span>${isAr ? "طريقة الدفع" : "Payment"}</span><strong>${paymentLabels[invoice.paymentMethod] ?? invoice.paymentMethod}</strong></div>
      <div class="row total"><span>${isAr ? "الإجمالي" : "Total"}</span><strong>${Number(invoice.totalAmount).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")} EGP</strong></div>
      </main><script>window.onload=()=>window.print()</script></body></html>`;
    const popup = window.open("", "_blank", "width=420,height=700");
    popup?.document.write(html);
    popup?.document.close();
  }

  async function submit(shouldPrint = false) {
    setFormError(null);
    if (!patientId) {
      setFormError(isAr ? "يرجى اختيار مريض" : "Please select a patient");
      return;
    }
    const validServices = services
      .map((s) => ({ name: s.name.trim(), amount: Number(s.amount) || 0 }))
      .filter((s) => s.name);
    if (validServices.length === 0) {
      setFormError(
        isAr ? "أضف خدمة واحدة على الأقل" : "Add at least one service",
      );
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          paymentMethod,
          services: validServices,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setFormError(
          data.message ??
            (isAr ? "تعذر إنشاء الفاتورة" : "Could not create invoice"),
        );
        return;
      }
      const newInvoice = (await res.json()) as Invoice;
      setInvoices((prev) => [newInvoice, ...prev]);
      if (shouldPrint) printInvoice(newInvoice);
      addToast(
        "success",
        isAr ? "تم إنشاء الفاتورة بنجاح" : "Invoice created successfully",
      );
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  async function submitEdit() {
    if (!editing) return;
    setFormError(null);
    if (!patientId) {
      setFormError(isAr ? "يرجى اختيار مريض" : "Please select a patient");
      return;
    }
    const validServices = services
      .map((s) => ({ name: s.name.trim(), amount: Number(s.amount) || 0 }))
      .filter((s) => s.name);
    setEditPending(true);
    try {
      const res = await fetch(`/api/billing/invoices/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          paymentMethod,
          services: validServices,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setFormError(
          data.message ??
            (isAr ? "تعذر تعديل الفاتورة" : "Could not update invoice"),
        );
        return;
      }
      const updatedInvoice = (await res.json()) as Invoice;
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === updatedInvoice.id ? updatedInvoice : inv,
        ),
      );
      addToast("success", isAr ? "تم تعديل الفاتورة" : "Invoice updated");
      setEditing(null);
    } finally {
      setEditPending(false);
    }
  }

  async function deleteInvoice(invoiceId: string) {
    setDeletePendingId(invoiceId);
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        addToast(
          "error",
          isAr ? "تعذر حذف الفاتورة" : "Could not delete invoice",
        );
        return;
      }
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      setDeleteConfirmId(null);
      addToast("success", isAr ? "تم حذف الفاتورة" : "Invoice deleted");
    } finally {
      setDeletePendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "الفواتير" : "Billing"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {isAr
              ? "إنشاء الفواتير وتسجيل المدفوعات"
              : "Create invoices and record payments"}
          </p>
        </div>
      </div>

      {/* Filters + daily summary */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48">
          <Input
            label={isAr ? "تاريخ الفواتير" : "Invoice Date"}
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {dateFilter !== dateInputValue(new Date()) && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDateFilter(dateInputValue(new Date()));
              setPage(1);
            }}
          >
            {isAr ? "اليوم" : "Today"}
          </Button>
        )}
        <div className="w-full sm:max-w-sm">
          <Input
            placeholder={
              isAr ? "بحث بالاسم أو الرقم…" : "Search by name or code…"
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {/* Daily total pill */}
        {filteredInvoices.length > 0 && (
          <div className="ms-auto flex items-center gap-2 rounded-lg border border-card-border bg-card px-4 py-2">
            <span className="text-xs text-muted">
              {isAr ? "إجمالي اليوم" : "Day total"}
            </span>
            <span className="text-sm font-bold text-foreground">
              {dailyTotal.toLocaleString(isAr ? "ar-EG" : "en-GB")} EGP
            </span>
          </div>
        )}
      </div>

      {/* Invoices list */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">
            {isAr ? "الفواتير" : "Invoices"}{" "}
            <span className="text-muted font-normal">
              ({filteredInvoices.length})
            </span>
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {filteredInvoices.length === 0 ? (
            <EmptyState
              title={
                search
                  ? isAr
                    ? "لا نتائج"
                    : "No results"
                  : isAr
                    ? "لا توجد فواتير في هذا اليوم"
                    : "No invoices on this day"
              }
            />
          ) : (
            <>
              <div className="divide-y divide-card-border">
                {pagedInvoices.map((invoice) => {
                  const svcs =
                    Array.isArray(invoice.services) &&
                    invoice.services.length > 0
                      ? (invoice.services as InvoiceService[])
                      : [firstService(invoice)];
                  return (
                    <div
                      key={invoice.id}
                      className="px-5 py-3.5 flex items-center gap-4 hover:bg-surface-2 transition-colors"
                    >
                      {/* Patient */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {invoice.patient?.fullName ??
                            (isAr ? "غير معروف" : "Unknown")}
                          {invoice.patient?.code ? (
                            <span className="font-mono text-xs ms-2 bg-surface-2 px-1.5 py-0.5 rounded text-muted">
                              {invoice.patient.code}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {svcs.map((s) => String(s.name)).join(" · ")}
                        </p>
                      </div>

                      {/* Payment badge */}
                      <div className="shrink-0 hidden sm:flex items-center gap-1.5">
                        <span className="text-sm">
                          {paymentIcons[invoice.paymentMethod] ?? ""}
                        </span>
                        <Badge variant="default">
                          {paymentLabels[invoice.paymentMethod] ??
                            invoice.paymentMethod}
                        </Badge>
                      </div>

                      {/* Amount */}
                      <div className="shrink-0 text-end">
                        <p className="text-sm font-bold text-foreground">
                          {Number(invoice.totalAmount).toLocaleString(
                            isAr ? "ar-EG" : "en-GB",
                          )}{" "}
                          EGP
                        </p>
                        <p className="text-xs text-muted">
                          {new Date(invoice.createdAt).toLocaleTimeString(
                            isAr ? "ar-EG" : "en-GB",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => printInvoice(invoice)}
                          title={isAr ? "طباعة" : "Print"}
                        >
                          🖨
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(invoice)}
                        >
                          {isAr ? "تعديل" : "Edit"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={deletePendingId === invoice.id}
                          onClick={() => setDeleteConfirmId(invoice.id)}
                        >
                          {isAr ? "حذف" : "Delete"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-card-border">
                  <span className="text-xs text-muted">
                    {isAr
                      ? `صفحة ${page} من ${totalPages}`
                      : `Page ${page} of ${totalPages}`}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {isAr ? "السابق" : "Prev"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {isAr ? "التالي" : "Next"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Add Invoice Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isAr ? "إضافة فاتورة" : "Add Invoice"}
        description={
          isAr
            ? "إنشاء فاتورة جديدة للمريض"
            : "Create a new invoice for the patient"
        }
        closeLabel={isAr ? "إغلاق" : "Close"}
      >
        <InvoiceFormFields
          isAr={isAr}
          patients={patients}
          patientId={patientId}
          setPatientId={setPatientId}
          patientSearch={patientSearch}
          setPatientSearch={setPatientSearch}
          services={services}
          setServices={setServices}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          formError={formError}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button loading={pending} onClick={() => void submit()}>
            {isAr ? "حفظ الفاتورة" : "Save Invoice"}
          </Button>
          <Button
            variant="secondary"
            loading={pending}
            onClick={() => void submit(true)}
          >
            {isAr ? "حفظ وطباعة" : "Save & Print"}
          </Button>
        </div>
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isAr ? "تعديل الفاتورة" : "Edit Invoice"}
        description={
          isAr ? "تعديل بيانات الفاتورة الحالية" : "Update the current invoice"
        }
        closeLabel={isAr ? "إغلاق" : "Close"}
      >
        <InvoiceFormFields
          isAr={isAr}
          patients={patients}
          patientId={patientId}
          setPatientId={setPatientId}
          patientSearch={patientSearch}
          setPatientSearch={setPatientSearch}
          services={services}
          setServices={setServices}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          formError={formError}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setEditing(null)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button loading={editPending} onClick={() => void submitEdit()}>
            {isAr ? "حفظ التعديل" : "Save Changes"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title={isAr ? "حذف الفاتورة" : "Delete Invoice"}
        description={
          isAr
            ? "هل تريد حذف هذه الفاتورة؟"
            : "Do you want to delete this invoice?"
        }
        closeLabel={isAr ? "إغلاق" : "Close"}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            variant="danger"
            loading={deletePendingId === deleteConfirmId}
            onClick={() =>
              deleteConfirmId ? void deleteInvoice(deleteConfirmId) : undefined
            }
          >
            {isAr ? "حذف" : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
