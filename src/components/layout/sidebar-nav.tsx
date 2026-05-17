"use client";

import { useTranslations } from "next-intl";
import type { SessionClaims } from "@/lib/auth/verify-token";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { BiPhone } from "react-icons/bi";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export function getNavItems(
  locale: string,
  claims: SessionClaims | null,
  t: (key: string) => string,
): NavItem[] {
  if (!claims) return [];

  if (claims.isSuperAdmin) {
    return [
      {
        href: `/${locale}/dashboard/super-admin`,
        label: t("overview"),
        icon: <GridIcon />,
      },
      {
        href: `/${locale}/dashboard/super-admin/clinics`,
        label: t("clinics"),
        icon: <BuildingIcon />,
      },
      {
        href: `/${locale}/dashboard/super-admin/directory`,
        label: t("directory"),
        icon: <UsersIcon />,
      },
      {
        href: `/${locale}/dashboard/super-admin/subscription-requests`,
        label: t("paymentRequests"),
        icon: <MoneyIcon />,
      },
      {
        href: `/${locale}/dashboard/super-admin/extend-subscription`,
        label: t("extendSubscription"),
        icon: <CalendarPlusIcon />,
      },
      {
        href: `/${locale}/dashboard/super-admin/complaints`,
        label: t("complaints"),
        icon: <ComplaintIcon />,
      },
      {
        href: `/${locale}/dashboard/super-admin/ratings`,
        label: t("siteRating"),
        icon: <StarIcon />,
      },
      {
        href: `/${locale}/dashboard/super-admin/settings`,
        label: t("settings"),
        icon: <SettingsIcon />,
      },
    ];
  }

  const base = `/${locale}/dashboard`;
  switch (claims.role) {
    case "DOCTOR_ADMIN":
      return [
        {
          href: `${base}/doctor-admin`,
          label: t("overview"),
          icon: <GridIcon />,
        },
        {
          href: `${base}/doctor-admin/workspace`,
          label: t("workspace"),
          icon: <WorkspaceIcon />,
        },
        {
          href: `${base}/doctor-admin/appointments`,
          label: t("appointments"),
          icon: <CalendarIcon />,
        },
        {
          href: `${base}/doctor-admin/receptionists`,
          label: t("reception"),
          icon: <BiPhone />,
        },
        {
          href: `${base}/doctor-admin/patients`,
          label: t("patients"),
          icon: <ClipboardIcon />,
        },
        {
          href: `${base}/doctor-admin/reports`,
          label: t("reports"),
          icon: <ChartIcon />,
        },
        {
          href: `${base}/doctor-admin/medications`,
          label: t("medications"),
          icon: <PillIcon />,
        },
        {
          href: `${base}/doctor-admin/imaging`,
          label: t("imaging"),
          icon: <ScanIcon />,
        },
        {
          href: `${base}/doctor-admin/tests`,
          label: t("tests"),
          icon: <FlaskIcon />,
        },
        {
          href: `${base}/doctor-admin/billing`,
          label: t("billing"),
          icon: <MoneyIcon />,
        },
        {
          href: `${base}/doctor-admin/services`,
          label: t("services"),
          icon: <ServicesIcon />,
        },
        {
          href: `${base}/doctor-admin/complaints`,
          label: t("complaints"),
          icon: <ComplaintIcon />,
        },
        {
          href: `${base}/doctor-admin/site-rating`,
          label: t("siteRating"),
          icon: <StarIcon />,
        },
        {
          href: `${base}/doctor-admin/settings`,
          label: t("settings"),
          icon: <SettingsIcon />,
        },
      ];
    case "RECEPTIONIST":
      return [
        {
          href: `${base}/receptionist`,
          label: t("reception"),
          icon: <GridIcon />,
        },
        {
          href: `${base}/receptionist/patients`,
          label: t("patients"),
          icon: <ClipboardIcon />,
        },
        {
          href: `${base}/receptionist/appointments`,
          label: t("appointments"),
          icon: <CalendarIcon />,
        },
        {
          href: `${base}/receptionist/billing`,
          label: t("billing"),
          icon: <MoneyIcon />,
        },
        {
          href: `${base}/receptionist/settings`,
          label: t("settings"),
          icon: <SettingsIcon />,
        },
      ];
    default:
      return [];
  }
}

