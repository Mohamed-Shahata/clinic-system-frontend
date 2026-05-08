"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Input } from "@/components/ui";

type Plan = {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  price: string;
  isActive: boolean;
};

export function SubscriptionPlansAdmin({ locale }: { locale: string }) {
  const isAr = locale === "ar";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDays, setNewDays] = useState("30");
  const [newPrice, setNewPrice] = useState("0");

  async function load() {
    setError(null);
    const res = await fetch("/api/billing/subscription-plans/manage");
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      setError(isAr ? "تعذر تحميل الباقات." : "Could not load plans.");
      return;
    }
    setPlans(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPlan() {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/billing/subscription-plans/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode.trim() || undefined,
        name: newName.trim(),
        durationDays: Number(newDays || 0),
        price: Number(newPrice || 0),
        isActive: true,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      setError(isAr ? "تعذر إنشاء الباقة." : "Could not create plan.");
      return;
    }
    setNewCode("");
    setNewName("");
    setNewDays("30");
    setNewPrice("0");
    await load();
  }

  async function savePlan(plan: Plan) {
    setSavingId(plan.id);
    setError(null);
    await fetch(`/api/billing/subscription-plans/manage/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: plan.name,
        durationDays: plan.durationDays,
        price: Number(plan.price),
        isActive: plan.isActive,
      }),
    }).catch(() => null);
    setSavingId(null);
    await load();
  }

  async function deletePlan(plan: Plan) {
    const confirmMsg = isAr
      ? `هل أنت متأكد من حذف باقة "${plan.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to delete the plan "${plan.name}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(plan.id);
    setError(null);
    try {
      const res = await fetch(`/api/billing/subscription-plans/manage/${plan.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.message === "string"
            ? data.message
            : isAr ? "تعذر حذف الباقة." : "Could not delete plan.",
        );
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      }
    } catch {
      setError(isAr ? "تعذر حذف الباقة." : "Could not delete plan.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">
          {isAr ? "باقات الاشتراك" : "Subscription plans"}
        </h2>
        <p className="text-xs text-muted">
          {isAr ? "حدّث الأسعار والمدة أو أنشئ باقة جديدة أو احذف باقة." : "Update pricing and duration, create or delete plans."}
        </p>
      </CardHeader>
      <CardBody className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">{isAr ? "إضافة باقة" : "Add plan"}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={isAr ? "رمز الباقة (اختياري)" : "Plan code (optional)"}
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder={isAr ? "مثل: PLAN_90D" : "e.g. PLAN_90D"}
            />
            <Input
              label={isAr ? "اسم الباقة" : "Plan name"}
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              label={isAr ? "المدة (أيام)" : "Duration (days)"}
              type="number"
              min={1}
              value={newDays}
              onChange={(e) => setNewDays(e.target.value)}
            />
            <Input
              label={isAr ? "السعر (ج.م)" : "Price (EGP)"}
              type="number"
              min={0}
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
          </div>
          <Button type="button" onClick={() => void createPlan()} loading={creating}>
            {isAr ? "إنشاء الباقة" : "Create plan"}
          </Button>
        </div>

        {plans.length === 0 ? (
          <p className="text-sm text-muted">{isAr ? "لا توجد باقات بعد." : "No plans yet."}</p>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-card-border p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-mono text-muted">{plan.code}</p>
                  <label className="flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={plan.isActive}
                      onChange={(e) =>
                        setPlans((current) =>
                          current.map((p) =>
                            p.id === plan.id ? { ...p, isActive: e.target.checked } : p,
                          ),
                        )
                      }
                    />
                    {plan.isActive
                      ? isAr ? "نشط" : "Active"
                      : isAr ? "معطل" : "Inactive"}
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    label={isAr ? "اسم الباقة" : "Plan name"}
                    value={plan.name}
                    onChange={(e) =>
                      setPlans((current) =>
                        current.map((p) =>
                          p.id === plan.id ? { ...p, name: e.target.value } : p,
                        ),
                      )
                    }
                  />
                  <Input
                    label={isAr ? "المدة (أيام)" : "Duration (days)"}
                    type="number"
                    min={1}
                    value={String(plan.durationDays)}
                    onChange={(e) =>
                      setPlans((current) =>
                        current.map((p) =>
                          p.id === plan.id
                            ? { ...p, durationDays: Number(e.target.value || 0) }
                            : p,
                        ),
                      )
                    }
                  />
                  <Input
                    label={isAr ? "السعر (ج.م)" : "Price (EGP)"}
                    type="number"
                    min={0}
                    step="0.01"
                    value={plan.price}
                    onChange={(e) =>
                      setPlans((current) =>
                        current.map((p) =>
                          p.id === plan.id ? { ...p, price: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    loading={savingId === plan.id}
                    onClick={() => void savePlan(plan)}
                  >
                    {isAr ? "حفظ التعديلات" : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    loading={deletingId === plan.id}
                    onClick={() => void deletePlan(plan)}
                  >
                    {isAr ? "حذف الباقة" : "Delete plan"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
