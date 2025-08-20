"use client";

import { useState } from "react";
import { GlassCard } from "@/components/base/GlassCard";

export function ProgressOverlay() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-[var(--text-secondary)] hover:text-white">View Progress</button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-end p-4 sm:p-6 bg-black/40" onClick={() => setOpen(false)}>
          <GlassCard className="w-full max-w-md p-6 sm:p-8" >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Your Progress</h3>
              <button onClick={() => setOpen(false)} className="text-[var(--text-secondary)] hover:text-white">✖︎</button>
            </div>
            <div className="space-y-4">
              <SkillBar label="System Design" value={83} />
              <SkillBar label="Data Structures" value={75} />
              <SkillBar label="JavaScript" value={100} />
              <div className="mt-2 text-sm text-[var(--text-secondary)]">📅 Next: Mock Interview — Tomorrow at 2:00 PM</div>
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span>{label}</span>
        <span className="text-[var(--text-secondary)]">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full gradient-success" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}


