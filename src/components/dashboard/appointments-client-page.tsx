"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
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

type Patient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string | null;
};
type Doctor = {
  id: string;
  fullName: string;
  specialty: string | null;
  consultationFee?: string | number | null;
  followUpFee?: string | number | null;
};
type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  patient?: {
    id: string;
    fullName: string;
    code: string;
    phone?: string | null;
  } | null;
  doctor?: { id: string; fullName: string } | null;
  visitType?: string | null;
  notes?: string | null;
};
type SimilarPatient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string | null;
};

const ALLOWED_STATUSES = ["IN_QUEUE", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const STATUS_FILTERS = ["ALL", ...ALLOWED_STATUSES];

function generatePatientCode() {
  return "PT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function tr(isAr: boolean, ar: string, en: string) {
  return isAr ? ar : en;
}

function isTripleName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 3 && parts.every((part) => part.length >= 2);
}

function validatePatientCode(value: string, isAr: boolean) {
  if (!value.trim()) return tr(isAr, "كود المريض مطلوب", "Patient code is required");
  if (value.length < 2 || value.length > 32 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return tr(
      isAr,
      "كود المريض يجب أن يكون 2-32 حرفًا أو رقمًا، ويسمح بـ _ و - فقط",
      "Patient code must be 2-32 letters or numbers, with only _ and - allowed",
    );
  }
  return null;
}

function validatePhone(value: string, isAr: boolean) {
  const phone = value.trim();
  if (!phone) return tr(isAr, "رقم الهاتف مطلوب", "Phone number is required");
  if (!/^\+?[0-9\s-]{8,20}$/.test(phone)) {
    return tr(
      isAr,
      "رقم الهاتف غير صالح، أدخل 8 إلى 20 رقمًا",
      "Phone number is invalid, enter 8 to 20 digits",
    );
  }
  return null;
}

function patientErrorMessage(message: unknown, isAr: boolean) {
  const text = Array.isArray(message)
    ? message.join(" ")
    : String(message ?? "");
  const lower = text.toLowerCase();
  if (text.includes("ثلاثي") || text.includes("isTripleName") || lower.includes("full name")) {
    return tr(
      isAr,
      "الاسم يجب أن يكون ثلاثياً على الأقل (مثال: محمد علي حسن)",
      "Full name must be at least 3 words (e.g. Mohamed Ali Hassan)",
    );
  }
  if (text.includes("code") || text.includes("^[A-Za-z0-9_-]+$")) {
    return tr(
      isAr,
      "كود المريض مطلوب ويجب أن يكون من 2 إلى 32 حرفًا أو رقمًا فقط",
      "Patient code is required and must be 2-32 letters, numbers, underscores, or hyphens",
    );
  }
  if (text.includes("phone") || text.includes("هاتف")) {
    return tr(isAr, "رقم الهاتف مطلوب وغير صالح", "A valid phone number is required");
  }
  if (text.includes("dateOfBirth")) {
    return isAr ? "تاريخ الميلاد غير صالح" : "Date of birth is invalid";
  }
  if (lower.includes("already exists") || lower.includes("unique") || lower.includes("duplicate")) {
    return tr(
      isAr,
      "هذا الكود أو رقم الهاتف مسجل بالفعل — جرب كود آخر أو ابحث عن المريض",
      "This code or phone is already registered — try another code or search for the patient",
    );
  }
  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("cannot reach") ||
    lower.includes("econnrefused")
  ) {
    return tr(isAr, "خطأ في الاتصال بالخادم — تحقق من الاتصال", "Network error — check your connection");
  }
  return typeof message === "string" && message
    ? message
    : isAr
      ? "تعذر إنشاء المريض"
      : "Could not create patient";
}

function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale === "ar",
  });
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPastAppointmentDay(iso: string) {
  return dateInputValue(new Date(iso)) < dateInputValue(new Date());
}

