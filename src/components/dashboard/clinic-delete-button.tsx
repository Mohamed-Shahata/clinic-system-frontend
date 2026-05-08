"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button, useToast } from "@/components/ui";

export function ClinicDeleteButton({
  clinicId,
  clinicName,
}: {
  clinicId: string;
  clinicName: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [pending, setPending] = useState(false);
  const locale = useLocale();
  const isAr = locale === "ar";

  async function remove() {
    setPending(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/status`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast(
          "success",
          isAr
            ? `تم حذف العيادة "${clinicName}" بنجاح`
            : `Clinic "${clinicName}" has been deleted successfully`,
        );
        router.refresh();
      } else {
        addToast(
          "error",
          isAr
            ? `تعذر حذف العيادة "${clinicName}"`
            : `Failed to delete clinic "${clinicName}"`,
        );
      }
    } catch {
      addToast(
        "error",
        isAr
          ? `تعذر حذف العيادة "${clinicName}"`
          : `Failed to delete clinic "${clinicName}"`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      loading={pending}
      onClick={remove}
    >
      {isAr ? "حذف" : "Delete"}
    </Button>
  );
}
