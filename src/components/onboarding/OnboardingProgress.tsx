type Props = {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ title: string; subtitle?: string }>;
};

export function OnboardingProgress({ currentStep, totalSteps, steps }: Props) {
  return (
    <div className="mb-8">
      {/* Current step info */}
      <div className="text-center">
        <div className="text-sm text-[var(--text-secondary)]">
          Step {currentStep + 1} of {totalSteps}
        </div>
        <h2 className="text-2xl font-semibold mt-1">{steps[currentStep]?.title}</h2>
        {steps[currentStep]?.subtitle && (
          <p className="text-[var(--text-secondary)] mt-1">{steps[currentStep].subtitle}</p>
        )}
      </div>
    </div>
  );
}
