"use client";

/**
 * TokenRefresher — يجدد الـ access_token تلقائياً قبل انتهائه بدقيقتين.
 * الـ access_token بينتهي كل 15 دقيقة → نجدد كل 13 دقيقة.
 *
 * حالات الـ redirect لـ /login:
 * - 401 من endpoint حساس: session/account انتهى أو اتألغى تفعيله
 * - مش 429 (rate limit) → بيعمل retry بس
 */
import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 13 * 60 * 1000;
const RETRY_INTERVAL_MS = 2 * 60 * 1000;
// Check fast (every 30s) if the account was deactivated mid-session
const ACTIVE_CHECK_INTERVAL_MS = 30 * 1000;

export function TokenRefresher() {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? "ar";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = (delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void refresh(), delay);
  };

  const scheduleCheck = () => {
    if (checkRef.current) clearTimeout(checkRef.current);
    checkRef.current = setTimeout(
      () => void checkActive(),
      ACTIVE_CHECK_INTERVAL_MS,
    );
  };

  /**
   * Ping /api/auth/me — lightweight check that the token is still valid.
   * If the backend returns 401 (user/clinic deactivated mid-session),
   * redirect to login so the user sees the proper error on next attempt.
   */
  const checkActive = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.status === 401) {
        router.replace(`/${locale}/login`);
        return;
      }
    } catch {
      // Network issue — ignore, the refresh cycle handles reconnection
    }
    scheduleCheck();
  };

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        cache: "no-store",
      });

      if (res.status === 401) {
        // Refresh token expired or revoked → redirect to login
        router.replace(`/${locale}/login`);
        return;
      }

      if (res.status === 429) {
        schedule(RETRY_INTERVAL_MS);
        return;
      }

      if (!res.ok) {
        schedule(RETRY_INTERVAL_MS);
        return;
      }

      schedule(REFRESH_INTERVAL_MS);
    } catch {
      schedule(RETRY_INTERVAL_MS);
    }
  };

  useEffect(() => {
    schedule(REFRESH_INTERVAL_MS);
    scheduleCheck(); // start active-check loop
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (checkRef.current) clearTimeout(checkRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