interface SidebarProps {
  locale: string;
  claims: SessionClaims | null;
  currentPath: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarNav({
  locale,
  claims,
  currentPath,
  collapsed,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Optimistic active path: updates instantly on click before server responds
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
  const activePath = optimisticPath ?? pathname ?? currentPath;
  const t = useTranslations("dashboard.nav");
  const isAr = locale === "ar";
  const items = useMemo(
    () => getNavItems(locale, claims, t),
    [locale, claims, t],
  );

  useEffect(() => {
    items.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [items, router]);

  // Reset optimistic path once real pathname catches up
  if (optimisticPath && pathname === optimisticPath) {
    setOptimisticPath(null);
  }

  function handleNav(href: string) {
    if (href === pathname) return;
    setOptimisticPath(href);
    startTransition(() => {
      router.push(href);
    });
  }

  const catalogItems = useMemo(
    () =>
      items.filter((item) =>
        /\/doctor(?:-admin)?\/(medications|imaging|tests)$/.test(item.href),
      ),
    [items],
  );
  const baseItems = useMemo(
    () =>
      items.filter(
        (item) =>
          !/\/doctor(?:-admin)?\/(medications|imaging|tests)$/.test(item.href),
      ),
    [items],
  );
  const hasCatalogActive = catalogItems.some(
    (item) =>
      activePath === item.href || activePath.startsWith(item.href + "/"),
  );
  const [catalogOpen, setCatalogOpen] = useState(hasCatalogActive);

  const roleLabel = claims?.isSuperAdmin
    ? t("superAdmin")
    : claims?.role === "DOCTOR_ADMIN"
      ? t("doctorAdmin")
      : claims?.role === "RECEPTIONIST"
        ? t("receptionist")
        : "";

  return (
    <div className="flex flex-col h-full">
      {/* Logo + toggle in one row */}
      <div className="flex items-center border-b border-white/5 px-3 py-3 gap-2">
        {/* Logo icon — always visible */}
        <div className="h-8 w-8 shrink-0 rounded-lg bg-primary flex items-center justify-center shadow-md">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Medical Cross */}
            <rect x="9" y="2" width="6" height="20" rx="1.5" fill="white" />
            <rect x="2" y="9" width="20" height="6" rx="1.5" fill="white" />
          </svg>
        </div>

        {/* Title — hidden when collapsed */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-none truncate">
              {t("productSubtitle")}
            </p>
            <p className="text-xs text-sidebar-fg mt-0.5 leading-none truncate">
              {roleLabel}
            </p>
          </div>
        )}

        {/* Toggle button — stays visible at the top of the collapsed desktop rail */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            collapsed
              ? isAr
                ? "فتح القائمة"
                : "Expand sidebar"
              : isAr
                ? "طي القائمة"
                : "Collapse sidebar"
          }
          title={
            collapsed
              ? isAr
                ? "فتح القائمة"
                : "Expand sidebar"
              : isAr
                ? "طي القائمة"
                : "Collapse sidebar"
          }
          className={[
            "shrink-0 inline-flex items-center justify-center rounded-lg text-sidebar-fg hover:bg-sidebar-hover hover:text-white transition-colors",
            collapsed
              ? "h-11 w-11 bg-primary text-white shadow-sm ring-1 ring-primary/30"
              : "h-8 w-8",
          ].join(" ")}
        >
          {/* Arrow: points right when collapsed (expand), left when open (collapse). Flip for RTL */}
          <svg
            width={collapsed ? "20" : "16"}
            height={collapsed ? "20" : "16"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isAr
                ? collapsed
                  ? "rotate(180deg)"
                  : "rotate(0deg)"
                : collapsed
                  ? "rotate(0deg)"
                  : "rotate(180deg)",
              transition: "transform 0.25s ease",
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Clinic badge (non-superadmin) — hidden when collapsed */}
      {!collapsed && !claims?.isSuperAdmin && claims?.clinicName && (
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-xs text-sidebar-fg/70 uppercase tracking-wide mb-1">
            {t("clinicLabel")}
          </p>
          <p className="text-xs font-medium text-white truncate">
            {claims.clinicName}
          </p>
          <p className="text-xs text-sidebar-fg font-mono">
            {claims.clinicSlug}
          </p>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {baseItems.map((item) => {
          const hasChildSiblings = items.some(
            (other) =>
              other.href !== item.href &&
              other.href.startsWith(item.href + "/"),
          );
          const isActive = hasChildSiblings
            ? activePath === item.href
            : activePath === item.href ||
              activePath.startsWith(item.href + "/");

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => handleNav(item.href)}
              onFocus={() => router.prefetch(item.href)}
              onMouseEnter={() => router.prefetch(item.href)}
              title={collapsed ? item.label : undefined}
              className={[
                "flex w-full items-center gap-3 rounded text-sm transition-colors",
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
                isActive
                  ? "bg-sidebar-active text-sidebar-active-fg font-medium"
                  : "text-sidebar-fg hover:bg-sidebar-hover hover:text-white",
              ].join(" ")}
            >
              <span className="shrink-0 opacity-80">{item.icon}</span>
              {!collapsed && item.label}
            </button>
          );
        })}

        {/* Catalog group */}
        {catalogItems.length > 0 && (
          <div className="pt-1">
            {collapsed ? (
              // When collapsed: show each catalog icon individually
              catalogItems.map((item) => {
                const isActive =
                  activePath === item.href ||
                  activePath.startsWith(item.href + "/");
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => handleNav(item.href)}
                    onFocus={() => router.prefetch(item.href)}
                    onMouseEnter={() => router.prefetch(item.href)}
                    title={item.label}
                    className={[
                      "flex w-full items-center justify-center rounded py-2.5 text-sm transition-colors mb-0.5",
                      isActive
                        ? "bg-sidebar-active text-sidebar-active-fg"
                        : "text-sidebar-fg hover:bg-sidebar-hover hover:text-white",
                    ].join(" ")}
                  >
                    <span className="opacity-80">{item.icon}</span>
                  </button>
                );
              })
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCatalogOpen((c) => !c)}
                  className={[
                    "flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors",
                    hasCatalogActive
                      ? "bg-sidebar-active text-sidebar-active-fg font-medium"
                      : "text-sidebar-fg hover:bg-sidebar-hover hover:text-white",
                  ].join(" ")}
                >
                  <span>{t("catalogGroup")}</span>
                  <span className="text-xs">{catalogOpen ? "▾" : "▸"}</span>
                </button>
                {catalogOpen && (
                  <div className="mt-1 space-y-0.5 ps-2">
                    {catalogItems.map((item) => {
                      const isActive =
                        activePath === item.href ||
                        activePath.startsWith(item.href + "/");
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => handleNav(item.href)}
                          onFocus={() => router.prefetch(item.href)}
                          onMouseEnter={() => router.prefetch(item.href)}
                          className={[
                            "flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-sidebar-active text-sidebar-active-fg font-medium"
                              : "text-sidebar-fg hover:bg-sidebar-hover hover:text-white",
                          ].join(" ")}
                        >
                          <span className="shrink-0 opacity-80">
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </nav>

      {/* Bottom: user info + logout */}
      <div
        className={[
          "border-t border-white/5 py-3",
          collapsed ? "px-2" : "px-3",
        ].join(" ")}
      >
        {collapsed ? (
          // Icon-only bottom
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {claims?.email ? claims.email.slice(0, 2).toUpperCase() : "??"}
            </div>
            <LogoutButton locale={locale} label="" iconOnly />
          </div>
        ) : (
          // Full bottom
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {claims?.email ? claims.email.slice(0, 2).toUpperCase() : "??"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs leading-none text-white">
                {claims?.email ?? "—"}
              </p>
            </div>
            <LogoutButton locale={locale} label="" iconOnly />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Icons ── */
function GridIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
function MoneyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M7 10v4M17 10v4" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-7" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 1 1-4 0v-.06A1.8 1.8 0 0 0 8.75 19.3a1.8 1.8 0 0 0-1.98.36l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.8 1.8 0 0 0 4.3 15a1.8 1.8 0 0 0-1.65-1.1H2.6a2 2 0 1 1 0-4h.06A1.8 1.8 0 0 0 4.3 8.8a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.8 1.8 0 0 0 8.75 4.3a1.8 1.8 0 0 0 1.1-1.65V2.6a2 2 0 1 1 4 0v.06a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.1h.06a2 2 0 1 1 0 4h-.06A1.8 1.8 0 0 0 19.4 15Z" />
    </svg>
  );
}
function CalendarPlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="12" y1="14" x2="12" y2="18" />
      <line x1="10" y1="16" x2="14" y2="16" />
    </svg>
  );
}
function WorkspaceIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
function PillIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}
function ScanIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}
function FlaskIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6M10 3v6l-3.8 9.6A1 1 0 0 0 7.1 21h9.8a1 1 0 0 0 .9-1.4L14 9V3" />
      <path d="M8.5 14h7" />
    </svg>
  );
}
function ComplaintIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function ServicesIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}
