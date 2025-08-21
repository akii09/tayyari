"use client";

import { useMemo, useState, useRef, useEffect } from "react";

type Props = {
  value?: Date | null;
  onChange?: (d: Date) => void;
};

export function DateSelect({ value: controlledValue, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState<Date | null>(null);
  const [dropDirection, setDropDirection] = useState<'down' | 'up'>('down');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const value = controlledValue ?? uncontrolled;
  const label = value ? value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Pick a date";

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 300px space below, open upward
      setDropDirection(spaceBelow < 300 && spaceAbove > 300 ? 'up' : 'down');
    }
  }, [open]);

  return (
    <div className="mt-2 relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-transparent border border-white/10 rounded-md px-3 py-2 text-left hover:border-white/20"
      >
        <span className={value ? "" : "text-text-muted"}>{label}</span>
        <span>▾</span>
      </button>
      {open && (
        <div className={`absolute z-50 w-full rounded-lg border border-white/10 bg-bg-secondary p-3 shadow-xl ${
          dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}>
          <Calendar
            value={value}
            onPick={(date) => {
              if (onChange) onChange(date);
              else setUncontrolled(date);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function Calendar({ value, onPick }: { value: Date | null; onPick: (d: Date) => void }) {
  const [cursor, setCursor] = useState<Date>(value ?? new Date());
  const start = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const end = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const days: (Date | null)[] = useMemo(() => {
    const firstWeekday = (start.getDay() + 6) % 7; // make Monday=0
    const grid: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= end.getDate(); d++) grid.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [start, end, cursor]);

  const isPast = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="px-2 py-1 hover:bg-white/10 rounded">←</button>
        <div className="text-sm font-medium">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </div>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="px-2 py-1 hover:bg-white/10 rounded">→</button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs text-text-secondary">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (<div key={d} className="text-center">{d}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-2 text-sm">
        {days.map((d, i) => (
          <button
            key={i}
            className={`px-2 py-2 rounded-md text-center ${
              d == null ? "opacity-0" : isPast(d) ? "text-text-muted cursor-not-allowed" : "hover:bg-white/10"
            } ${value && d && value.toDateString() === d.toDateString() ? "bg-white/20" : ""}`}
            onClick={() => d && !isPast(d) && onPick(d)}
            disabled={!d || isPast(d)}
          >
            {d ? d.getDate() : ""}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <QuickPreset label="2w" addDays={14} onPick={onPick} />
          <QuickPreset label="1m" addDays={30} onPick={onPick} />
          <QuickPreset label="3m" addDays={90} onPick={onPick} />
        </div>
        <button className="text-xs text-text-secondary hover:text-white" onClick={() => onPick(new Date())}>Today</button>
      </div>
    </div>
  );
}

function QuickPreset({ label, addDays, onPick }: { label: string; addDays: number; onPick: (d: Date) => void }) {
  return (
    <button
      onClick={() => {
        const base = new Date();
        base.setDate(base.getDate() + addDays);
        onPick(base);
      }}
      className="text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10"
    >
      {label}
    </button>
  );
}


