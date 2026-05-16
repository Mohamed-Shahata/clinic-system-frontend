"use client";

/**
 * TokenRefresher
 *
 * - يجدد الـ access_token كل 13 دقيقة (قبل انتهائه بدقيقتين)
 * - يفحص كل دقيقة لو الحساب اتعطل من الدكتور/الأدمن
 *
 * السيشن تفضل شغالة ما دام المستخدم مفعملش logout يدوي.
 * الـ logout التلقائي بيحصل بس لو:
 *   - الحساب اتعطل (revoked = true من /api/auth/me)
 * مش بيحصل logout لو:
 *   - الـ refresh فشل مؤقتاً (network, 5xx, 429) → retry
 *   - الـ refresh token انتهى → retry وسيحاول كل 2 دقيقة
 */

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 13 * 60 * 1000; // كل 13 دقيقة
const RETRY_INTERVAL_MS = 2 * 60 * 1000; // retry بعد دقيقتين
const ACTIVE_CHECK_INTERVAL_MS = 60 * 1000; // فحص التعطيل كل دقيقة

export function TokenRefresher() {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? "ar";
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = (delay: number) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void doRefresh(), delay);
  };

  const scheduleCheck = () => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(
      () => void checkRevocation(),
      ACTIVE_CHECK_INTERVAL_MS,
    );
  };

  // ── تجديد الـ token ────────────────────────────────────────────────────────
  const doRefresh = async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        cache: "no-store",
      });

      if (res.ok) {
        // نجح → جدول التجديد الجاي
        scheduleRefresh(REFRESH_INTERVAL_MS);
      } else {
        // أي خطأ (401, 429, 5xx) → retry بعد دقيقتين بدون logout
        scheduleRefresh(RETRY_INTERVAL_MS);
      }
    } catch {
      // network error → retry
      scheduleRefresh(RETRY_INTERVAL_MS);
    }
  };

  // ── فحص التعطيل ───────────────────────────────────────────────────────────
  const checkRevocation = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        revoked?: boolean;
      };

      if (body.revoked === true) {
        // الحساب أو العيادة اتعطلت → logout فوري
        router.replace(`/${locale}/login`);
        return;
      }
    } catch {
      // network → تجاهل وكمل
    }
    scheduleCheck();
  };

  // ── lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    scheduleRefresh(REFRESH_INTERVAL_MS);
    scheduleCheck();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
