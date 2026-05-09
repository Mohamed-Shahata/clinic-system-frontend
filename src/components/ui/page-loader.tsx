"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!loading) return null;

  return (
    /* Full-screen overlay — blocks the page until navigation completes */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-[2px]"
      aria-hidden
    >
      {/* Simple spinning ring — no progress bar, no logo clutter */}
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        className="animate-spin"
        style={{ animationDuration: "0.75s" }}
      >
        <circle
          cx="22"
          cy="22"
          r="18"
          stroke="hsl(var(--primary))"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="28 84"
        />
      </svg>
    </div>
  );
}
