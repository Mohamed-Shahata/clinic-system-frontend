"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, useMemo } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  useToast,
} from "@/components/ui";

type Patient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string | null;
};
type Doctor = { id: string; fullName: string; specialty: string | null };
type Appointment = {
  id: string;
  doctor: { id: string };
  startsAt: string;
  endsAt: string;
  status: string;
};

export function AppointmentBookingForm({
  patients,
  doctors,
  appointments,
  locale,
  onSuccess,
}: {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  locale: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [visitType, setVisitType] = useState("NEW_VISIT");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [quickPending, setQuickPending] = useState(false);

  const bookedTimes = useMemo(() => {
    const times = new Set<string>();
    appointments.forEach((apt) => {
      if (["CANCELLED", "NO_SHOW"].includes(apt.status)) return;
      if (apt.doctor.id !== doctorId) return;
      const start = new Date(apt.startsAt);
      const pad = (n: number) => n.toString().padStart(2, "0");
      times.add(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
    });
    return times;
  }, [appointments, doctorId]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredPatients = patients.filter((p) => {
    if (!normalizedSearch) return true;
    const searchText = `${p.fullName} ${p.phone ?? ""} ${p.code}`.toLowerCase();
    return searchText.includes(normalizedSearch);
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    const nextSearchText = value.trim().toLowerCase();
    const nextFiltered = patients.filter((p) => {
      if (!nextSearchText) return true;
      return `${p.fullName} ${p.phone ?? ""} ${p.code}`
        .toLowerCase()
        .includes(nextSearchText);
    });
    if (nextFiltered.length > 0) {
      if (!nextFiltered.some((p) => p.id === patientId)) {
        setPatientId(nextFiltered[0].id);
      }
    } else {
      setPatientId("");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const [hours, minutes] = startsAt.split(":").map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        addToast(
          "error",
          isAr ? "يرجى اختيار وقت صالح" : "Please select a valid time",
        );
        return;
      }
      const start = new Date();
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start.getTime() + 60 * 1000);

      if (bookedTimes.has(startsAt)) {
        addToast(
          "error",
          isAr
            ? "هذا الوقت محجوز بالفعل للطبيب المحدد"
            : "This time slot is already booked for the selected doctor",
        );
        return;
      }

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorId,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          visitType,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        addToast(
          "error",
          data.message ??
            (isAr ? "تعذر حجز الموعد" : "Could not book appointment"),
        );
        return;
      }
      setStartsAt("");
      setNotes("");
      setOpen(false);
      addToast(
        "success",
        isAr ? "تم حجز الموعد بنجاح" : "Appointment booked successfully",
      );
      onSuccess?.();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function sendToDoctorNow() {
    setQuickPending(true);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + 60 * 1000);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorId,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          visitType: "WALK_IN",
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!res.ok || !data.id) {
        addToast(
          "error",
          data.message ??
            (isAr
              ? "تعذر إرسال المريض للطبيب"
              : "Could not send patient to doctor"),
        );
        return;
      }
      await fetch(`/api/appointments/${data.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_QUEUE" }),
      });
      setOpen(false);
      addToast(
        "success",
        isAr ? "تم إرسال المريض للطبيب" : "Patient sent to doctor",
      );
      onSuccess?.();
      router.refresh();
    } finally {
      setQuickPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">
          {isAr ? "حجز موعد" : "Book Appointment"}
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "البحث عن مريض" : "Search patient"}
            </label>
            <Input
              value={search}
              placeholder={
                isAr ? "اكتب اسم أو هاتف المريض" : "Type patient name or phone"
              }
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "المريض" : "Patient"}
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            >
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.phone ? `(${p.phone})` : `(${p.code})`}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  {isAr ? "لا يوجد مرضى مطابقين" : "No matching patients"}
                </option>
              )}
            </select>
          </div>
          {doctors.length > 1 ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {isAr ? "الطبيب" : "Doctor"}
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                required
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} - {d.specialty ?? (isAr ? "عام" : "General")}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Input
            label={isAr ? "الوقت" : "Time"}
            type="time"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "نوع الزيارة" : "Visit Type"}
            </label>
            <select
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="submit" loading={pending} variant="secondary">
              {isAr ? "حجز" : "Book"}
            </Button>
            <Button
              type="button"
              loading={quickPending}
              onClick={() => void sendToDoctorNow()}
            >
              {isAr ? "إرسال للطبيب" : "Send to Doctor"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
