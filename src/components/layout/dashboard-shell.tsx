"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import type { SessionClaims } from "@/lib/auth/verify-token";

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
    setOpen(value !== "false");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dashboard-sidebar-open", String(open));
  }, [open]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay — tap to close */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ──
          Desktop: always rendered, width switches between 256px (open) and 56px (icon-only)
          Mobile:  slides in/out from left                                                    */}
      <aside
        style={{ width: open ? 256 : undefined }}
        className={[
          "bg-sidebar shrink-0 flex flex-col border-r border-white/5 transition-[width,transform] duration-300 ease-out overflow-hidden",
          // desktop: visible at all times, width collapses to icon rail
          "md:relative md:translate-x-0",
          open
            ? "fixed inset-y-0 left-0 z-50 w-64 shadow-2xl md:shadow-none md:z-auto"
            : "fixed inset-y-0 left-0 z-50 -translate-x-full md:translate-x-0 md:w-14",
        ].join(" ")}
      >
        {/* inner div keeps content at min-width so icons don't squish */}
        <div
          className="flex flex-col h-full"
          style={{ minWidth: open ? 256 : 56 }}
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
        {/* Desktop open-sidebar button — shown only when sidebar is collapsed on md+ screens */}
        {!open && (
          <button
            type="button"
            aria-label={isAr ? "فتح القائمة الجانبية" : "Open sidebar"}
            onClick={() => setOpen(true)}
            className="hidden md:inline-flex fixed top-3 left-2 z-50 h-8 w-8 items-center justify-center rounded bg-surface border border-border text-foreground hover:bg-surface-2 transition-colors shadow-sm"
          >
            <svg
              width="16"
              height="16"
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

        {/* Mobile top-bar: shown only when sidebar is hidden on mobile */}
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label={isAr ? "فتح القائمة" : "Open menu"}
            onClick={() => setOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-foreground hover:bg-surface-2 transition-colors"
          >
            {/* Hamburger icon */}
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
          {/* Mini logo */}
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-6 py-6 text-start">
          {children}
        </main>
      </div>
    </div>
  );
}
