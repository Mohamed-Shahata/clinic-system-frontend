import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { Badge, Button } from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

type Subscription = {
  id: string;
  plan: { id: string; name: string; price: string; durationDays: number };
  startsAt: string;
  expiresAt: string;
  status: string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  price: string;
  durationDays: number;
};

async function fetchCurrentSubscription(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/billing/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    // التأكد من أن الحالة 200 وأن هناك محتوى
    if (!res.ok || res.status === 204) return null;

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Fetch Error:", error);
    return null;
  }
}

async function fetchSubscriptionPlans(token: string) {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/billing/subscription-plans`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return res.json() as Promise<SubscriptionPlan[]>;
  } catch {
    return [];
  }
}

async function createPaymentRequest(token: string, formData: FormData) {
  "use server";

  const planId = formData.get("planId") as string;
  const transferPhone = formData.get("transferPhone") as string;
  const screenshotUrl = formData.get("screenshotUrl") as string;
  const notes = formData.get("notes") as string;

  const res = await fetch(
    `${getBackendBaseUrl()}/api/billing/subscription-requests`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId,
        transferPhone,
        screenshotUrl,
        notes: notes || undefined,
      }),
    },
  );

  if (!res.ok) {
    throw new Error("Failed to create payment request");
  }

  return res.json();
}

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (!session?.clinicId || session.role !== "DOCTOR_ADMIN")
    redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [subscription, plans] = await Promise.all([
    fetchCurrentSubscription(token),
    fetchSubscriptionPlans(token),
  ]);

  const isExpired =
    subscription && new Date(subscription.expiresAt) < new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "اشتراك العيادة" : "Clinic Subscription"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr ? "إدارة باقة اشتراك العيادة" : "Manage your clinic's subscription plan"}
        </p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "الاشتراك الحالي" : "Current Subscription"}
          </h2>
        </CardHeader>
        <CardBody>
          {subscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{isAr ? "الباقة" : "Plan"}</p>
                  <p className="text-sm text-muted">{subscription.plan.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{isAr ? "السعر" : "Price"}</p>
                  <p className="text-sm text-muted">
                    {subscription.plan.price} EGP
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{isAr ? "الحالة" : "Status"}</p>
                  <Badge variant={isExpired ? "danger" : "success"}>
                    {isExpired ? (isAr ? "منتهي" : "Expired") : (isAr ? "نشط" : "Active")}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isAr ? "يبدأ في" : "Starts At"}
                  </p>
                  <p className="text-sm text-muted">
                    {new Date(subscription.startsAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isAr ? "ينتهي في" : "Expires At"}
                  </p>
                  <p className="text-sm text-muted">
                    {new Date(subscription.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted">{isAr ? "لا يوجد اشتراك نشط." : "No active subscription found."}</p>
          )}
        </CardBody>
      </Card>

      {/* Renew Subscription */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "تجديد الاشتراك" : "Renew Subscription"}
          </h2>
          <p className="text-xs text-muted mt-1">
            {isAr
              ? "أرسل طلب دفع عبر فودافون كاش مع رفع صورة التحويل."
              : "Submit a payment request via Vodafone Cash. Upload a screenshot of the transfer."}
          </p>
        </CardHeader>
        <CardBody>
          <form
            action={createPaymentRequest.bind(null, token)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {isAr ? "اختر الباقة" : "Select Plan"}
                </label>
                <select
                  name="planId"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price} EGP ({plan.durationDays} {isAr ? "يوم" : "days"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {isAr ? "رقم هاتف التحويل" : "Transfer Phone Number"}
                </label>
                <input
                  name="transferPhone"
                  type="tel"
                  required
                  placeholder={isAr ? "01xxxxxxxxx" : "01234567890"}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {isAr ? "رابط صورة التحويل" : "Payment Screenshot URL"}
              </label>
              <input
                name="screenshotUrl"
                type="url"
                required
                placeholder="https://example.com/screenshot.jpg"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {isAr ? "ملاحظات (اختياري)" : "Notes (Optional)"}
              </label>
              <textarea
                name="notes"
                rows={3}
                placeholder={isAr ? "أي ملاحظات إضافية..." : "Any additional notes..."}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
              />
            </div>

            <Button type="submit" className="w-full">
              {isAr ? "إرسال طلب الدفع" : "Submit Payment Request"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
