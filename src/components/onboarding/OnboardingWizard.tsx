"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/base/GlassCard";
import { Button } from "@/components/base/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { BehavioralIcon, DsaIcon, SystemDesignIcon } from "@/components/icons/Icons";
import { HoursPerWeek } from "@/components/onboarding/HoursPerWeek";
import { experienceLevels, interviewTypes, roles, type InterviewTypeKey } from "@/data/onboarding";
import { advancedPlanContent } from "@/data/advancedPlan";
import { RoadmapViewer } from "@/components/plan/RoadmapViewer";
import { DropdownSelect } from "@/components/base/DropdownSelect";
import { StepTransition } from "@/components/base/StepTransition";
import { OnboardingActions } from "@/components/onboarding/OnboardingActions";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { ConceptSelection } from "@/components/onboarding/ConceptSelection";
import { LearningPlanCustomization } from "@/components/onboarding/LearningPlanCustomization";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRouter } from "next/navigation";

type Step = 0 | 1 | 2 | 3 | 4;

const stepConfig = [
  { title: "Tell us about you", subtitle: "We'll personalize your prep" },
  { title: "Goal setup", subtitle: "Choose focus and timeline" },
  { title: "Learning concepts", subtitle: "What do you want to learn?" },
  { title: "Customize plan", subtitle: "Fine-tune your learning journey" },
  { title: "Your AI roadmap", subtitle: "Personalized plan ready!" },
];

