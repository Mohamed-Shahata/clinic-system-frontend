"use client";

import { useState, useRef, useEffect } from "react";

type Country = {
  code: string; // e.g. "+20"
  iso: string; // e.g. "EG"
  name: string; // e.g. "مصر / Egypt"
  flag: string; // emoji
};

const COUNTRIES: Country[] = [
  { code: "+20", iso: "EG", name: "مصر / Egypt", flag: "🇪🇬" },
  { code: "+966", iso: "SA", name: "السعودية / Saudi Arabia", flag: "🇸🇦" },
  { code: "+971", iso: "AE", name: "الإمارات / UAE", flag: "🇦🇪" },
  { code: "+965", iso: "KW", name: "الكويت / Kuwait", flag: "🇰🇼" },
  { code: "+974", iso: "QA", name: "قطر / Qatar", flag: "🇶🇦" },
  { code: "+973", iso: "BH", name: "البحرين / Bahrain", flag: "🇧🇭" },
  { code: "+968", iso: "OM", name: "عُمان / Oman", flag: "🇴🇲" },
  { code: "+962", iso: "JO", name: "الأردن / Jordan", flag: "🇯🇴" },
  { code: "+961", iso: "LB", name: "لبنان / Lebanon", flag: "🇱🇧" },
  { code: "+963", iso: "SY", name: "سوريا / Syria", flag: "🇸🇾" },
  { code: "+964", iso: "IQ", name: "العراق / Iraq", flag: "🇮🇶" },
  { code: "+970", iso: "PS", name: "فلسطين / Palestine", flag: "🇵🇸" },
  { code: "+212", iso: "MA", name: "المغرب / Morocco", flag: "🇲🇦" },
  { code: "+213", iso: "DZ", name: "الجزائر / Algeria", flag: "🇩🇿" },
  { code: "+216", iso: "TN", name: "تونس / Tunisia", flag: "🇹🇳" },
  { code: "+218", iso: "LY", name: "ليبيا / Libya", flag: "🇱🇾" },
  { code: "+249", iso: "SD", name: "السودان / Sudan", flag: "🇸🇩" },
  { code: "+252", iso: "SO", name: "الصومال / Somalia", flag: "🇸🇴" },
  { code: "+1", iso: "US", name: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", iso: "GB", name: "UK", flag: "🇬🇧" },
  { code: "+49", iso: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+33", iso: "FR", name: "France", flag: "🇫🇷" },
  { code: "+90", iso: "TR", name: "Türkiye", flag: "🇹🇷" },
  { code: "+98", iso: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "+92", iso: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "+91", iso: "IN", name: "India", flag: "🇮🇳" },
];

interface PhoneInputProps {
  value: string; // full phone e.g. "+201234567890"
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  label?: string;
  locale?: "ar" | "en" | string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder,
  required,
  id,
  className = "",
  label,
  locale = "en",
}: PhoneInputProps) {
  // Parse existing value into countryCode + local
  function parseValue(val: string) {
    for (const c of [...COUNTRIES].sort(
      (a, b) => b.code.length - a.code.length,
    )) {
      if (val.startsWith(c.code)) {
        return { country: c, local: val.slice(c.code.length) };
      }
    }
    return { country: COUNTRIES[0], local: val.replace(/^\+/, "") };
  }

  const parsed = parseValue(value);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    parsed.country,
  );
  const [localNumber, setLocalNumber] = useState(parsed.local);
  const [dropOpen, setDropOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!dropOpen) return;
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDropOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  useEffect(() => {
    const next = parseValue(value);
    setSelectedCountry(next.country);
    setLocalNumber(next.local);
  }, [value]);

  function handleLocalChange(raw: string) {
    // Strip leading zeros and any country code prefix the user typed
    const digits = raw.replace(/[^\d]/g, "");
    setLocalNumber(digits);
    onChange(`${selectedCountry.code}${digits}`);
  }

  function handleCountrySelect(c: Country) {
    setSelectedCountry(c);
    setDropOpen(false);
    setSearch("");
    onChange(`${c.code}${localNumber}`);
  }

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search),
  );
  const isAr = locale === "ar";

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {label}
          {required && <span className="ms-1 text-danger">*</span>}
        </label>
      )}
      <div className="flex gap-0 rounded-lg border border-border bg-surface overflow-hidden ring-primary/30 focus-within:ring-2 transition-shadow">
        {/* Country code button */}
        <div className="relative" ref={dropRef}>
          <button
            type="button"
            onClick={() => setDropOpen((v) => !v)}
            className="flex h-full items-center gap-1.5 border-e border-border bg-surface-2/50 px-2.5 py-2 text-sm hover:bg-surface-2 transition-colors"
          >
            <span className="text-base leading-none">
              {selectedCountry.flag}
            </span>
            <span className="font-mono text-xs text-foreground">
              {selectedCountry.code}
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted"
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>

          {dropOpen && (
            <div className="absolute start-0 top-full z-[300] mt-1 w-64 rounded-xl border border-card-border bg-card shadow-card-md overflow-hidden">
              <div className="p-2 border-b border-card-border">
                <input
                  type="text"
                  autoFocus
                  placeholder={isAr ? "ابحث عن الدولة..." : "Search country..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
              <ul className="max-h-52 overflow-y-auto">
                {filtered.map((c) => (
                  <li key={c.iso}>
                    <button
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-start hover:bg-surface-2 transition-colors text-sm ${
                        c.iso === selectedCountry.iso
                          ? "bg-primary/5 text-primary font-medium"
                          : "text-foreground"
                      }`}
                    >
                      <span className="text-base shrink-0">{c.flag}</span>
                      <span className="flex-1 text-xs">{c.name}</span>
                      <span className="font-mono text-xs text-muted shrink-0">
                        {c.code}
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-3 py-3 text-xs text-muted text-center">
                    {isAr ? "لا توجد نتائج" : "No results"}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Local number input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          required={required}
          placeholder={placeholder ?? "1234567890"}
          value={localNumber}
          onChange={(e) => handleLocalChange(e.target.value)}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none"
          dir="ltr"
        />
      </div>
    </div>
  );
}
