"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function AppointmentStatusButton({
  appointmentId,
  status,
  label,
}: {
  appointmentId: string;
  status: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function update() {
    setPending(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return <Button size="sm" variant="secondary" loading={pending} onClick={() => void update()}>{label}</Button>;
}
