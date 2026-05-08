"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";

interface LogoutButtonProps {
  locale: string;
  label: string;
  iconOnly?: boolean;
}

function LogoutModal({
  onConfirm,
  onCancel,
  pending,
  copy,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
  copy: {
    confirmTitle: string;
    confirmBody: string;
    cancel: string;
    title: string;
  };
}) {
  // Render into document.body via portal so it's always centered on screen
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-card-border bg-card p-5 text-foreground shadow-card-md">
        <h2 className="text-sm font-semibold">{copy.confirmTitle}</h2>
        <p className="mt-2 text-sm text-muted">{copy.confirmBody}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded px-3 py-2 text-sm hover:bg-surface-2"
            onClick={onCancel}
          >
            {copy.cancel}
          </button>
          <button
            className="rounded bg-danger px-3 py-2 text-sm text-white disabled:opacity-60"
            onClick={onConfirm}
            disabled={pending}
          >
            {copy.title}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function LogoutButton({ locale, label, iconOnly }: LogoutButtonProps) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isAr = locale === "ar";

  useEffect(() => setMounted(true), []);

  const copy = {
    title: isAr ? "تسجيل الخروج" : "Log out",
    confirmTitle: isAr ? "تأكيد تسجيل الخروج" : "Confirm logout",
    confirmBody: isAr
      ? "هل أنت متأكد أنك تريد تسجيل الخروج؟"
      : "Are you sure you want to log out?",
    cancel: isAr ? "إلغاء" : "Cancel",
    pending: isAr ? "جارٍ التنفيذ..." : "...",
  };

  function handleLogout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.replace(`/${locale}/login`);
    });
  }

  const modal =
    mounted && confirming ? (
      <LogoutModal
        onConfirm={handleLogout}
        onCancel={() => setConfirming(false)}
        pending={pending}
        copy={copy}
      />
    ) : null;

  if (iconOnly) {
    return (
      <>
        <button
          onClick={() => setConfirming(true)}
          disabled={pending}
          title={copy.title}
          className="flex h-7 w-7 items-center justify-center rounded text-sidebar-fg hover:bg-sidebar-hover hover:text-white transition-colors disabled:opacity-50"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-foreground transition-colors disabled:opacity-50"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" x2="9" y1="12" y2="12" />
        </svg>
        {pending ? copy.pending : label || copy.title}
      </button>
      {modal}
    </>
  );
}
