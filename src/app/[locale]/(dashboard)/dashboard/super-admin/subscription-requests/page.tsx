import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { Badge, Button } from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

type SubscriptionRequest = {
  id: string;
  clinic: { id: string; name: string; slug: string };
  plan: { id: string; name: string; price: string; durationDays: number };
  requestedBy: { id: string; email: string; fullName: string };
  transferPhone: string;
  screenshotUrl: string;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

async function fetchSubscriptionRequests(token: string, status?: string) {
  try {
    const url = new URL(
      `${getBackendBaseUrl()}/api/billing/subscription-requests`,
    );
    if (status) url.searchParams.set("status", status);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<SubscriptionRequest[]>;
  } catch {
    return [];
  }
}

async function reviewRequest(
  token: string,
  requestId: string,
  approved: boolean,
  formData?: FormData,
) {
  "use server";
  const rejectionReason = formData?.get("rejectionReason");

  const res = await fetch(
    `${getBackendBaseUrl()}/api/billing/subscription-requests/${requestId}/review`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        approved,
        rejectionReason: typeof rejectionReason === "string" ? rejectionReason : undefined,
      }),
    },
  );

  if (!res.ok) {
    throw new Error("Failed to review request");
  }

  revalidatePath("/[locale]/dashboard/super-admin/subscription-requests");
  return res.json();
}

export default async function SubscriptionRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status } = await searchParams;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (!session?.isSuperAdmin) redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const requests = await fetchSubscriptionRequests(token, status);

  const statusLabel = (s: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      PENDING:  { ar: "قيد الانتظار", en: "Pending" },
      APPROVED: { ar: "موافق عليه",   en: "Approved" },
      REJECTED: { ar: "مرفوض",        en: "Rejected" },
    };
    return isAr ? (map[s]?.ar ?? s) : (map[s]?.en ?? s);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "طلبات دفع الاشتراك" : "Subscription Payment Requests"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "مراجعة وقبول طلبات تجديد اشتراك العيادات"
            : "Review and approve clinic subscription renewals"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: undefined, ar: "الكل", en: "All" },
          { key: "PENDING",  ar: "قيد الانتظار", en: "Pending" },
          { key: "APPROVED", ar: "موافق عليه",   en: "Approved" },
          { key: "REJECTED", ar: "مرفوض",        en: "Rejected" },
        ].map((item) => (
          <a
            key={item.key ?? "all"}
            href={
              item.key
                ? `/${locale}/dashboard/super-admin/subscription-requests?status=${item.key}`
                : `/${locale}/dashboard/super-admin/subscription-requests`
            }
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              status === item.key
                ? "bg-primary text-primary-fg"
                : "bg-surface text-foreground hover:bg-surface-2"
            }`}
          >
            {isAr ? item.ar : item.en}
          </a>
        ))}
      </div>

      {/* Requests */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <p className="text-muted">
                {isAr ? "لا توجد طلبات اشتراك." : "No subscription requests found."}
              </p>
            </CardBody>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {request.clinic.name}
                    </h3>
                    <p className="text-sm text-muted">{request.clinic.slug}</p>
                  </div>
                  <Badge
                    variant={
                      request.status === "PENDING"
                        ? "warning"
                        : request.status === "APPROVED"
                          ? "success"
                          : "danger"
                    }
                  >
                    {statusLabel(request.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isAr ? "الباقة" : "Plan"}
                    </p>
                    <p className="text-sm text-muted">
                      {request.plan.name} - {request.plan.price} {isAr ? "ج.م" : "EGP"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isAr ? "طلب بواسطة" : "Requested By"}
                    </p>
                    <p className="text-sm text-muted">
                      {request.requestedBy.fullName} ({request.requestedBy.email})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isAr ? "رقم هاتف التحويل" : "Transfer Phone"}
                    </p>
                    <p className="text-sm text-muted">
                      {request.transferPhone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isAr ? "تاريخ الطلب" : "Created"}
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(request.createdAt).toLocaleDateString(
                        isAr ? "ar-EG" : "en-GB",
                      )}
                    </p>
                  </div>
                </div>

                {request.notes && (
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isAr ? "ملاحظات" : "Notes"}
                    </p>
                    <p className="text-sm text-muted">{request.notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    {isAr ? "لقطة الدفع" : "Screenshot"}
                  </p>
                  <img
                    src={request.screenshotUrl}
                    alt={isAr ? "لقطة شاشة الدفع" : "Payment screenshot"}
                    className="max-w-sm rounded-lg border"
                  />
                </div>

                {request.status === "PENDING" && (
                  <div className="flex gap-2 pt-4 border-t flex-wrap">
                    <form
                      action={reviewRequest.bind(null, token, request.id, true)}
                    >
                      <Button type="submit" variant="primary" size="sm">
                        {isAr ? "قبول" : "Approve"}
                      </Button>
                    </form>
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        await reviewRequest(token, request.id, false, formData);
                      }}
                    >
                      <div className="flex gap-2">
                        <input
                          name="rejectionReason"
                          placeholder={isAr ? "سبب الرفض" : "Rejection reason"}
                          className="px-3 py-1 text-sm border rounded"
                        />
                        <Button type="submit" variant="danger" size="sm">
                          {isAr ? "رفض" : "Reject"}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
