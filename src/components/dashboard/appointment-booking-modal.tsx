"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { AppointmentBookingForm } from "@/components/dashboard/appointment-booking-form";

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

interface AppointmentBookingModalProps {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  locale: string;
}

export function AppointmentBookingModal({
  patients,
  doctors,
  appointments,
  locale,
}: AppointmentBookingModalProps) {
  const [open, setOpen] = useState(false);
  const isAr = locale === "ar";

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary">
        {isAr ? "إضافة حجز" : "Add Booking"}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isAr ? "حجز موعد" : "Book Appointment"}
        description={
          isAr
            ? "اختر المريض والطبيب والوقت"
            : "Select patient, doctor, and time"
        }
        closeLabel={isAr ? "إغلاق" : "Close"}
      >
        <AppointmentBookingForm
          patients={patients}
          doctors={doctors}
          appointments={appointments}
          locale={locale}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
