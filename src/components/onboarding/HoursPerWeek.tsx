"use client";

import { useState } from "react";

type Props = {
  value?: number;
  onChange?: (v: number) => void;
};

export function HoursPerWeek({ value: controlled, onChange }: Props) {
  const [local, setLocal] = useState(6);
  const value = controlled ?? local;

  const setValue = (v: number) => {
    if (onChange) onChange(v);
    else setLocal(v);
  };

  return (
    <div className="space-y-3 mt-2">
      <input
        type="range"
        min={2}
        max={40}
        step={2}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value))}
        className="w-full accent-[var(--electric-blue)]"
      />
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>2h</span><span>10h</span><span>20h</span><span>30h</span><span>40h</span>
      </div>
      <div className="flex gap-2">
        {[6, 10, 14, 20].map((h) => (
          <button key={h} onClick={() => setValue(h)} className={`px-2 py-1 rounded-md text-xs ${value === h ? "bg-white/20" : "bg-white/5 hover:bg-white/10"}`}>{h}h</button>
        ))}
      </div>
    </div>
  );
}


