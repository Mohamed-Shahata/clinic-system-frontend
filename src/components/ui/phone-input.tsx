"use client";

import { useState, useRef, useEffect } from "react";

type Country = {
  code: string;
  iso: string;
  name: string;
  flag: string;
  /** expected local digits count (after country code) */
  digits: number;
  /** mask pattern e.g. "## #### ####" */
  mask: string;
};

const COUNTRIES: Country[] = [
  {
    code: "+20",
    iso: "EG",
    name: "مصر / Egypt",
    flag: "🇪🇬",
    digits: 10,
    mask: "### #### ####",
  },
  {
    code: "+966",
    iso: "SA",
    name: "السعودية / Saudi Arabia",
    flag: "🇸🇦",
    digits: 9,
    mask: "## ### ####",
  },
  {
    code: "+971",
    iso: "AE",
    name: "الإمارات / UAE",
    flag: "🇦🇪",
    digits: 9,
    mask: "## ### ####",
  },
  {
    code: "+965",
    iso: "KW",
    name: "الكويت / Kuwait",
    flag: "🇰🇼",
    digits: 8,
    mask: "#### ####",
  },
  {
    code: "+974",
    iso: "QA",
    name: "قطر / Qatar",
    flag: "🇶🇦",
    digits: 8,
    mask: "#### ####",
  },
  {
    code: "+973",
    iso: "BH",
    name: "البحرين / Bahrain",
    flag: "🇧🇭",
    digits: 8,
    mask: "#### ####",
  },
  {
    code: "+968",
    iso: "OM",
    name: "عُمان / Oman",
    flag: "🇴🇲",
    digits: 8,
    mask: "#### ####",
  },
  {
    code: "+962",
    iso: "JO",
    name: "الأردن / Jordan",
    flag: "🇯🇴",
    digits: 9,
    mask: "# #### ####",
  },
  {
    code: "+961",
    iso: "LB",
    name: "لبنان / Lebanon",
    flag: "🇱🇧",
    digits: 8,
    mask: "## ### ###",
  },
  {
    code: "+963",
    iso: "SY",
    name: "سوريا / Syria",
    flag: "🇸🇾",
    digits: 9,
    mask: "### ### ###",
  },
  {
    code: "+964",
    iso: "IQ",
    name: "العراق / Iraq",
    flag: "🇮🇶",
    digits: 10,
    mask: "### ### ####",
  },
  {
    code: "+970",
    iso: "PS",
    name: "فلسطين / Palestine",
    flag: "🇵🇸",
    digits: 9,
    mask: "## ### ####",
  },
  {
    code: "+212",
    iso: "MA",
    name: "المغرب / Morocco",
    flag: "🇲🇦",
    digits: 9,
    mask: "### #### ##",
  },
  {
    code: "+213",
    iso: "DZ",
    name: "الجزائر / Algeria",
    flag: "🇩🇿",
    digits: 9,
    mask: "### ### ###",
  },
  {
    code: "+216",
    iso: "TN",
    name: "تونس / Tunisia",
    flag: "🇹🇳",
    digits: 8,
    mask: "## ### ###",
  },
  {
    code: "+218",
    iso: "LY",
    name: "ليبيا / Libya",
    flag: "🇱🇾",
    digits: 9,
    mask: "## ### ####",
  },
  {
    code: "+249",
    iso: "SD",
    name: "السودان / Sudan",
    flag: "🇸🇩",
    digits: 9,
    mask: "## ### ####",
  },
  {
    code: "+252",
    iso: "SO",
    name: "الصومال / Somalia",
    flag: "🇸🇴",
    digits: 8,
    mask: "# ### ###",
  },
  {
    code: "+1",
    iso: "US",
    name: "USA / Canada",
    flag: "🇺🇸",
    digits: 10,
    mask: "### ### ####",
  },
  {
    code: "+44",
    iso: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    digits: 10,
    mask: "#### ### ###",
  },
  {
    code: "+49",
    iso: "DE",
    name: "Germany",
    flag: "🇩🇪",
    digits: 10,
    mask: "### ### ####",
  },
  {
    code: "+33",
    iso: "FR",
    name: "France",
    flag: "🇫🇷",
    digits: 9,
    mask: "# ## ## ## ##",
  },
  {
    code: "+90",
    iso: "TR",
    name: "Türkiye",
    flag: "🇹🇷",
    digits: 10,
    mask: "### ### ####",
  },
  {
    code: "+98",
    iso: "IR",
    name: "Iran",
    flag: "🇮🇷",
    digits: 10,
    mask: "### ### ####",
  },
  {
    code: "+92",
    iso: "PK",
    name: "Pakistan",
    flag: "🇵🇰",
    digits: 10,
    mask: "### ### ####",
  },
  {
    code: "+91",
    iso: "IN",
    name: "India",
    flag: "🇮🇳",
    digits: 10,
    mask: "##### #####",
  },
];

