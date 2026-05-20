"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import type { SessionClaims } from "@/lib/auth/verify-token";
import { NotificationBell } from "../dashboard/notification-bell";
import { PWAInstallBanner } from "../ui/pwa-install";

interface DashboardShellProps {
  children: ReactNode;
  locale: string;
  claims: SessionClaims | null;
  currentPath: string;
}

export function DashboardShell({
  children,
  locale,
  claims,
  currentPath,
}: DashboardShellProps) {
  const isAr = locale === "ar";
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const value = window.localStorage.getItem("dashboard-sidebar-open");
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    setOpen(desktop ? value !== "false" : false);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dashboard-sidebar-open", String(open));
  }, [open]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{ width: open ? 256 : undefined }}
        className={[
          "bg-sidebar shrink-0 flex flex-col border-e border-white/5 transition-[width,transform] duration-300 ease-out overflow-hidden",
          "md:relative md:translate-x-0",
          open
            ? [
                "fixed inset-y-0 z-50 w-64 shadow-2xl md:shadow-none md:z-auto",
                isAr ? "right-0 md:right-auto" : "left-0 md:left-auto",
              ].join(" ")
            : [
                "fixed inset-y-0 z-50 md:translate-x-0 md:w-16",
                isAr
                  ? "right-0 translate-x-full md:right-auto"
                  : "left-0 -translate-x-full md:left-auto",
              ].join(" "),
        ].join(" ")}
      >
        <div
          className="flex flex-col h-full"
          style={{ minWidth: open ? 256 : 64 }}
        >
          <SidebarNav
            locale={locale}
            claims={claims}
            currentPath={currentPath}
            collapsed={!open}
            onToggle={() => setOpen((v) => !v)}
          />
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Top bar — hidden for RECEPTIONIST role ── */}
        {(claims?.role as string | undefined) !== "RECEPTIONIST" && (
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 shrink-0">
            <div className="flex items-center gap-2">
              {/* Mobile hamburger */}
              <button
                type="button"
                aria-label={isAr ? "فتح القائمة" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-surface-2 transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              {/* Desktop sidebar toggle — visible on md+ when sidebar is collapsed */}
              {!open && (
                <button
                  type="button"
                  aria-label={isAr ? "فتح القائمة الجانبية" : "Open sidebar"}
                  onClick={() => setOpen(true)}
                  className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-2 transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              )}

              {/* Mobile mini logo */}
              <div className="md:hidden h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <rect
                    x="9"
                    y="2"
                    width="6"
                    height="20"
                    rx="1.5"
                    fill="white"
                  />
                  <rect
                    x="2"
                    y="9"
                    width="20"
                    height="6"
                    rx="1.5"
                    fill="white"
                  />
                </svg>
              </div>
            </div>

            {/* Right side: notification bell */}
            <div className="flex items-center gap-2">
              {(claims?.role as string | undefined) !== "RECEPTIONIST" && (
                <NotificationBell locale={locale} />
              )}
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto px-6 py-6 text-start">
          {children}
        </main>
      </div>
      <PWAInstallBanner isAr={isAr} />
    </div>
  );
}
