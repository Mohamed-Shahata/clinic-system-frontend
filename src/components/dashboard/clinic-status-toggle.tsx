"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "next-intl";
import { Button, useToast } from "@/components/ui";

export function ClinicStatusToggle({
  clinicId,
  isActive,
}: {
  clinicId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [pending, setPending] = useState(false);
  const locale = useLocale();
  const isAr = locale === "ar";

  async function updateStatus() {
    setPending(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        addToast(
          "success",
          isAr
            ? isActive
              ? "تم إيقاف العيادة بنجاح"
              : "تم تفعيل العيادة بنجاح"
            : `Clinic ${isActive ? "suspended" : "activated"} successfully`,
        );
        router.refresh();
      } else {
        addToast(
          "error",
          isAr
            ? isActive
              ? "تعذر إيقاف العيادة"
              : "تعذر تفعيل العيادة"
            : `Failed to ${isActive ? "suspend" : "activate"} clinic`,
        );
      }
    } catch {
      addToast(
        "error",
        isAr
          ? isActive
            ? "تعذر إيقاف العيادة"
            : "تعذر تفعيل العيادة"
          : `Failed to ${isActive ? "suspend" : "activate"} clinic`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={isActive ? "danger" : "secondary"}
      loading={pending}
      onClick={() => void updateStatus()}
    >
      {isActive
        ? isAr ? "إيقاف" : "Suspend"
        : isAr ? "تفعيل" : "Activate"}
    </Button>
  );
}
