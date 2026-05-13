"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  patient: { fullName: string; code: string; phone?: string | null };
  doctor: { id: string; fullName: string };
  visitType?: string | null;
  notes?: string | null;
};

type Doctor = { id: string; fullName: string; specialty: string | null };

const ALLOWED_STATUSES = ["IN_QUEUE", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const lang = locale === "ar" ? "ar-EG" : "en-GB";
  return date.toLocaleString(lang, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale === "ar",
  });
}

export function ReceptionistAppointmentsSchedule({
  appointments: initialAppointments,
  doctors,
  locale,
}: {
  appointments: Appointment[];
  doctors: Doctor[];
  locale: string;
}) {
  const isAr = locale === "ar";
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState(initialAppointments);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [editDoctorId, setEditDoctorId] = useState("");
  const [editVisitType, setEditVisitType] = useState("NEW_VISIT");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [filterDate, setFilterDate] = useState(todayStr);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Poll for queue updates every 15 seconds
  const editingRef = useRef(editing);
  editingRef.current = editing;
  useEffect(() => {
    const interval = setInterval(async () => {
      if (editingRef.current) return;
      try {
        const res = await fetch("/api/appointments", { cache: "no-store" });
        if (!res.ok) return;
        const fresh = (await res.json()) as Appointment[];
        setAppointments(fresh);
      } catch {
        // silent
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const statusLabels: Record<string, string> = {
    IN_QUEUE: isAr ? "قيد الانتظار" : "Waiting",
    IN_PROGRESS: isAr ? "قيد التنفيذ" : "In Progress",
    COMPLETED: isAr ? "مكتمل" : "Completed",
    CANCELLED: isAr ? "ملغي" : "Cancelled",
  };

  const statusVariant = (
    status: string,
  ): "default" | "success" | "warning" | "danger" | "muted" => {
    if (status === "COMPLETED") return "success";
    if (status === "IN_PROGRESS") return "warning";
    if (status === "IN_QUEUE") return "default";
    if (status === "CANCELLED") return "danger";
    return "default";
  };

  const filteredAppointments = useMemo(() => {
    const base = appointments.filter((a) =>
      ALLOWED_STATUSES.includes(a.status),
    );
    if (!filterDate) return base;
    return base.filter((a) => {
      const d = new Date(a.startsAt).toISOString().slice(0, 10);
      return d === filterDate;
    });
  }, [appointments, filterDate]);

  function openEditModal(appointment: Appointment) {
    setEditing(appointment);
    setEditDoctorId(appointment.doctor.id);
    setEditVisitType(appointment.visitType ?? "NEW_VISIT");
    setEditNotes(appointment.notes ?? "");
    setEditError(null);
  }

  function closeEditModal() {
    setEditing(null);
    setEditError(null);
  }

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
          status === "CANCELLED"
            ? isAr
              ? "تعذر إلغاء الموعد"
              : "Could not cancel appointment"
            : isAr
              ? "تعذر تحديث الحالة"
              : "Could not update status",
        );
        return;
      }
      setAppointments((current) =>
        current.map((item) =>
          item.id === appointmentId ? { ...item, status } : item,
        ),
      );
      const messages: Record<string, string> = {
        CANCELLED: isAr ? "تم إلغاء الموعد" : "Appointment cancelled",
        IN_QUEUE: isAr ? "تم إرسال المريض للطبيب" : "Patient sent to doctor",
        IN_PROGRESS: isAr ? "تم بدء الموعد" : "Appointment started",
        COMPLETED: isAr ? "تم إكمال الموعد" : "Appointment completed",
      };
      addToast(
        "success",
        messages[status] ?? (isAr ? "تم التحديث" : "Updated"),
      );
    } finally {
      setActionPendingId(null);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setEditError(null);
    setSavePending(true);
    try {
      // Queue bookings are not time-based, so editing only changes doctor/type/notes.
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
      const updatedAppointment = (await res.json()) as Appointment;
      setAppointments((current) =>
        current.map((item) =>
          item.id === updatedAppointment.id ? updatedAppointment : item,
        ),
      );
      addToast("success", isAr ? "تم تحديث الموعد" : "Appointment updated");
      closeEditModal();
    } finally {
      setSavePending(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "الجدول" : "Schedule"}
            </h2>
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
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="px-5 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {appointment.patient.fullName}
                    </p>
                    <p className="text-xs text-muted">
                      {mounted
                        ? formatDateTime(appointment.startsAt, locale)
                        : ""}{" "}
                      · {appointment.doctor.fullName}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(appointment.status)}>
                      {statusLabels[appointment.status] ?? appointment.status}
                    </Badge>

                    {!["COMPLETED", "CANCELLED"].includes(
                      appointment.status,
                    ) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={savePending && editing?.id === appointment.id}
                        onClick={() => openEditModal(appointment)}
                      >
                        {isAr ? "تعديل" : "Edit"}
                      </Button>
                    )}

                    {!["COMPLETED", "CANCELLED"].includes(
                      appointment.status,
                    ) && (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={actionPendingId === appointment.id}
                        onClick={() => setCancelConfirmId(appointment.id)}
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={closeEditModal}
        title={isAr ? "تعديل الموعد" : "Edit Appointment"}
        description={
          isAr
            ? "غيّر وقت الموعد أو الطبيب والملاحظات"
            : "Change time, doctor, or notes"
        }
        closeLabel={isAr ? "إغلاق" : "Close"}
      >
        {editError && <Alert variant="error">{editError}</Alert>}
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "الطبيب" : "Doctor"}
            </label>
            <select
              value={editDoctorId}
              onChange={(e) => setEditDoctorId(e.target.value)}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            >
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.fullName} -{" "}
                  {doctor.specialty ?? (isAr ? "عام" : "General")}
                </option>
              ))}
            </select>
          </div>
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
            <Button type="button" variant="ghost" onClick={closeEditModal}>
              {isAr ? "إغلاق" : "Close"}
            </Button>
            <Button
              type="button"
              loading={savePending}
              onClick={() => void saveEdit()}
            >
              {isAr ? "حفظ" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

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
    </>
  );
}
