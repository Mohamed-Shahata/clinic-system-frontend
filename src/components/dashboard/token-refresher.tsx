"use client";

/**
 * TokenRefresher
 *
 * ─ بعد كل تجديد ناجح يحسب الـ interval الجاي من الـ expiresIn الفعلي:
 *     nextInterval = clamp((expiresIn - 120) * 1000,  min=60s,  max=60min)
 *   يعني دايماً بيجدد قبل الانتهاء بدقيقتين بالظبط، مهما كانت قيمة TTL في الباكيند.
 * ─ Fallback: لو expiresIn مش موجود في الرسبونس → 13 دقيقة.
 *
 * قواعد الـ logout التلقائي:
 *   ✅ يحصل logout فقط إذا رجع { revoked: true } من /api/auth/me
 *      وذلك فقط بعد تجديد ناجح (لضمان أن الـ 401 مش ناتج عن توكن منتهي).
 *   ❌ لا يحصل logout إذا:
 *      - فشل الـ refresh مؤقتاً (network, 5xx, 429) → retry بعد دقيقتين
 *      - فشل فحص /api/auth/me لأي سبب → تجاهل وكمل
 */

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const FALLBACK_REFRESH_INTERVAL_MS = 13 * 60 * 1000; // fallback لو expiresIn مش موجود
const RETRY_INTERVAL_MS = 2 * 60 * 1000; // retry بعد دقيقتين عند الفشل

/** احسب الـ interval من الـ expiresIn (ثواني): قبل الانتهاء بدقيقتين، بين 60ث و60د */
function calcRefreshInterval(expiresInSeconds: number): number {
  return Math.min(
    Math.max((expiresInSeconds - 120) * 1000, 60_000),
    60 * 60 * 1000,
  );
}

export function TokenRefresher() {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? "ar";
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = (delay: number) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void doRefresh(), delay);
  };

  const checkRevocationAfterRefresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) return;
      if (res.status === 401) {
        const body = (await res.json().catch(() => ({}))) as {
          revoked?: boolean;
        };
        if (body.revoked === true) {
          router.replace(`/${locale}/login`);
        }
      }
    } catch {
      // network error → تجاهل
    }
  };

  const doRefresh = async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        cache: "no-store",
      });

      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          expiresIn?: number;
          raceRecovered?: boolean;
        };
        const expiresIn =
          typeof body.expiresIn === "number" ? body.expiresIn : null;
        const nextInterval = expiresIn
          ? calcRefreshInterval(expiresIn)
          : FALLBACK_REFRESH_INTERVAL_MS;

        await checkRevocationAfterRefresh();
        scheduleRefresh(nextInterval);
      } else {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
          revoked?: boolean;
        };
        if (body.revoked === true) {
          const expired = body.message?.startsWith("subscription_expired:");
          router.replace(
            expired ? `/${locale}/renew-subscription` : `/${locale}/login`,
          );
          return;
        }
        scheduleRefresh(RETRY_INTERVAL_MS);
      }
    } catch {
      scheduleRefresh(RETRY_INTERVAL_MS);
    }
  };

  useEffect(() => {
    scheduleRefresh(FALLBACK_REFRESH_INTERVAL_MS);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
