"use client";

/**
 * TokenRefresher — يجدد الـ access_token تلقائياً قبل انتهائه بدقيقتين.
 * الـ access_token بينتهي كل 15 دقيقة → نجدد كل 13 دقيقة.
 * لو الـ refresh فشل (refresh_token انتهى حقيقي) → logout تلقائي.
 *
 * مهم: 429 (Too Many Requests) مش معناها session انتهى — مش بيعمل logout.
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 13 * 60 * 1000; // 13 minutes
const RETRY_INTERVAL_MS = 2 * 60 * 1000; // retry after 2 min if failed

export function TokenRefresher() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = (delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void refresh(), delay);
  };

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        cache: "no-store",
      });

      if (res.status === 401) {
        // Refresh token expired → redirect to login
        router.replace("/login");
        return;
      }

      if (res.status === 429) {
        // Rate limited — this is NOT a session expiry, just retry later
        schedule(RETRY_INTERVAL_MS);
        return;
      }

      if (!res.ok) {
        // Other server errors → retry, don't logout
        schedule(RETRY_INTERVAL_MS);
        return;
      }

      // Success → schedule next refresh
      schedule(REFRESH_INTERVAL_MS);
    } catch {
      // Network error → retry sooner
      schedule(RETRY_INTERVAL_MS);
    }
  };

  useEffect(() => {
    // Start first refresh cycle
    schedule(REFRESH_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
