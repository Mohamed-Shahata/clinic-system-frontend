import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ToastProvider } from "@/components/ui/toast";
import { TokenRefresher } from "@/components/dashboard/token-refresher";
import { headers } from "next/headers";
import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params;
  const claims = await getSessionFromCookies();
  const hdrs = await headers();
  const currentPath = hdrs.get("x-pathname") ?? "";

  return (
    <DashboardShell locale={locale} claims={claims} currentPath={currentPath}>
      <TokenRefresher />
      <ToastProvider>
        <div className="mx-auto max-w-5xl">{children}</div>
      </ToastProvider>
    </DashboardShell>
  );
}
