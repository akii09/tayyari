"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "@/components/base/GlassCard";
import { Button } from "@/components/base/Button";
import { DateSelect } from "@/components/onboarding/DateSelect";
import { BehavioralIcon, DsaIcon, SystemDesignIcon } from "@/components/icons/Icons";
import { HoursPerWeek } from "@/components/onboarding/HoursPerWeek";
import { experienceLevels, interviewTypes, preferencesByType, roles, type InterviewTypeKey } from "@/data/onboarding";
import { advancedPlanContent } from "@/data/advancedPlan";
import { StreamingMarkdown } from "@/components/plan/StreamingMarkdown";
import { PlanHeader } from "@/components/plan/PlanHeader";
import { DropdownSelect } from "@/components/base/DropdownSelect";
import { StepTransition } from "@/components/base/StepTransition";

type Step = 0 | 1 | 2 | 3;

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>(0);
  const [selectedType, setSelectedType] = useState<InterviewTypeKey | null>(null);
  const [basic, setBasic] = useState({ name: "", role: roles[0].value, level: experienceLevels[0].value });

  const next = () => setStep((s) => Math.min(3, (s + 1) as Step));
  const back = () => setStep((s) => Math.max(0, (s - 1) as Step));

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <GlassCard className="p-6 sm:p-10">
        <div className="flex justify-center mb-6 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${step >= i ? "bg-[var(--electric-blue)]" : "bg-white/20"}`} />
          ))}
        </div>

        <StepTransition step={step}>
          {step === 0 && (
            <StepBasic basic={basic} setBasic={setBasic} onNext={next} />
          )}
          {step === 1 && (
            <StepGoalSetup selected={selectedType} onSelect={setSelectedType} onBack={back} onNext={next} />
          )}
          {step === 2 && <StepPreferences type={selectedType} onBack={back} onNext={next} />}
          {step === 3 && <StepConfirm onBack={back} />}
        </StepTransition>
      </GlassCard>
    </section>
  );
}

function StepBasic({ basic, setBasic, onNext }: { basic: { name: string; role: string; level: string }; setBasic: (v: { name: string; role: string; level: string }) => void; onNext: () => void }) {
  const canContinue = basic.name.trim().length > 1;
  return (
    <div className="space-y-6">
      <header className="text-center">
        <h2 className="text-2xl font-semibold mb-1">Tell us about you</h2>
        <p className="text-[var(--text-secondary)]">We will personalize your prep.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-3">
          <label className="text-sm text-[var(--text-secondary)]">Name</label>
          <input value={basic.name} onChange={(e) => setBasic({ ...basic, name: e.target.value })} placeholder="Your name" className="mt-2 w-full bg-transparent border border-white/10 rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-[var(--text-secondary)]">Current Role</label>
          <div className="mt-2">
            <DropdownSelect value={basic.role} onChange={(v) => setBasic({ ...basic, role: v })} options={roles} />
          </div>
        </div>
        <div>
          <label className="text-sm text-[var(--text-secondary)]">Experience Level</label>
          <div className="mt-2">
            <DropdownSelect value={basic.level} onChange={(v) => setBasic({ ...basic, level: v })} options={experienceLevels} />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canContinue} className={!canContinue ? "opacity-60 cursor-not-allowed" : ""}>Continue →</Button>
      </div>
    </div>
  );
}

function StepGoalSetup({ selected, onSelect, onBack, onNext }: { selected: InterviewTypeKey | null; onSelect: (v: InterviewTypeKey) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <header className="text-center">
        <h2 className="text-2xl font-semibold mb-1">Goal setup</h2>
        <p className="text-[var(--text-secondary)]">Choose interview type, target date and hours/week.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {interviewTypes.map((c) => (
          <button key={c.key} className="text-left" onClick={() => onSelect(c.key)} aria-pressed={selected === c.key}>
            <GlassCard className={`p-5 h-full interactive ${selected === c.key ? "ring-2 ring-[var(--electric-blue)]" : ""}`}>
              <div className="mb-2">{c.icon === "dsa" ? <DsaIcon /> : c.icon === "system" ? <SystemDesignIcon /> : <BehavioralIcon />}</div>
              <div className="text-lg font-medium">{c.label}</div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">{c.desc}</div>
            </GlassCard>
          </button>
        ))}
      </div>
      <StepScheduleInline />
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={!selected} className={!selected ? "opacity-60 cursor-not-allowed" : ""}>Continue →</Button>
      </div>
    </div>
  );
}