export function OnboardingWizard() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [selectedType, setSelectedType] = useState<InterviewTypeKey | null>(null);
  const [basic, setBasic] = useState({ 
    name: user?.name || "", 
    role: roles[0].value, 
    level: experienceLevels[0].value 
  });
  const [date, setDate] = useState<Date | null>(null);
  const [hours, setHours] = useState<number>(6);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [learningPlan, setLearningPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [error, setError] = useState('');

  const next = useCallback(async () => {
    if (step < 4) {
      setIsLoading(true);
      setError('');
      
      // Generate learning plan when moving from concepts to plan customization
      if (step === 2) {
        try {
          await generateLearningPlan();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to generate learning plan');
          setIsLoading(false);
          return;
        }
      }
      
      // If this is the final step, save to database and redirect
      if (step === 3) {
        try {
          await completeOnboarding();
          // Redirect to chat after successful completion
          setTimeout(() => {
            router.push('/chat');
          }, 1000);
          return; // Don't proceed to step 4, redirect instead
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save onboarding data');
          setIsLoading(false);
          return;
        }
      }
      setTimeout(() => {
        setStep((s) => {
          const nextStep = Math.min(4, s + 1);
          return nextStep as Step;
        });
        setIsLoading(false);
        // Scroll to top on step change
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
    }
  }, [step, basic, selectedType, date, hours, selectedConcepts, preferences, learningPlan]);

  const generateLearningPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const totalWeeks = date ? Math.max(4, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))) : 12;
      
      // Call AI to generate a personalized learning plan
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Generate a personalized learning plan for:
- Experience Level: ${basic.level}
- Role: ${basic.role}
- Interview Focus: ${selectedType || 'general'}
- Time Available: ${hours} hours per week for ${totalWeeks} weeks
- Selected Concepts: ${selectedConcepts.length > 0 ? selectedConcepts.join(', ') : 'None selected'}
- Target Date: ${date ? date.toDateString() : 'Not specified'}

Please create a detailed learning plan with weekly milestones, specific topics to cover, and practice recommendations. Format it as a structured plan with clear phases and actionable steps.`,
          maxTokens: 1500,
          temperature: 0.7,
        }),
      });

      let aiGeneratedPlan = '';
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages?.[1]?.content) {
          aiGeneratedPlan = data.messages[1].content;
        }
      }

      // Create structured plan object
      const plan = {
        id: 'plan-1',
        name: selectedConcepts.length > 0 ? 'My Personalized Learning Plan' : 'AI-Generated Learning Plan',
        description: aiGeneratedPlan || (selectedConcepts.length > 0 
          ? 'Personalized learning plan based on your selected concepts'
          : 'AI-generated learning plan tailored to your goals'),
        totalWeeks,
        hoursPerWeek: hours,
        aiGenerated: !!aiGeneratedPlan,
        concepts: selectedConcepts.length > 0 
          ? selectedConcepts.map((conceptId, index) => ({
              conceptId,
              name: conceptId,
              estimatedDuration: Math.ceil(totalWeeks / selectedConcepts.length),
              weeklyHours: Math.floor(hours / selectedConcepts.length) || 1,
              priority: index === 0 ? 'high' : 'medium',
              milestones: [`Complete ${conceptId} basics`, `Master ${conceptId} advanced topics`],
            }))
          : [{
              conceptId: 'general',
              name: 'General Learning',
              estimatedDuration: totalWeeks,
              weeklyHours: hours,
              priority: 'medium',
              milestones: ['Set up learning environment', 'Choose your first concept'],
            }],
        schedule: {
          preferredDays: ['monday', 'wednesday', 'friday'],
          preferredTimes: ['evening'],
          sessionDuration: 60,
          breakDuration: 10,
          studyPattern: 'regular',
        },
        milestones: [
          {
            id: 'milestone-1',
            name: 'First Week Complete',
            description: 'Complete your first week of learning',
            targetWeek: 1,
            conceptIds: selectedConcepts.length > 0 ? selectedConcepts : ['general'],
          },
          {
            id: 'milestone-2',
            name: 'Halfway Point',
            description: 'Reach 50% completion',
            targetWeek: Math.ceil(totalWeeks / 2),
            conceptIds: selectedConcepts.length > 0 ? selectedConcepts : ['general'],
          },
        ],
      };
      
      setLearningPlan(plan);
    } catch (error) {
      console.error('Failed to generate AI plan:', error);
      // Fallback to basic plan
      const totalWeeks = date ? Math.max(4, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))) : 12;
      const fallbackPlan = {
        id: 'plan-1',
        name: 'Basic Learning Plan',
        description: 'A structured learning plan to help you achieve your goals',
        totalWeeks,
        hoursPerWeek: hours,
        aiGenerated: false,
        concepts: selectedConcepts.length > 0 
          ? selectedConcepts.map((conceptId, index) => ({
              conceptId,
              name: conceptId,
              estimatedDuration: Math.ceil(totalWeeks / selectedConcepts.length),
              weeklyHours: Math.floor(hours / selectedConcepts.length) || 1,
              priority: index === 0 ? 'high' : 'medium',
              milestones: [`Complete ${conceptId} basics`, `Master ${conceptId} advanced topics`],
            }))
          : [{
              conceptId: 'general',
              name: 'General Learning',
              estimatedDuration: totalWeeks,
              weeklyHours: hours,
              priority: 'medium',
              milestones: ['Set up learning environment', 'Choose your first concept'],
            }],
        schedule: {
          preferredDays: ['monday', 'wednesday', 'friday'],
          preferredTimes: ['evening'],
          sessionDuration: 60,
          breakDuration: 10,
          studyPattern: 'regular',
        },
        milestones: [
          {
            id: 'milestone-1',
            name: 'First Week Complete',
            description: 'Complete your first week of learning',
            targetWeek: 1,
            conceptIds: selectedConcepts.length > 0 ? selectedConcepts : ['general'],
          },
          {
            id: 'milestone-2',
            name: 'Halfway Point',
            description: 'Reach 50% completion',
            targetWeek: Math.ceil(totalWeeks / 2),
            conceptIds: selectedConcepts.length > 0 ? selectedConcepts : ['general'],
          },
        ],
      };
      setLearningPlan(fallbackPlan);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const completeOnboarding = async () => {
    // Basic info is required, but other fields are optional
    if (!basic.name.trim()) {
      throw new Error('Please enter your name');
    }

    // Generate preferences from the data we have (consolidating step 3 and removed step 4)
    const consolidatedPreferences = {
      difficulty: basic.level === 'beginner' ? 'easy' : basic.level === 'intermediate' ? 'medium' : 'hard',
      learningStyle: basic.level === 'beginner' ? 'visual' : 'hands-on',
      studyReminders: true,
      weeklyReports: true,
      focusAreas: selectedType ? [selectedType] : [],
      timePreference: hours >= 15 ? 'intensive' : hours >= 10 ? 'regular' : 'light',
    };

    const onboardingData = {
      name: basic.name,
      role: basic.role,
      experienceLevel: basic.level,
      interviewType: selectedType,
      targetDate: date?.toISOString(),
      hoursPerWeek: hours,
      selectedConcepts,
      preferences: consolidatedPreferences, // Use consolidated preferences
      learningPlan,
      skipConceptSelection: selectedConcepts.length === 0,
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

  // Available concepts based on user's experience level and interview type
  const availableConcepts = useMemo(() => {
    const baseConcepts = [
      {
        id: 'javascript-fundamentals',
        name: 'JavaScript Fundamentals',
        description: 'Master JavaScript basics, ES6+, and modern features',
        category: 'programming',
        difficulty: 'beginner' as const,
        estimatedHours: 40,
        prerequisites: [],
        isRecommended: basic.level === 'beginner' || selectedType === 'dsa',
      },
      {
        id: 'data-structures-algorithms',
        name: 'Data Structures & Algorithms',
        description: 'Master arrays, trees, graphs, and algorithmic thinking',
        category: 'programming',
        difficulty: 'intermediate' as const,
        estimatedHours: 80,
        prerequisites: [],
        isRecommended: selectedType === 'dsa' || selectedType === 'full',
      },
      {
        id: 'system-design-fundamentals',
        name: 'System Design Fundamentals',
        description: 'Learn to design scalable, distributed systems',
        category: 'system-design',
        difficulty: 'advanced' as const,
        estimatedHours: 60,
        prerequisites: ['data-structures-algorithms'],
        isRecommended: selectedType === 'system' || selectedType === 'full' || basic.level === 'advanced',
      },
      {
        id: 'behavioral-interview-prep',
        name: 'Behavioral Interview Preparation',
        description: 'Master STAR method and leadership storytelling',
        category: 'soft-skills',
        difficulty: 'beginner' as const,
        estimatedHours: 20,
        prerequisites: [],
        isRecommended: selectedType === 'behavioral' || selectedType === 'full',
      },
      {
        id: 'react-development',
        name: 'React Development',
        description: 'Build modern web applications with React',
        category: 'programming',
        difficulty: 'intermediate' as const,
        estimatedHours: 50,
        prerequisites: ['javascript-fundamentals'],
        isRecommended: basic.role.includes('frontend') || basic.role.includes('full-stack'),
      },
      {
        id: 'database-design',
        name: 'Database Design & SQL',
        description: 'Master relational databases and SQL optimization',
        category: 'backend',
        difficulty: 'intermediate' as const,
        estimatedHours: 40,
        prerequisites: [],
        isRecommended: basic.role.includes('backend') || selectedType === 'system',
      },
      {
        id: 'api-design',
        name: 'API Design & Development',
        description: 'Design RESTful APIs and understand GraphQL',
        category: 'backend',
        difficulty: 'intermediate' as const,
        estimatedHours: 35,
        prerequisites: [],
        isRecommended: basic.role.includes('backend') || basic.role.includes('full-stack'),
      },
      {
        id: 'cloud-architecture',
        name: 'Cloud Architecture',
        description: 'Learn AWS, Docker, and cloud deployment strategies',
        category: 'devops',
        difficulty: 'advanced' as const,
        estimatedHours: 70,
        prerequisites: ['system-design-fundamentals'],
        isRecommended: basic.level === 'advanced' || selectedType === 'system',
      },
    ];

    // Filter and sort based on user preferences
    return baseConcepts
      .filter(concept => {
        // Show beginner concepts for beginners
        if (basic.level === 'beginner' && concept.difficulty === 'advanced') {
          return false;
        }
        // Show relevant concepts based on interview type
        if (selectedType === 'dsa' && concept.category === 'soft-skills') {
          return concept.id === 'behavioral-interview-prep'; // Still show behavioral prep
        }
        if (selectedType === 'behavioral' && concept.category !== 'soft-skills') {
          return concept.isRecommended; // Only show highly recommended technical concepts
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by recommendation first, then by difficulty
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        
        const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      });
  }, [basic.level, basic.role, selectedType]);

  // Validation logic
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return basic.name.trim().length > 1;
      case 1: return true; // Goal setup is optional (can proceed without selecting type/date)
      case 2: return true; // Concept selection is optional
      case 3: return true; // Plan customization is optional
      case 4: return true; // Final step
      default: return false;
    }
  }, [step, basic.name]);

  return (
    <div className="min-h-screen pb-24">
      <section className="mx-auto max-w-3xl px-4 py-10">
        <GlassCard className="p-6 sm:p-10">
          <OnboardingProgress currentStep={step} totalSteps={5} steps={stepConfig} />

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
              <StepConceptSelection 
                availableConcepts={availableConcepts}
                selectedConcepts={selectedConcepts}
                onConceptsChange={setSelectedConcepts}
                onSkip={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <StepPlanCustomization 
                plan={learningPlan}
                onPlanChange={setLearningPlan}
                onGenerate={generateLearningPlan}
                isGenerating={isGeneratingPlan}
              />
            )}
            {step === 4 && <StepConfirm />}
          </StepTransition>
        </GlassCard>
      </section>

      <OnboardingActions
        currentStep={step}
        totalSteps={5}
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
            <label className="text-sm text-text-secondary mb-2 block">Target Date</label>
            <DatePicker 
              value={date} 
              onChange={setDate}
              placeholder="Select your target date"
              minDate={new Date()}
            />
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





function StepConceptSelection({ 
  availableConcepts, 
  selectedConcepts, 
  onConceptsChange, 
  onSkip 
}: { 
  availableConcepts: any[];
  selectedConcepts: string[];
  onConceptsChange: (concepts: string[]) => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      <ConceptSelection
        availableConcepts={availableConcepts}
        selectedConcepts={selectedConcepts}
        onConceptsChange={onConceptsChange}
        onSkip={onSkip}
        maxSelections={5}
        showRecommendations={true}
      />
    </div>
  );
}

function StepPlanCustomization({ 
  plan, 
  onPlanChange, 
  onGenerate, 
  isGenerating 
}: { 
  plan: any;
  onPlanChange: (plan: any) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="space-y-6">
      <LearningPlanCustomization
        initialPlan={plan}
        onPlanChange={onPlanChange}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
      />
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


