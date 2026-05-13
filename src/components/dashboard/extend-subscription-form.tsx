"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Alert,
  Badge,
} from "@/components/ui";

type Clinic = {
  id: string;
  name: string;
  slug: string;
  subscription?: {
    expiresAt: string;
    status: string;
    plan?: { name: string };
  } | null;
};

export function ExtendSubscriptionForm({
  initialClinics = [],
}: {
  initialClinics?: Clinic[];
}) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [clinics, setClinics] = useState<Clinic[]>(initialClinics);
  const [clinicsLoading, setClinicsLoading] = useState(false);

  const [mode, setMode] = useState<"all" | "specific">("specific");
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [days, setDays] = useState("30");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");

  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ extended: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialClinics.length > 0) return;
    setClinicsLoading(true);
    void fetch("/api/clinics")
      .then(async (r) => {
        if (!r.ok) {
          console.error('[extend-subscription-form] Client fetch failed:', {
            status: r.status,
            statusText: r.statusText,
          });
          return [];
        }
        const data = await r.json();
        return data;
      })
      .then((data) => setClinics(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('[extend-subscription-form] Client fetch error:', err);
        setClinics([]);
      })
      .finally(() => setClinicsLoading(false));
  }, [initialClinics.length]);

  const filteredClinics = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const daysNum = Number(days);
    if (!daysNum || daysNum < 1 || daysNum > 3650) {
      setError(
        isAr ? "أدخل عدد أيام صحيح (1 - 3650)" : "Enter valid days (1 - 3650)",
      );
      return;
    }
    if (mode === "specific" && !selectedClinicId) {
      setError(isAr ? "اختر عيادة أولاً" : "Please select a clinic first");
      return;
    }

    const confirmMsg =
      mode === "all"
        ? isAr
          ? `هل أنت متأكد من إضافة ${daysNum} يوم لجميع العيادات (${clinics.length} عيادة)؟`
          : `Add ${daysNum} days to ALL ${clinics.length} clinics?`
        : isAr
          ? `هل أنت متأكد من إضافة ${daysNum} يوم للعيادة المختارة؟`
          : `Add ${daysNum} days to the selected clinic?`;

    if (!window.confirm(confirmMsg)) return;

    setPending(true);
    try {
      const body: Record<string, unknown> = { days: daysNum };
      if (reason.trim()) body.reason = reason.trim();
      if (mode === "specific") body.clinicId = selectedClinicId;

      const res = await fetch("/api/billing/extend-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : isAr
              ? "حدث خطأ"
              : "Something went wrong",
        );
        return;
      }
      setResult(data as { extended: number });
      setDays("30");
      setReason("");
      setSelectedClinicId("");
    } finally {
      setPending(false);
    }
  }

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "نطاق التمديد" : "Extension Scope"}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {isAr
              ? "اختر هل تريد تمديد عيادة واحدة أم جميع العيادات"
              : "Choose whether to extend one clinic or all clinics"}
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("specific")}
              className={`rounded-xl border-2 px-5 py-4 text-start transition-all focus:outline-none ${
                mode === "specific"
                  ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                  : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    mode === "specific" ? "border-primary" : "border-border"
                  }`}
                >
                  {mode === "specific" && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <span
                  className={`text-sm font-semibold ${mode === "specific" ? "text-primary" : "text-foreground"}`}
                >
                  {isAr ? "عيادة محددة" : "Specific Clinic"}
                </span>
              </div>
              <p className="text-xs text-muted ms-6">
                {isAr
                  ? "اختر عيادة واحدة فقط لتمديد اشتراكها"
                  : "Extend subscription for one selected clinic"}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-xl border-2 px-5 py-4 text-start transition-all focus:outline-none ${
                mode === "all"
                  ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                  : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    mode === "all" ? "border-primary" : "border-border"
                  }`}
                >
                  {mode === "all" && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <span
                  className={`text-sm font-semibold ${mode === "all" ? "text-primary" : "text-foreground"}`}
                >
                  {isAr ? "جميع العيادات" : "All Clinics"}
                </span>
              </div>
              <p className="text-xs text-muted ms-6">
                {isAr
                  ? `تمديد كل العيادات دفعة واحدة (${clinics.length} عيادة)`
                  : `Extend all clinics at once (${clinics.length} clinics)`}
              </p>
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Clinic picker — only shown in specific mode */}
      {mode === "specific" && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "اختر العيادة" : "Select Clinic"}
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input
              placeholder={
                isAr
                  ? "ابحث بالاسم أو الـ slug..."
                  : "Search by name or slug..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {clinicsLoading ? (
              <div className="text-sm text-muted animate-pulse py-4 text-center">
                {isAr ? "جاري تحميل العيادات..." : "Loading clinics..."}
              </div>
            ) : filteredClinics.length === 0 ? (
              <div className="text-sm text-muted py-4 text-center">
                {isAr ? "لا توجد نتائج" : "No results"}
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-card-border rounded-lg border border-border">
                {filteredClinics.map((clinic) => {
                  const isSelected = selectedClinicId === clinic.id;
                  const expiry = clinic.subscription?.expiresAt
                    ? new Date(clinic.subscription.expiresAt)
                    : null;
                  const isExpired = expiry ? expiry < new Date() : true;
                  return (
                    <button
                      key={clinic.id}
                      type="button"
                      onClick={() => setSelectedClinicId(clinic.id)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-start hover:bg-surface-2 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                              isSelected ? "border-primary" : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <p
                            className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}
                          >
                            {clinic.name}
                          </p>
                        </div>
                        <p className="font-mono text-xs text-muted ms-5">
                          {clinic.slug}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        {clinic.subscription ? (
                          <>
                            <Badge variant={isExpired ? "danger" : "success"}>
                              {isExpired
                                ? isAr
                                  ? "منتهي"
                                  : "Expired"
                                : isAr
                                  ? "نشط"
                                  : "Active"}
                            </Badge>
                            <p className="text-xs text-muted mt-0.5">
                              {expiry?.toLocaleDateString()}
                            </p>
                          </>
                        ) : (
                          <Badge variant="muted">
                            {isAr ? "بدون اشتراك" : "No plan"}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedClinic && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                ✓{" "}
                {isAr
                  ? `تم اختيار: ${selectedClinic.name}`
                  : `Selected: ${selectedClinic.name}`}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Days + reason + submit */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "تفاصيل التمديد" : "Extension Details"}
          </h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {/* Quick preset buttons */}
            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wide">
                {isAr ? "مدة سريعة" : "Quick select"}
              </label>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 60, 90, 180, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(String(d))}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                      days === String(d)
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-border bg-surface text-foreground hover:border-primary/50"
                    }`}
                  >
                    {d} {isAr ? "يوم" : "d"}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={isAr ? "عدد الأيام" : "Number of days"}
              type="number"
              min={1}
              max={3650}
              required
              value={days}
              onChange={(e) => setDays(e.target.value)}
              hint={
                isAr
                  ? "الأيام ستُضاف فوق تاريخ انتهاء الاشتراك الحالي"
                  : "Days will be added on top of the current expiry date"
              }
            />

            <Input
              label={isAr ? "سبب التمديد (اختياري)" : "Reason (optional)"}
              placeholder={
                isAr
                  ? "مثال: هدية رمضان، مناسبة خاصة..."
                  : "e.g. Ramadan gift, special occasion..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            {/* Summary */}
            <div className="rounded-xl border border-border bg-surface-2/60 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                {isAr ? "ملخص" : "Summary"}
              </p>
              <p className="text-sm text-foreground">
                {isAr ? "إضافة " : "Add "}
                <span className="font-bold text-primary">
                  {days || "—"} {isAr ? "يوم" : "days"}
                </span>{" "}
                {mode === "all"
                  ? isAr
                    ? `لجميع العيادات (${clinics.length})`
                    : `to all clinics (${clinics.length})`
                  : selectedClinic
                    ? isAr
                      ? `لعيادة: ${selectedClinic.name}`
                      : `to clinic: ${selectedClinic.name}`
                    : isAr
                      ? "— لم تختر عيادة بعد"
                      : "— no clinic selected yet"}
              </p>
              {reason.trim() && (
                <p className="text-xs text-muted">
                  {isAr ? "السبب: " : "Reason: "}
                  {reason.trim()}
                </p>
              )}
            </div>

            {error && <Alert variant="error">{error}</Alert>}
            {result && (
              <Alert variant="success">
                {isAr
                  ? `✓ تم تمديد ${result.extended} عيادة بنجاح`
                  : `✓ Successfully extended ${result.extended} clinic(s)`}
              </Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={pending}>
                {isAr ? "تطبيق التمديد" : "Apply Extension"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
