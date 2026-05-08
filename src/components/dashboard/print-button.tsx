"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-fg">
      Print / Save PDF
    </button>
  );
}
