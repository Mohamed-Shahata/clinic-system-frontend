"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Input } from "@/components/ui";

type Patient = { id: string; code: string; fullName: string };

export function InvoiceForm({ patients }: { patients: Patient[] }) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [serviceName, setServiceName] = useState("Consultation");
  const [amount, setAmount] = useState("300");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          paymentMethod,
          services: [{ name: serviceName, amount: Number(amount) }],
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? "Could not create invoice");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader><h2 className="text-sm font-semibold text-foreground">Create Invoice</h2></CardHeader>
      <CardBody>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Patient</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required className="w-full rounded border border-border bg-surface px-3 py-2 text-sm">
              {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.code})</option>)}
            </select>
          </div>
          <Input label="Service" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
          <Input label="Amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Payment</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm">
              <option value="cash">Cash</option>
              <option value="vodafone_cash">Vodafone Cash</option>
            </select>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" loading={pending} className="w-full">Create Invoice</Button>
        </form>
      </CardBody>
    </Card>
  );
}
