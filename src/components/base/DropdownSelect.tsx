"use client";

import { useState } from "react";

export type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
};

export function DropdownSelect({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? placeholder ?? "Select";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-transparent border border-white/10 rounded-md px-3 py-2 text-left hover:border-white/20"
      >
        <span>{current}</span>
        <span>▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-white/10 bg-[var(--bg-secondary)] py-2 shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 hover:bg-white/10 ${o.value === value ? "bg-white/5" : ""}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


