"use client";

import { Button } from "@/components/base/Button";

type Props = {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  isLoading?: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
};

export function OnboardingActions({
  currentStep,
  totalSteps,
  canProceed,
  isLoading = false,
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Back",
}: Props) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20">
      <div className="mx-auto max-w-3xl px-4 pb-4">
        <div className="glass-card rounded-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isFirstStep && (
                <Button variant="ghost" onClick={onBack} disabled={isLoading}>
                  ← {backLabel}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-6">
              {/* Progress indicator */}
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <span>{currentStep + 1} of {totalSteps}</span>
                <div className="flex gap-1.5">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-8 rounded-full transition-all duration-300 ${
                        i <= currentStep ? "bg-electric-blue" : "bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={onNext}
                disabled={!canProceed || isLoading}
                className={`${!canProceed ? "opacity-50 cursor-not-allowed" : ""} min-w-[120px]`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : (
                  `${nextLabel} ${isLastStep ? "🚀" : "→"}`
                )}
              </Button>
            </div>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="mt-3 text-xs text-text-muted text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Enter</kbd> to continue
            {!isFirstStep && (
              <> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Esc</kbd> to go back</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
