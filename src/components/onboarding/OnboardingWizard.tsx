"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/base/GlassCard";
import { Button } from "@/components/base/Button";
import { DateSelect } from "@/components/onboarding/DateSelect";
import { BehavioralIcon, DsaIcon, SystemDesignIcon } from "@/components/icons/Icons";
import { HoursPerWeek } from "@/components/onboarding/HoursPerWeek";
import { experienceLevels, interviewTypes, preferencesByType, roles, type InterviewTypeKey } from "@/data/onboarding";
import { advancedPlanContent } from "@/data/advancedPlan";
import { RoadmapViewer } from "@/components/plan/RoadmapViewer";
import { DropdownSelect } from "@/components/base/DropdownSelect";
import { StepTransition } from "@/components/base/StepTransition";
import { OnboardingActions } from "@/components/onboarding/OnboardingActions";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

type Step = 0 | 1 | 2 | 3;

const stepConfig = [
  { title: "Tell us about you", subtitle: "We'll personalize your prep" },
  { title: "Goal setup", subtitle: "Choose focus and timeline" },
  { title: "Your preferences", subtitle: "Quick picks to tailor the plan" },
  { title: "Your AI roadmap", subtitle: "Personalized plan ready!" },
];

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>(0);
  const [selectedType, setSelectedType] = useState<InterviewTypeKey | null>(null);
  const [basic, setBasic] = useState({ name: "", role: roles[0].value, level: experienceLevels[0].value });
  const [date, setDate] = useState<Date | null>(null);
  const [hours, setHours] = useState<number>(6);
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const next = useCallback(() => {
    if (step < 3) {
      setIsLoading(true);
      setTimeout(() => {
        setStep((s) => Math.min(3, (s + 1) as Step));
        setIsLoading(false);
        // Scroll to top on step change
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
    }
  }, [step]);

  const back = useCallback(() => {
    setStep((s) => Math.max(0, (s - 1) as Step));
    // Scroll to top on step change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && canProceed && !isLoading) {
        e.preventDefault();
        next();
      } else if (e.key === "Escape" && step > 0) {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [next, back, step, isLoading]);

  // Validation logic
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return basic.name.trim().length > 1;
      case 1: return selectedType !== null && date !== null;
      case 2: return true; // Preferences are optional
      case 3: return true;
      default: return false;
    }
  }, [step, basic.name, selectedType, date]);

  return (
    <div className="min-h-screen pb-24">
      <section className="mx-auto max-w-3xl px-4 py-10">
        <GlassCard className="p-6 sm:p-10">
          <OnboardingProgress currentStep={step} totalSteps={4} steps={stepConfig} />

          <StepTransition step={step}>
            {step === 0 && (
              <StepBasic basic={basic} setBasic={setBasic} />
            )}
            {step === 1 && (
              <StepGoalSetup 
                selected={selectedType} 
                onSelect={setSelectedType}
                date={date}
                setDate={setDate}
                hours={hours}
                setHours={setHours}
              />
            )}
            {step === 2 && (
              <StepPreferences 
                type={selectedType} 
                answers={preferences}
                setAnswers={setPreferences}
              />
            )}
            {step === 3 && <StepConfirm />}
          </StepTransition>
        </GlassCard>
      </section>

      <OnboardingActions
        currentStep={step}
        totalSteps={4}
        canProceed={canProceed}
        isLoading={isLoading}
        onBack={back}
        onNext={next}
        nextLabel={step === 3 ? "Get Started" : "Continue"}
      />
    </div>
  );
}

function StepBasic({ basic, setBasic }: { basic: { name: string; role: string; level: string }; setBasic: (v: { name: string; role: string; level: string }) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-3">
          <label className="text-sm text-[var(--text-secondary)]">Name</label>
          <input 
            value={basic.name} 
            onChange={(e) => setBasic({ ...basic, name: e.target.value })} 
            placeholder="Your name" 
            className="mt-2 w-full bg-transparent border border-white/10 rounded-md px-3 py-2 focus:border-[var(--electric-blue)] transition-colors" 
            autoFocus
          />
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
    </div>
  );
}

function StepGoalSetup({ 
  selected, 
  onSelect, 
  date, 
  setDate, 
  hours, 
  setHours 
}: { 
  selected: InterviewTypeKey | null; 
  onSelect: (v: InterviewTypeKey) => void;
  date: Date | null;
  setDate: (d: Date) => void;
  hours: number;
  setHours: (h: number) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Interview Focus</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Timeline & Commitment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <label className="text-sm text-[var(--text-secondary)]">Target Date</label>
            <DateSelect value={date} onChange={setDate} />
          </GlassCard>
          <GlassCard className="p-4">
            <label className="text-sm text-[var(--text-secondary)]">Hours / week</label>
            <HoursPerWeek value={hours} onChange={setHours} />
          </GlassCard>
        </div>
        {date && (
          <div className="text-sm text-[var(--text-secondary)] text-center">
            {(() => {
              const now = new Date();
              const diffMs = date.getTime() - now.getTime();
              const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              const weeks = Math.max(1, Math.ceil(days / 7));
              const est = weeks * hours;
              return `${weeks} weeks • ~${est} hrs total`;
            })()}
          </div>
        )}
      </div>
    </div>
  );
}



function StepPreferences({ 
  type, 
  answers, 
  setAnswers 
}: { 
  type: InterviewTypeKey | null; 
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
}) {
  const questions = useMemo(() => (type ? preferencesByType[type] : []), [type]);
  const set = (id: string, v: string) => setAnswers({ ...answers, [id]: v });
  
  return (
    <div className="space-y-6">
      {questions.length > 0 ? (
        <div className="space-y-6">
          {questions.map((q) => (
            <div key={q.id}>
              <div className="mb-3 text-sm font-medium">{q.text}</div>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => (
                  <button 
                    key={o} 
                    onClick={() => set(q.id, o)} 
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      answers[q.id] === o 
                        ? "gradient-primary text-white" 
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <p>Perfect! We have everything we need to create your personalized roadmap.</p>
        </div>
      )}
    </div>
  );
}

function StepConfirm() {
  return (
    <div className="space-y-6">
      <RoadmapViewer
        content={advancedPlanContent}
        onBack={() => {}} // Handled by sticky actions
        onAccept={() => console.log("Starting roadmap...")}
        onTweak={() => console.log("Tweaking preferences...")}
      />
    </div>
  );
}


