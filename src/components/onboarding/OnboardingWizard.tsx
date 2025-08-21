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
import { useAuth } from "@/lib/auth/AuthContext";

type Step = 0 | 1 | 2 | 3;

const stepConfig = [
  { title: "Tell us about you", subtitle: "We'll personalize your prep" },
  { title: "Goal setup", subtitle: "Choose focus and timeline" },
  { title: "Your preferences", subtitle: "Quick picks to tailor the plan" },
  { title: "Your AI roadmap", subtitle: "Personalized plan ready!" },
];

export function OnboardingWizard() {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [selectedType, setSelectedType] = useState<InterviewTypeKey | null>(null);
  const [basic, setBasic] = useState({ 
    name: user?.name || "", 
    role: roles[0].value, 
    level: experienceLevels[0].value 
  });
  const [date, setDate] = useState<Date | null>(null);
  const [hours, setHours] = useState<number>(6);
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const next = useCallback(async () => {
    if (step < 3) {
      setIsLoading(true);
      setError('');
      
      // If this is the final step, save to database
      if (step === 2) {
        try {
          await completeOnboarding();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save onboarding data');
          setIsLoading(false);
          return;
        }
      }
      setTimeout(() => {
        setStep((s) => {
          const nextStep = Math.min(3, s + 1);
          return nextStep as Step;
        });
        setIsLoading(false);
        // Scroll to top on step change
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
    }
  }, [step, basic, selectedType, date, hours, preferences]);

  const completeOnboarding = async () => {
    if (!selectedType || !date) {
      throw new Error('Please complete all required fields');
    }

    const onboardingData = {
      name: basic.name,
      role: basic.role,
      experienceLevel: basic.level,
      interviewType: selectedType,
      targetDate: date.toISOString(),
      hoursPerWeek: hours,
      preferences,
    };

    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onboardingData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save onboarding data');
    }

    // Update user state
    updateUser({ onboardingCompleted: true });
  };
  const back = useCallback(() => {
    setStep((s) => {
      const prevStep = Math.max(0, s - 1);
      return prevStep as Step;
    });
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

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

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
          <label className="text-sm text-text-secondary">Name</label>
          <input 
            value={basic.name} 
            onChange={(e) => setBasic({ ...basic, name: e.target.value })} 
            placeholder="Your name" 
            className="mt-2 w-full bg-transparent border border-white/10 rounded-md px-3 py-2 focus:border-electric-blue transition-colors" 
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm text-text-secondary">Current Role</label>
          <div className="mt-2">
            <DropdownSelect value={basic.role} onChange={(v) => setBasic({ ...basic, role: v })} options={roles} />
          </div>
        </div>
        <div>
          <label className="text-sm text-text-secondary">Experience Level</label>
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
              <GlassCard className={`p-5 h-full interactive ${selected === c.key ? "ring-2 ring-electric-blue" : ""}`}>
                <div className="mb-2">{c.icon === "dsa" ? <DsaIcon /> : c.icon === "system" ? <SystemDesignIcon /> : <BehavioralIcon />}</div>
                <div className="text-lg font-medium">{c.label}</div>
                <div className="text-sm text-text-secondary mt-1">{c.desc}</div>
              </GlassCard>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Timeline & Commitment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <label className="text-sm text-text-secondary">Target Date</label>
            <DateSelect value={date} onChange={setDate} />
          </GlassCard>
          <GlassCard className="p-4">
            <label className="text-sm text-text-secondary">Hours / week</label>
            <HoursPerWeek value={hours} onChange={setHours} />
          </GlassCard>
        </div>
        {date && (
          <div className="text-sm text-text-secondary text-center">
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
        <div className="text-center py-8 text-text-secondary">
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


