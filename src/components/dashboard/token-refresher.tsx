"use client";

/**
 * TokenRefresher
 *
 * ─ يجدد الـ access_token كل 13 دقيقة (قبل انتهائه بدقيقتين).
 * ─ بعد كل تجديد ناجح يفحص إذا الحساب/العيادة لا تزال فعّالة.
 *
 * قواعد الـ logout التلقائي:
 *   ✅ يحصل logout فقط إذا رجع { revoked: true } من /api/auth/me
 *      وذلك فقط بعد تجديد ناجح للتوكن (لضمان أن الـ 401 ليس resulting من توكن منتهي).
 *   ❌ لا يحصل logout إذا:
 *      - فشل الـ refresh مؤقتاً (network, 5xx, 429) → retry بعد دقيقتين
 *      - فشل فحص /api/auth/me لأي سبب → تجاهل وكمل
 *      - الـ access token منتهي مؤقتاً قبل الـ refresh → سيتجدد تلقائياً
 */

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 13 * 60 * 1000; // كل 13 دقيقة
const RETRY_INTERVAL_MS = 2 * 60 * 1000; // retry بعد دقيقتين عند الفشل

export function TokenRefresher() {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? "ar";
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = (delay: number) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void doRefresh(), delay);
  };

  /**
   * فحص التعطيل — يُستدعى فقط بعد تجديد ناجح للتوكن.
   * بهذا نضمن أن الـ access_token صالح وأي 401 هو revocation حقيقي.
   */
  const checkRevocationAfterRefresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });

      // 200 = الجلسة سليمة، تجاهل
      if (res.ok) return;

      if (res.status === 401) {
        const body = (await res.json().catch(() => ({}))) as {
          revoked?: boolean;
        };
        if (body.revoked === true) {
          // الحساب أو العيادة مُعطَّل أو الاشتراك منتهي → logout فوري
          router.replace(`/${locale}/login`);
        }
        // revoked = false + 401 = حالة مؤقتة غير متوقعة → تجاهل
      }
      // 5xx / network → تجاهل دائماً
    } catch {
      // network error → تجاهل
    }
  };

  // ── تجديد الـ token ────────────────────────────────────────────────────────
  const doRefresh = async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        cache: "no-store",
      });

      if (res.ok) {
        // نجح → فحص التعطيل الآن (التوكن الجديد صالح بالتأكيد)
        await checkRevocationAfterRefresh();
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

  // ── lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    scheduleRefresh(REFRESH_INTERVAL_MS);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