function StepSchedule({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [date, setDate] = useState<Date | null>(null);
  const [hours, setHours] = useState<number>(6);
  const summary = (() => {
    if (!date) return "Pick a date to see plan summary";
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const weeks = Math.max(1, Math.ceil(days / 7));
    const est = weeks * hours;
    return `${weeks} weeks • ~${est} hrs total`;
  })();
  return (
    <div className="space-y-6">
      <header className="text-center">
        <h2 className="text-2xl font-semibold mb-1">Set timeline</h2>
        <p className="text-[var(--text-secondary)]">Target date and hours per week.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <label className="text-sm text-[var(--text-secondary)]">Target Date</label>
          <DateSelect value={date} onChange={setDate as (d: Date) => void} />
        </GlassCard>
        <GlassCard className="p-4">
          <label className="text-sm text-[var(--text-secondary)]">Hours / week</label>
          <HoursPerWeek value={hours} onChange={setHours} />
        </GlassCard>
      </div>
      <div className="text-sm text-[var(--text-secondary)]">{summary}</div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={!date} className={!date ? "opacity-60 cursor-not-allowed" : ""}>Continue →</Button>
      </div>
    </div>
  );
}

function StepScheduleInline() {
  const [date, setDate] = useState<Date | null>(null);
  const [hours, setHours] = useState<number>(6);
  const summary = (() => {
    if (!date) return "Pick a date to see plan summary";
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const weeks = Math.max(1, Math.ceil(days / 7));
    const est = weeks * hours;
    return `${weeks} weeks • ~${est} hrs total`;
  })();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <GlassCard className="p-4">
        <label className="text-sm text-[var(--text-secondary)]">Target Date</label>
        <DateSelect value={date} onChange={setDate as (d: Date) => void} />
      </GlassCard>
      <GlassCard className="p-4">
        <label className="text-sm text-[var(--text-secondary)]">Hours / week</label>
        <HoursPerWeek value={hours} onChange={setHours} />
      </GlassCard>
      <div className="sm:col-span-2 text-sm text-[var(--text-secondary)]">{summary}</div>
    </div>
  );
}

function StepPreferences({ type, onBack, onNext }: { type: InterviewTypeKey | null; onBack: () => void; onNext: () => void }) {
  const questions = useMemo(() => (type ? preferencesByType[type] : []), [type]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  return (
    <div className="space-y-6">
      <header className="text-center">
        <h2 className="text-2xl font-semibold mb-1">Your preferences</h2>
        <p className="text-[var(--text-secondary)]">Quick picks to tailor the plan.</p>
      </header>
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id}>
            <div className="mb-2 text-sm">{q.text}</div>
            <div className="flex flex-wrap gap-2">
              {q.options.map((o) => (
                <button key={o} onClick={() => set(q.id, o)} className={`px-3 py-1.5 rounded-full text-sm ${answers[q.id] === o ? "gradient-primary text-white" : "bg-white/5 hover:bg-white/10"}`}>{o}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} disabled={questions.length > 0 && Object.keys(answers).length === 0} className={questions.length > 0 && Object.keys(answers).length === 0 ? "opacity-60 cursor-not-allowed" : ""}>Continue →</Button>
      </div>
    </div>
  );
}

function StepConfirm({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <header className="text-center">
        <h2 className="text-2xl font-semibold mb-1">AI Roadmap</h2>
        <p className="text-[var(--text-secondary)]">Here is a suggested plan. You can start now.</p>
      </header>
      <div className="glass-card p-4 space-y-4">
        <PlanHeader
          title="Personalized Prep Roadmap"
          subtitle="Generated by TayyariAI based on your goals"
          onAdjust={() => {}}
          onAccept={() => {}}
        />
        <StreamingMarkdown content={advancedPlanContent} />
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button>Start</Button>
      </div>
    </div>
  );
}


