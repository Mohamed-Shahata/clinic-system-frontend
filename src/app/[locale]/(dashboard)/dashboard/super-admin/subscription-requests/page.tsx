import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SubscriptionRequestsClient } from "@/components/dashboard/subscription-requests-client";

export type SubscriptionRequest = {
  id: string;
  clinic: { id: string; name: string; slug: string };
  plan: { id: string; name: string; price: string; durationDays: number };
  requestedBy: {
    id: string;
    email: string | null;
    phone: string | null;
    fullName: string;
  };
  reviewedBy?: { id: string; fullName: string } | null;
  transferPhone: string;
  screenshotUrl: string;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

async function fetchRequests(
  token: string,
  status?: string,
): Promise<SubscriptionRequest[]> {
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
    return res.json();
  } catch {
    return [];
  }
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
  const session = await getSessionFromCookies();
  if (!session?.isSuperAdmin) redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";
  const requests = await fetchRequests(token, status);

  return (
    <SubscriptionRequestsClient
      locale={locale}
      initialRequests={requests}
      currentStatus={status}
    />
  );
}
