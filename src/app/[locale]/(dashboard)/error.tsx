"use client";

import { useEffect } from "react";

/**
 * FRONT-04: Global error boundary for the dashboard segment.
 * Without this file, any unhandled render error in a dashboard page crashes
 * the entire tab with a blank screen. This component catches the error,
 * shows a user-friendly message, and lets the user recover.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error tracking service here (Sentry, Datadog, etc.)
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-semibold text-foreground">حدث خطأ غير متوقع</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message ?? "يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني."}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
