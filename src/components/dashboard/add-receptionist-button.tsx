"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui";
import { CreateReceptionistForm } from "@/components/dashboard/create-receptionist-form";

interface Props {
  clinic: { clinicName: string; clinicSlug: string };
  isAr: boolean;
}

export function AddReceptionistButton({ clinic, isAr }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:opacity-90 transition-opacity shrink-0"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {isAr ? "إضافة موظف" : "Add Receptionist"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isAr ? "إضافة موظف استقبال" : "Add Receptionist"}
        description={
          isAr
            ? "إضافة حساب موظف استقبال لعيادتك"
            : "Add a receptionist account to your clinic"
        }
        closeLabel={isAr ? "إلغاء" : "Cancel"}
      >
        <CreateReceptionistForm
          clinic={clinic}
          onCancel={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