/* ─────────────────────────────────────────────
   Stepper header component
───────────────────────────────────────────── */
function StepperHeader({
  steps,
  currentStep,
  isAr,
}: {
  steps: string[];
  currentStep: number;
  isAr: boolean;
}) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, idx) => {
        const done = idx < currentStep;
        const active = idx === currentStep;
        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                  done
                    ? "border-primary bg-primary text-white"
                    : active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted",
                ].join(" ")}
              >
                {done ? "✓" : idx + 1}
              </div>
              <span
                className={[
                  "mt-1 text-xs whitespace-nowrap",
                  active ? "text-primary font-medium" : "text-muted",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={[
                  "flex-1 h-0.5 mx-2 mb-4 transition-colors",
                  done ? "bg-primary" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export function AppointmentsClientPage({
  patients: initialPatients,
  doctors,
  appointments: initialAppointments,
  locale,
  canViewPatientFile = true,
}: {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  locale: string;
  canViewPatientFile?: boolean;
}) {
  const isAr = locale === "ar";
  const { addToast } = useToast();

  const [appointments, setAppointments] = useState(initialAppointments);
  const [patients, setPatients] = useState(initialPatients);
  const [mounted, setMounted] = useState(false);
  const todayStr = dateInputValue(new Date());
  const [filterDate, setFilterDate] = useState(todayStr);
  const [filterStatus, setFilterStatus] = useState("ALL");
  // لو في دكتور واحد بس، فلترة تلقائية عليه — لو أكتر بيبقى ALL
  const [filterDoctorId, setFilterDoctorId] = useState(
    doctors.length === 1 ? doctors[0].id : "ALL",
  );

  useEffect(() => setMounted(true), []);

  // ── live polling ──────────────────────────────────────────
  const editingRef = useRef<Appointment | null>(null);
  useEffect(() => {
    async function loadAppointments() {
      if (editingRef.current) return;
      try {
        const params = new URLSearchParams({ date: filterDate });
        if (filterStatus !== "ALL") params.set("status", filterStatus);
        if (filterDoctorId !== "ALL") params.set("doctorId", filterDoctorId);
        const res = await fetch(`/api/appointments?${params.toString()}`, {
          cache: "no-store",
        });
        if (res.ok) setAppointments((await res.json()) as Appointment[]);
      } catch {
        /* silent */
      }
    }
    void loadAppointments();
    const interval = setInterval(() => void loadAppointments(), 15000);
    return () => clearInterval(interval);
  }, [filterDate, filterStatus, filterDoctorId]);

  // ── BOOKING MODAL STATE ───────────────────────────────────
  const [bookingOpen, setBookingOpen] = useState(false);

  /**
   * step 0 = "Patient check" (does the patient exist?)
   * step 1 = "Create patient" (only if new)
   * step 2 = "Book appointment"
   * step 3 = "Invoice"
   *
   * Flow A (existing patient): 0 → 2 → 3
   * Flow B (new patient):       0 → 1 → 2 → 3
   */
  type BookingStep = 0 | 1 | 2 | 3;
  const [step, setStep] = useState<BookingStep>(0);
  const [patientFlow, setPatientFlow] = useState<"existing" | "new">(
    "existing",
  );

  // Step 0 — patient check
  const [checkSearch, setCheckSearch] = useState("");
  const [similarPatients, setSimilarPatients] = useState<SimilarPatient[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Step 1 — create patient
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState(generatePatientCode);
  const [newPhone, setNewPhone] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newNameError, setNewNameError] = useState<string | null>(null);
  const [newCodeError, setNewCodeError] = useState<string | null>(null);
  const [newPhoneError, setNewPhoneError] = useState<string | null>(null);
  const [newAgeError, setNewAgeError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Similar patients found during step 1
  const [step1Similar, setStep1Similar] = useState<SimilarPatient[]>([]);
  const [step1SimilarChecked, setStep1SimilarChecked] = useState(false);
  const [step1SimilarLoading, setStep1SimilarLoading] = useState(false);

  // Step 2 — booking
  const [bDoctorId, setBDoctorId] = useState(doctors[0]?.id ?? "");
  const [bVisitType, setBVisitType] = useState("NEW_VISIT");
  const [bComplaint, setBComplaint] = useState("");
  const [bNotes, setBNotes] = useState("");
  const [bPending, setBPending] = useState(false);
  const [bError, setBError] = useState<string | null>(null);
  const [bookedAppointmentId, setBookedAppointmentId] = useState<string | null>(
    null,
  );

  // Step 3 — invoice
  const [invServices, setInvServices] = useState<
    { name: string; amount: string }[]
  >([{ name: "Consultation", amount: "300" }]);
  const [invPaymentMethod, setInvPaymentMethod] = useState("cash");
  const [invPending, setInvPending] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);
  const [skipInvoice, setSkipInvoice] = useState(false);

  const invTotal = invServices.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0,
  );

  function defaultFee(doctorId = bDoctorId, visitType = bVisitType) {
    const doctor = doctors.find((d) => d.id === doctorId) ?? doctors[0];
    const fee =
      visitType === "FOLLOW_UP" ? doctor?.followUpFee : doctor?.consultationFee;
    return String(fee ?? (visitType === "FOLLOW_UP" ? 150 : 300));
  }

  function openBooking() {
    setStep(0);
    setPatientFlow("existing");
    setCheckSearch("");
    setSimilarPatients([]);
    setSelectedPatient(null);
    setNewName("");
    setNewCode(generatePatientCode());
    setNewPhone("");
    setNewAge("");
    setNewNameError(null);
    setNewCodeError(null);
    setNewPhoneError(null);
    setNewAgeError(null);
    setCreateError(null);
    setStep1Similar([]);
    setStep1SimilarChecked(false);
    setBDoctorId(doctors[0]?.id ?? "");
    setBVisitType("NEW_VISIT");
    setBComplaint("");
    setBNotes("");
    setBError(null);
    setBookedAppointmentId(null);
    setInvServices([
      {
        name: "Consultation",
        amount: defaultFee(doctors[0]?.id ?? "", "NEW_VISIT"),
      },
    ]);
    setInvPaymentMethod("cash");
    setInvError(null);
    setSkipInvoice(false);
    setBookingOpen(true);
  }

  // ── Step 0: search existing patients ─────────────────────
  const filteredExisting = useMemo(() => {
    const q = checkSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.fullName} ${p.phone ?? ""} ${p.code}`.toLowerCase().includes(q),
    );
  }, [patients, checkSearch]);

  async function searchSimilar(name: string) {
    if (name.trim().length < 2) {
      setSimilarPatients([]);
      return;
    }
    setSimilarLoading(true);
    try {
      const res = await fetch(
        `/api/patients/similar?name=${encodeURIComponent(name)}`,
      );
      if (res.ok) setSimilarPatients((await res.json()) as SimilarPatient[]);
    } finally {
      setSimilarLoading(false);
    }
  }

  // ── Step 1: fuzzy check before creating ──────────────────
  async function checkSimilarBeforeCreate(name: string) {
    if (name.trim().length < 2) {
      setStep1Similar([]);
      setStep1SimilarChecked(false);
      return;
    }
    setStep1SimilarLoading(true);
    try {
      const res = await fetch(
        `/api/patients/similar?name=${encodeURIComponent(name)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as SimilarPatient[];
        setStep1Similar(data);
        setStep1SimilarChecked(true);
      }
    } finally {
      setStep1SimilarLoading(false);
    }
  }

  async function submitCreatePatient() {
    setCreateError(null);
    setNewNameError(null);
    setNewCodeError(null);
    setNewPhoneError(null);
    setNewAgeError(null);

    let hasError = false;
    if (!isTripleName(newName)) {
      setNewNameError(
        isAr
          ? "الاسم يجب أن يكون ثلاثياً على الأقل (مثال: محمد علي حسن)"
          : "Full name must be at least 3 words (e.g. Mohamed Ali Hassan)",
      );
      hasError = true;
    }
    const codeError = validatePatientCode(newCode, isAr);
    if (codeError) {
      setNewCodeError(codeError);
      hasError = true;
    }
    const phoneError = validatePhone(newPhone, isAr);
    if (phoneError) {
      setNewPhoneError(phoneError);
      hasError = true;
    }
    const parsedAge = newAge ? Number(newAge) : null;
    if (
      parsedAge !== null &&
      (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 130)
    ) {
      setNewAgeError(isAr ? "يرجى إدخال سن صحيح بين 0 و 130" : "Please enter a valid age from 0 to 130");
      hasError = true;
    }
    if (hasError) return;
    setCreatePending(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          fullName: newName.trim(),
          phone: newPhone.trim(),
          dateOfBirth: parsedAge
            ? `${new Date().getFullYear() - parsedAge}-01-01`
            : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: unknown;
        };
        setCreateError(patientErrorMessage(data.message, isAr));
        return;
      }
      const patient = (await res.json()) as Patient;
      setPatients((prev) => [patient, ...prev]);
      setSelectedPatient(patient);
      addToast("success", isAr ? "تم إنشاء المريض بنجاح" : "Patient created");
      setStep(2);
    } finally {
      setCreatePending(false);
    }
  }

  // ── Step 2: submit booking ────────────────────────────────
  async function submitBooking() {
    setBError(null);
    if (!selectedPatient) {
      setBError(isAr ? "لم يتم تحديد مريض" : "No patient selected");
      return;
    }
    setBPending(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          doctorId: bDoctorId,
          visitType: bVisitType,
          notes:
            [bComplaint.trim(), bNotes.trim()].filter(Boolean).join("\n") ||
            undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setBError(
          data.message ??
            (isAr ? "تعذر حجز الموعد" : "Could not book appointment"),
        );
        return;
      }
      const newApt = (await res.json()) as Appointment & { id: string };
      setAppointments((prev) => [...prev, newApt]);
      setBookedAppointmentId(newApt.id);
      addToast("success", isAr ? "تم حجز الموعد" : "Appointment booked");
      setStep(3);
    } finally {
      setBPending(false);
    }
  }

  // ── Step 3: submit invoice ────────────────────────────────
  async function submitInvoice() {
    setInvError(null);
    if (!selectedPatient) return;
    const amount = Number(invServices[0]?.amount) || 0;
    if (amount <= 0) {
      setInvError(
        isAr ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount",
      );
      return;
    }
    setInvPending(true);
    try {
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          paymentMethod: invPaymentMethod,
          services: [{ name: "Consultation", amount }],
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setInvError(
          data.message ??
            (isAr ? "تعذر إنشاء الفاتورة" : "Could not create invoice"),
        );
        return;
      }
      addToast("success", isAr ? "تم إنشاء الفاتورة" : "Invoice created");
      setBookingOpen(false);
    } finally {
      setInvPending(false);
    }
  }

  // ── Schedule / edit state ─────────────────────────────────
  const [editing, setEditing] = useState<Appointment | null>(null);
  editingRef.current = editing;
  const [editDoctorId, setEditDoctorId] = useState("");
  const [editVisitType, setEditVisitType] = useState("NEW_VISIT");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const todayAppointments = useMemo(
    () =>
      appointments.filter(
        (a) => dateInputValue(new Date(a.startsAt)) === todayStr,
      ),
    [appointments, todayStr],
  );
  const qWaiting = todayAppointments.filter(
    (a) => a.status === "IN_QUEUE",
  ).length;
  const qProgress = todayAppointments.filter(
    (a) => a.status === "IN_PROGRESS",
  ).length;
  const qCompleted = todayAppointments.filter(
    (a) => a.status === "COMPLETED",
  ).length;
  const qCancelled = todayAppointments.filter(
    (a) => a.status === "CANCELLED",
  ).length;

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((a) => ALLOWED_STATUSES.includes(a.status))
      .filter((a) => filterStatus === "ALL" || a.status === filterStatus)
      .filter((a) => dateInputValue(new Date(a.startsAt)) === filterDate)
      .filter(
        (a) => filterDoctorId === "ALL" || a.doctor?.id === filterDoctorId,
      );
  }, [appointments, filterDate, filterStatus, filterDoctorId]);

  const statusLabels: Record<string, string> = {
    IN_QUEUE: isAr ? "قيد الانتظار" : "Waiting",
    IN_PROGRESS: isAr ? "قيد التنفيذ" : "In Progress",
    COMPLETED: isAr ? "مكتمل" : "Completed",
    CANCELLED: isAr ? "ملغي" : "Cancelled",
  };
  const statusVariant = (
    s: string,
  ): "default" | "success" | "warning" | "danger" | "muted" => {
    if (s === "COMPLETED") return "success";
    if (s === "IN_PROGRESS") return "warning";
    if (s === "IN_QUEUE") return "default";
    if (s === "CANCELLED") return "danger";
    return "default";
  };

  async function updateStatus(appointmentId: string, status: string) {
    setActionPendingId(appointmentId);
    setCancelConfirmId(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        addToast(
          "error",
          isAr ? "تعذر تحديث الحالة" : "Could not update status",
        );
        return;
      }
      setAppointments((cur) =>
        cur.map((item) =>
          item.id === appointmentId ? { ...item, status } : item,
        ),
      );
      const msgs: Record<string, string> = {
        CANCELLED: isAr ? "تم إلغاء الموعد" : "Appointment cancelled",
        IN_QUEUE: isAr ? "تم إرسال المريض للطبيب" : "Patient sent to doctor",
        IN_PROGRESS: isAr ? "تم بدء الموعد" : "Appointment started",
        COMPLETED: isAr ? "تم إكمال الموعد" : "Appointment completed",
      };
      addToast("success", msgs[status] ?? (isAr ? "تم التحديث" : "Updated"));
    } finally {
      setActionPendingId(null);
    }
  }

  function openEdit(a: Appointment) {
    setEditing(a);
    setEditDoctorId(a.doctor?.id ?? doctors[0]?.id ?? "");
    setEditVisitType(a.visitType ?? "NEW_VISIT");
    setEditNotes(a.notes ?? "");
    setEditError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    setEditError(null);
    setSavePending(true);
    try {
      const res = await fetch(`/api/appointments/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: editDoctorId,
          visitType: editVisitType,
          notes: editNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setEditError(
          data.message ??
            (isAr ? "تعذر تحديث الموعد" : "Could not update appointment"),
        );
        return;
      }
      const updated = (await res.json()) as Appointment;
      setAppointments((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x)),
      );
      addToast("success", isAr ? "تم تحديث الموعد" : "Appointment updated");
      setEditing(null);
    } finally {
      setSavePending(false);
    }
  }

  // ── Stepper labels ────────────────────────────────────────
  const stepsExisting = isAr
    ? ["المريض", "الحجز", "الفاتورة"]
    : ["Patient", "Booking", "Invoice"];
  const stepsNew = isAr
    ? ["المريض", "إنشاء مريض", "الحجز", "الفاتورة"]
    : ["Patient", "Create Patient", "Booking", "Invoice"];

  // Map internal step numbers to stepper visual step
  // existing flow: step 0=0, step 2=1, step 3=2
  // new flow:      step 0=0, step 1=1, step 2=2, step 3=3
  function visualStep(): number {
    if (patientFlow === "existing") {
      if (step === 0) return 0;
      if (step === 2) return 1;
      return 2; // step 3
    } else {
      if (step === 0) return 0;
      if (step === 1) return 1;
      if (step === 2) return 2;
      return 3;
    }
  }

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "المواعيد" : "Appointments"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {isAr
              ? "إدارة الحجز، تسجيل الوصول والطابور"
              : "Booking, check-in, and queue management"}
          </p>
        </div>
        <Button
          onClick={openBooking}
          className="bg-primary text-white hover:bg-primary/90"
        >
          {isAr ? "إضافة حجز" : "Add Booking"}
        </Button>
      </div>

      {/* Queue status */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">
            {isAr ? "حالة الطابور — اليوم" : "Today's Queue Status"}
          </h2>
        </CardHeader>
        <CardBody className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              count: qWaiting,
              label: isAr ? "قيد الانتظار" : "Waiting",
              cls: "yellow",
            },
            {
              count: qProgress,
              label: isAr ? "قيد التنفيذ" : "In Progress",
              cls: "blue",
            },
            {
              count: qCompleted,
              label: isAr ? "مكتمل" : "Completed",
              cls: "green",
            },
            {
              count: qCancelled,
              label: isAr ? "ملغي" : "Cancelled",
              cls: "red",
            },
          ].map(({ count, label, cls }) => (
            <div
              key={label}
              className={`text-center p-3 rounded-lg bg-${cls}-500/10 border border-${cls}-500/20`}
            >
              <p className={`text-xl font-bold text-${cls}-600`}>{count}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "الجدول" : "Schedule"}
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted shrink-0">
                  {isAr ? "التاريخ" : "Date"}
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="flex-1 min-w-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-2 ring-primary/30 transition-shadow"
                />
                {filterDate !== todayStr && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFilterDate(todayStr)}
                    className="shrink-0"
                  >
                    {isAr ? "اليوم" : "Today"}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted shrink-0">
                  {isAr ? "الحالة" : "Status"}
                </label>
                <div className="relative flex-1 min-w-0">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-1.5 pe-7 text-xs text-foreground outline-none focus:ring-2 ring-primary/30 transition-shadow cursor-pointer"
                  >
                    {STATUS_FILTERS.map((status) => (
                      <option key={status} value={status}>
                        {status === "ALL"
                          ? isAr
                            ? "كل الحالات"
                            : "All statuses"
                          : (statusLabels[status] ?? status)}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-muted">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* ── Doctor filter — يظهر بس لو في أكتر من دكتور ── */}
              {doctors.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted shrink-0">
                    {isAr ? "الطبيب" : "Doctor"}
                  </label>
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={filterDoctorId}
                      onChange={(e) => setFilterDoctorId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-1.5 pe-7 text-xs text-foreground outline-none focus:ring-2 ring-primary/30 transition-shadow cursor-pointer"
                    >
                      <option value="ALL">
                        {isAr ? "كل الأطباء" : "All Doctors"}
                      </option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName}
                          {d.specialty ? ` — ${d.specialty}` : ""}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-muted">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {filteredAppointments.length === 0 ? (
            <EmptyState
              title={
                filterDate !== todayStr
                  ? isAr
                    ? "لا توجد مواعيد في هذا اليوم"
                    : "No appointments on this day"
                  : isAr
                    ? "لا توجد مواعيد اليوم"
                    : "No appointments today"
              }
            />
          ) : (
            <div className="divide-y divide-card-border">
              {filteredAppointments.map((apt) => {
                const locked = isPastAppointmentDay(apt.startsAt);
                return (
                  <div
                    key={apt.id}
                    className="px-5 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {apt.patient?.fullName ??
                          (isAr ? "مريض غير محدد" : "No patient")}
                      </p>
                      <p className="text-xs text-muted">
                        {mounted ? formatDateTime(apt.startsAt, locale) : ""} ·{" "}
                        {apt.doctor?.fullName ??
                          (isAr ? "طبيب غير محدد" : "No doctor")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(apt.status)}>
                        {statusLabels[apt.status] ?? apt.status}
                      </Badge>
                      {locked && (
                        <Badge variant="muted">
                          {isAr ? "مغلق" : "Locked"}
                        </Badge>
                      )}
                      {apt.patient?.id && canViewPatientFile && (
                        <Link
                          href={`/${locale}/dashboard/doctor-admin/patients/${apt.patient.id}`}
                          className="inline-flex h-8 items-center rounded border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors"
                        >
                          {isAr ? "ملف المريض" : "Patient file"}
                        </Link>
                      )}
                      {!locked &&
                        !["COMPLETED", "CANCELLED", "IN_PROGRESS"].includes(
                          apt.status,
                        ) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={savePending && editing?.id === apt.id}
                            onClick={() => openEdit(apt)}
                          >
                            {isAr ? "تعديل" : "Edit"}
                          </Button>
                        )}
                      {!locked &&
                        !["COMPLETED", "CANCELLED"].includes(apt.status) && (
                          <Button
                            size="sm"
                            variant="danger"
                            loading={actionPendingId === apt.id}
                            onClick={() => setCancelConfirmId(apt.id)}
                          >
                            {isAr ? "إلغاء" : "Cancel"}
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Booking Modal (Stepper) ── */}
      <Modal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title={isAr ? "إضافة حجز جديد" : "New Booking"}
        description={
          isAr
            ? "اتبع الخطوات لإنشاء حجز كامل"
            : "Follow the steps to complete the booking"
        }
        closeLabel={isAr ? "إغلاق" : "Close"}
      >
        {/* Stepper header */}
        <StepperHeader
          steps={patientFlow === "new" ? stepsNew : stepsExisting}
          currentStep={visualStep()}
          isAr={isAr}
        />

        {/* ── STEP 0: Patient check ── */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {isAr
                ? 'ابحث عن المريض أولًا — لو مش موجود اضغط "مريض جديد"'
                : 'Search for the patient first — if not found, press "New Patient"'}
            </p>

            <Input
              label={
                isAr
                  ? "بحث بالاسم أو الهاتف أو الرقم"
                  : "Search by name, phone, or code"
              }
              placeholder={isAr ? "اكتب للبحث..." : "Type to search..."}
              value={checkSearch}
              onChange={(e) => {
                setCheckSearch(e.target.value);
                void searchSimilar(e.target.value);
              }}
            />

            {/* Existing patients list */}
            {filteredExisting.length > 0 && checkSearch.trim().length > 0 && (
              <div className="rounded-lg border border-border divide-y divide-border max-h-52 overflow-y-auto">
                {filteredExisting.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientFlow("existing");
                      setStep(2);
                    }}
                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-surface-2 transition-colors text-start"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {p.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {p.fullName}
                      </p>
                      <p className="text-xs text-muted">
                        {p.code}
                        {p.phone ? ` · ${p.phone}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Similar warning */}
            {similarLoading && (
              <p className="text-xs text-muted">
                {isAr
                  ? "جاري البحث عن أسماء مشابهة..."
                  : "Checking for similar names..."}
              </p>
            )}
            {!similarLoading &&
              similarPatients.length > 0 &&
              checkSearch.trim().length > 0 &&
              filteredExisting.filter(
                (p) => !similarPatients.find((s) => s.id === p.id),
              ).length === 0 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <p className="text-xs font-semibold text-yellow-600 mb-2">
                    ⚠️{" "}
                    {isAr
                      ? "أسماء مشابهة موجودة — ربما هو نفس المريض:"
                      : "Similar names found — may be the same patient:"}
                  </p>
                  <div className="space-y-1">
                    {similarPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p as Patient);
                          setPatientFlow("existing");
                          setStep(2);
                        }}
                        className="w-full flex items-center gap-2 rounded px-2 py-1.5 hover:bg-yellow-500/10 text-start"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {p.fullName}
                        </span>
                        <span className="text-xs text-muted">({p.code})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Empty state */}
            {checkSearch.trim().length > 0 &&
              filteredExisting.length === 0 &&
              !similarLoading && (
                <div className="rounded-lg border border-border bg-surface-2 p-4 text-center">
                  <p className="text-sm text-muted">
                    {isAr
                      ? "لا يوجد مريض بهذا الاسم"
                      : "No patient found with this name"}
                  </p>
                </div>
              )}

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setPatientFlow("new");
                  setNewName(checkSearch);
                  setNewCode(generatePatientCode());
                  setStep1SimilarChecked(false);
                  setStep1Similar([]);
                  setStep(1);
                }}
              >
                + {isAr ? "مريض جديد" : "New Patient"}
              </Button>
              <Button variant="ghost" onClick={() => setBookingOpen(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Create new patient ── */}
        {step === 1 && (
          <div className="space-y-4">
            {createError && <Alert variant="error">{createError}</Alert>}

            <Input
              label={isAr ? "الاسم الكامل *" : "Full Name *"}
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (newNameError) {
                  setNewNameError(
                    isTripleName(e.target.value)
                      ? null
                      : isAr
                        ? "الاسم يجب أن يكون ثلاثياً على الأقل (مثال: محمد علي حسن)"
                        : "Full name must be at least 3 words (e.g. Mohamed Ali Hassan)",
                  );
                }
                setStep1SimilarChecked(false);
              }}
              onBlur={() => void checkSimilarBeforeCreate(newName)}
              placeholder={isAr ? "اسم المريض" : "Patient name"}
              error={newNameError ?? undefined}
            />

            {/* Similar warning in create step */}
            {step1SimilarLoading && (
              <p className="text-xs text-muted">
                {isAr
                  ? "جاري التحقق من التشابه..."
                  : "Checking for duplicates..."}
              </p>
            )}
            {step1SimilarChecked && step1Similar.length > 0 && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                <p className="text-xs font-semibold text-yellow-600 mb-2">
                  ⚠️{" "}
                  {isAr
                    ? "مرضى بأسماء مشابهة موجودون — هل تريد استخدام أحدهم؟"
                    : "Patients with similar names exist — do you want to use one?"}
                </p>
                <div className="space-y-1">
                  {step1Similar.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(p as Patient);
                        setPatientFlow("existing");
                        setStep(2);
                      }}
                      className="w-full flex items-center gap-2 rounded px-2 py-1.5 hover:bg-yellow-500/10 text-start"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {p.fullName}
                      </span>
                      <span className="text-xs text-muted">
                        ({p.code}) {p.phone ?? ""}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-2">
                  {isAr
                    ? "لو مش نفس الشخص، أكمل إنشاء مريض جديد."
                    : "If this is a different person, continue creating a new patient."}
                </p>
              </div>
            )}

            <Input
              label={isAr ? "كود المريض *" : "Patient Code *"}
              value={newCode}
              onChange={(e) => {
                setNewCode(e.target.value);
                if (newCodeError) {
                  setNewCodeError(validatePatientCode(e.target.value, isAr));
                }
              }}
              onBlur={(e) => setNewCodeError(validatePatientCode(e.target.value, isAr))}
              minLength={2}
              maxLength={32}
              placeholder="PT-ABC123"
              error={newCodeError ?? undefined}
            />
            <Input
              label={isAr ? "رقم الهاتف *" : "Phone *"}
              value={newPhone}
              onChange={(e) => {
                setNewPhone(e.target.value);
                if (newPhoneError) {
                  setNewPhoneError(validatePhone(e.target.value, isAr));
                }
              }}
              onBlur={(e) => setNewPhoneError(validatePhone(e.target.value, isAr))}
              placeholder={isAr ? "01xxxxxxxxx" : "01xxxxxxxxx"}
              required
              error={newPhoneError ?? undefined}
            />
            <Input
              label={isAr ? "السن" : "Age"}
              type="number"
              value={newAge}
              min={0}
              max={130}
              onChange={(e) => {
                setNewAge(e.target.value);
                if (newAgeError) {
                  const age = e.target.value ? Number(e.target.value) : null;
                  setNewAgeError(
                    age !== null &&
                      (!Number.isInteger(age) || age < 0 || age > 130)
                      ? isAr
                        ? "يرجى إدخال سن صحيح بين 0 و 130"
                        : "Please enter a valid age from 0 to 130"
                      : null,
                  );
                }
              }}
              placeholder={isAr ? "مثال: 30" : "Example: 30"}
              error={newAgeError ?? undefined}
            />

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(0)}>
                ← {isAr ? "رجوع" : "Back"}
              </Button>
              <Button
                loading={createPending}
                onClick={() => void submitCreatePatient()}
              >
                {isAr ? "إنشاء المريض" : "Create Patient"}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Booking ── */}
        {step === 2 && (
          <div className="space-y-4">
            {bError && <Alert variant="error">{bError}</Alert>}

            {/* Selected patient card */}
            {selectedPatient && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {selectedPatient.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPatient.fullName}
                  </p>
                  <p className="text-xs text-muted">
                    {selectedPatient.code}
                    {selectedPatient.phone ? ` · ${selectedPatient.phone}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="ms-auto text-xs text-muted hover:text-foreground"
                  onClick={() => setStep(0)}
                >
                  {isAr ? "تغيير" : "Change"}
                </button>
              </div>
            )}

            {/* Doctor */}
            {doctors.length > 1 ? (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  {isAr ? "الطبيب" : "Doctor"}
                </label>
                <select
                  value={bDoctorId}
                  onChange={(e) => {
                    setBDoctorId(e.target.value);
                    setInvServices([
                      {
                        name: "Consultation",
                        amount: defaultFee(e.target.value, bVisitType),
                      },
                    ]);
                  }}
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} — {d.specialty ?? (isAr ? "عام" : "General")}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {isAr ? "نوع الزيارة" : "Visit Type"}
              </label>
              <select
                value={bVisitType}
                onChange={(e) => {
                  setBVisitType(e.target.value);
                  setInvServices([
                    {
                      name: "Consultation",
                      amount: defaultFee(bDoctorId, e.target.value),
                    },
                  ]);
                }}
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="NEW_VISIT">
                  {isAr ? "زيارة جديدة" : "New visit"}
                </option>
                <option value="FOLLOW_UP">
                  {isAr ? "متابعة" : "Follow up"}
                </option>
                <option value="CONSULTATION">
                  {isAr ? "استشارة" : "Consultation"}
                </option>
              </select>
            </div>

            <Input
              label={isAr ? "الشكوى" : "Complaint"}
              value={bComplaint}
              onChange={(e) => setBComplaint(e.target.value)}
              placeholder={isAr ? "مثال: ألم في الظهر" : "Example: back pain"}
            />
            <Input
              label={isAr ? "ملاحظات إضافية" : "Additional Notes"}
              value={bNotes}
              onChange={(e) => setBNotes(e.target.value)}
            />

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(patientFlow === "new" ? 1 : 0)}
              >
                ← {isAr ? "رجوع" : "Back"}
              </Button>
              <Button loading={bPending} onClick={() => void submitBooking()}>
                {isAr ? "تأكيد الحجز" : "Confirm Booking"} →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Invoice ── */}
        {step === 3 && (
          <div className="space-y-4">
            {invError && <Alert variant="error">{invError}</Alert>}

            {/* Success banner */}
            <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2.5">
              <span className="text-green-500 text-lg">✓</span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isAr ? "تم حجز الموعد بنجاح!" : "Appointment booked!"}
                </p>
                <p className="text-xs text-muted">
                  {isAr
                    ? "الآن يمكنك إنشاء فاتورة أو تخطيها"
                    : "You can now create an invoice or skip"}
                </p>
              </div>
            </div>

            {/* Amount */}
            <Input
              label={isAr ? "المبلغ (EGP)" : "Amount (EGP)"}
              type="number"
              min="0"
              placeholder="0"
              value={invServices[0]?.amount ?? ""}
              onChange={(e) =>
                setInvServices([
                  { name: "Consultation", amount: e.target.value },
                ])
              }
            />

            {/* Payment method */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                {isAr ? "طريقة الدفع" : "Payment Method"}
              </label>
              <div className="flex gap-2">
                {[
                  { value: "cash", labelAr: "نقدي", labelEn: "Cash" },
                  {
                    value: "vodafone_cash",
                    labelAr: "فودافون كاش",
                    labelEn: "Vodafone Cash",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInvPaymentMethod(opt.value)}
                    className={[
                      "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                      invPaymentMethod === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-muted hover:bg-surface-2",
                    ].join(" ")}
                  >
                    {isAr ? opt.labelAr : opt.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setBookingOpen(false)}>
                {isAr ? "تخطي الفاتورة" : "Skip Invoice"}
              </Button>
              <Button loading={invPending} onClick={() => void submitInvoice()}>
                {isAr ? "إنشاء فاتورة" : "Create Invoice"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isAr ? "تعديل الموعد" : "Edit Appointment"}
        description={
          isAr ? "غيّر نوع الزيارة والملاحظات" : "Change visit type or notes"
        }
        closeLabel={isAr ? "إغلاق" : "Close"}
      >
        {editError && <Alert variant="error">{editError}</Alert>}
        <div className="space-y-4 mt-2">
          {doctors.length > 1 ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {isAr ? "الطبيب" : "Doctor"}
              </label>
              <select
                value={editDoctorId}
                onChange={(e) => setEditDoctorId(e.target.value)}
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.specialty ?? (isAr ? "عام" : "General")}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "نوع الزيارة" : "Visit Type"}
            </label>
            <select
              value={editVisitType}
              onChange={(e) => setEditVisitType(e.target.value)}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="NEW_VISIT">
                {isAr ? "زيارة جديدة" : "New visit"}
              </option>
              <option value="FOLLOW_UP">{isAr ? "متابعة" : "Follow up"}</option>
              <option value="CONSULTATION">
                {isAr ? "استشارة" : "Consultation"}
              </option>
            </select>
          </div>
          <Input
            label={isAr ? "الملاحظات" : "Notes"}
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {isAr ? "إغلاق" : "Close"}
            </Button>
            <Button loading={savePending} onClick={() => void saveEdit()}>
              {isAr ? "حفظ" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Cancel Confirm ── */}
      <Modal
        open={Boolean(cancelConfirmId)}
        onClose={() => setCancelConfirmId(null)}
        title={isAr ? "تأكيد الإلغاء" : "Confirm Cancellation"}
        description={
          isAr
            ? "هل أنت متأكد من إلغاء هذا الموعد؟"
            : "Are you sure you want to cancel this appointment?"
        }
        closeLabel={isAr ? "إغلاق" : "Close"}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setCancelConfirmId(null)}>
            {isAr ? "لا، تراجع" : "No, go back"}
          </Button>
          <Button
            variant="danger"
            loading={actionPendingId === cancelConfirmId}
            onClick={() =>
              cancelConfirmId && void updateStatus(cancelConfirmId, "CANCELLED")
            }
          >
            {isAr ? "نعم، إلغاء الموعد" : "Yes, cancel it"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
