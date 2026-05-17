"use client";

import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed:", err));
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    }
    return outcome === "accepted";
  };

  return { canInstall, isInstalled, install };
}

// ── Banner Component ───────────────────────────────────────────────────────
export function PWAInstallBanner({ isAr }: { isAr: boolean }) {
  const { canInstall, install, isInstalled } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || isInstalled || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-primary/20 bg-card shadow-xl px-4 py-3 flex items-center gap-3"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Icon */}
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
        📲
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">
          {isAr ? "ثبّت التطبيق" : "Install App"}
        </p>
        <p className="text-xs text-muted mt-0.5 leading-tight">
          {isAr
            ? "افتح كلينيك من الشاشة الرئيسية بدون متصفح"
            : "Open Clinic from your home screen without a browser"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted hover:text-foreground px-2 py-1 rounded-lg hover:bg-surface-2 transition-colors"
        >
          {isAr ? "لاحقاً" : "Later"}
        </button>
        <button
          onClick={() => void install()}
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity"
        >
          {isAr ? "تثبيت" : "Install"}
        </button>
      </div>
    </div>
  );
}