function parseValue(val: string): { country: Country; digits: string } {
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (val.startsWith(c.code)) {
      return {
        country: c,
        digits: val.slice(c.code.length).replace(/\D/g, ""),
      };
    }
  }
  return { country: COUNTRIES[0], digits: val.replace(/\D/g, "") };
}

interface PhoneInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  label?: string;
  locale?: string;
}

export function PhoneInput({
  value,
  onChange,
  required,
  id,
  className = "",
  label,
  locale = "en",
}: PhoneInputProps) {
  const parsed = parseValue(value);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    parsed.country,
  );
  const [localDigits, setLocalDigits] = useState(parsed.digits);
  const [dropOpen, setDropOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const isAr = locale === "ar";

  useEffect(() => {
    if (!dropOpen) return;
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDropOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  // Sync external value changes
  useEffect(() => {
    const p = parseValue(value);
    setSelectedCountry(p.country);
    setLocalDigits(p.digits);
  }, [value]);

  function handleLocalChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, selectedCountry.digits);
    setLocalDigits(digits);
    onChange(`${selectedCountry.code}${digits}`);
  }

  function handleCountrySelect(c: Country) {
    setSelectedCountry(c);
    setDropOpen(false);
    setSearch("");
    onChange(`${c.code}${localDigits}`);
  }

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search),
  );

  const digitSlots = Array.from({ length: selectedCountry.digits });

  return (
    <div className={`space-y-2 ${className}`} dir="ltr">
      {label && (
        <label
          htmlFor={id}
          className={`block text-sm font-medium text-foreground ${isAr ? "text-right" : "text-left"}`}
        >
          {label}
          {required && <span className="ms-1 text-danger">*</span>}
        </label>
      )}

      {/* ── Row 1: Country selector ─────────────────────────────── */}
      <div className="relative" ref={dropRef}>
        <button
          type="button"
          onClick={() => setDropOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm hover:bg-surface-2 transition-colors ring-primary/30 focus:outline-none focus:ring-2"
        >
          <span className="text-lg leading-none">{selectedCountry.flag}</span>
          <span className="flex-1 text-start text-foreground">
            {selectedCountry.name}
          </span>
          <span className="font-mono text-xs text-muted">
            {selectedCountry.code}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={`text-muted transition-transform ${dropOpen ? "rotate-180" : ""}`}
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>

        {dropOpen && (
          <div className="absolute start-0 top-full z-[300] mt-1 w-full rounded-xl border border-card-border bg-card shadow-card-md overflow-hidden">
            <div className="p-2 border-b border-card-border">
              <input
                type="text"
                autoFocus
                placeholder={isAr ? "ابحث عن الدولة..." : "Search country..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none"
                dir={isAr ? "rtl" : "ltr"}
              />
            </div>
            <ul className="max-h-52 overflow-y-auto">
              {filtered.map((c) => (
                <li key={c.iso}>
                  <button
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-start hover:bg-surface-2 transition-colors ${
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

      {/* ── Row 2: Country code badge + digit slots (underline only) ── */}
      <div className="flex items-end gap-2">
        {/* Code badge */}
        <div className="flex items-center gap-1.5 border-b border-border pb-2 shrink-0 select-none">
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="font-mono text-sm font-medium text-foreground">
            {selectedCountry.code}
          </span>
        </div>

        {/* Fixed-width slots — each slot is 24px wide with 4px gap */}
        <div
          className="relative pb-0.5"
          style={{
            width:
              selectedCountry.digits * 24 + (selectedCountry.digits - 1) * 4,
          }}
        >
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            required={required}
            aria-label={label}
            value={localDigits}
            onChange={(e) => handleLocalChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-primary outline-none"
            dir="ltr"
            maxLength={selectedCountry.digits}
          />
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${selectedCountry.digits}, 24px)`,
              gap: "4px",
            }}
            aria-hidden="true"
          >
            {digitSlots.map((_, index) => (
              <span
                key={index}
                className={`flex h-8 w-6 items-center justify-center border-b-2 text-xs font-mono font-semibold tabular-nums transition-colors ${
                  localDigits[index]
                    ? "border-primary text-foreground"
                    : "border-border text-muted/40"
                }`}
              >
                {localDigits[index] ?? ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
