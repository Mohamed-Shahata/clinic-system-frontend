"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button, Modal } from "@/components/ui";
import { CreateClinicForm } from "@/components/dashboard/create-clinic-form";
import { CreateReceptionistForm } from "@/components/dashboard/create-receptionist-form";
import { CreatePatientForm } from "@/components/dashboard/create-patient-form";

type ClinicContext = { clinicName: string; clinicSlug: string };

export function CreateClinicButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === "ar";
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>{isAr ? "إنشاء عيادة" : "Create Clinic"}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={isAr ? "إنشاء عيادة" : "Create Clinic"} description={isAr ? "إنشاء عيادة جديدة ومديرها الأول" : "Create a new clinic and its first admin"} closeLabel={isAr ? "إلغاء" : "Cancel"}>
        <CreateClinicForm onCancel={() => setOpen(false)} onSuccess={() => { setOpen(false); router.refresh(); }} />
      </Modal>
    </>
  );
}

export function CreateReceptionistButton({ clinic }: { clinic: ClinicContext }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === "ar";
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>{isAr ? "إضافة موظف استقبال" : "Create Receptionist"}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={isAr ? "إضافة موظف استقبال" : "Create Receptionist"} description={isAr ? "إضافة حساب موظف استقبال لعيادتك" : "Add a receptionist account to your clinic"} closeLabel={isAr ? "إلغاء" : "Cancel"}>
        <CreateReceptionistForm clinic={clinic} onCancel={() => setOpen(false)} onSuccess={() => router.refresh()} />
      </Modal>
    </>
  );
}

export function CreatePatientButton({ allowMedicalNotes }: { allowMedicalNotes: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === "ar";
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>{isAr ? "إضافة مريض" : "Create Patient"}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={isAr ? "تسجيل مريض" : "Register Patient"} description={isAr ? "إنشاء ملف مريض جديد" : "Create a new patient record"} closeLabel={isAr ? "إلغاء" : "Cancel"}>
        <CreatePatientForm allowMedicalNotes={allowMedicalNotes} onCancel={() => setOpen(false)} onSuccess={() => router.refresh()} />
      </Modal>
    </>
  );
}
