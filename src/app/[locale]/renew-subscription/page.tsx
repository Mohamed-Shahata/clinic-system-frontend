import { SubscriptionClientPage } from "@/components/dashboard/subscription-client-page";
import { getBackendBaseUrl } from "@/lib/backend-url";

type Plan = {
  id: string;
  name: string;
  price: string;
  durationDays: number;
  description?: string;
  features?: string[];
};

async function getPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/billing/subscription-plans`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function RenewSubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const plans = await getPlans();

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-background p-6">
      <section className="mx-auto w-full max-w-5xl">
        <SubscriptionClientPage
          locale={locale}
          initialSubscription={null}
          plans={plans}
          publicRenewal
        />
      </section>
    </main>
  );
}
