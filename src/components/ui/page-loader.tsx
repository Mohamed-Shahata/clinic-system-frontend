"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    setProgress(20);

    const t1 = setTimeout(() => setProgress(60), 100);
    const t2 = setTimeout(() => setProgress(85), 300);
    const t3 = setTimeout(() => {
      setProgress(100);
      const t4 = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(t4);
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Top progress bar */}
      <div
        className="fixed top-0 left-0 z-[9999] h-0.5 bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />

      {/* Centered overlay — perfectly centered on viewport */}
      {loading && progress < 90 && (
        <div
          className="fixed z-[9998] flex items-center justify-center pointer-events-none"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <div className="flex flex-col items-center gap-3">
            {/* Logo box with spinning ring */}
            <div className="relative flex h-16 w-16 items-center justify-center">
              {/* Spinning ring */}
              <svg
                className="absolute inset-0 animate-spin"
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="70 105"
                  opacity="0.35"
                />
              </svg>

              {/* Medical cross icon */}
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="white"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="9"
                    y="2"
                    width="6"
                    height="20"
                    rx="1.5"
                    fill="white"
                  />
                  <rect
                    x="2"
                    y="9"
                    width="20"
                    height="6"
                    rx="1.5"
                    fill="white"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
