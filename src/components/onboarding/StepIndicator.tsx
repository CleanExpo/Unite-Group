"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
}

export function StepIndicator({ steps, currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center w-full max-w-lg mx-auto">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isCurrent = currentStep === index;
        const stepNumber = index + 1;

        return (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2",
                  isCompleted
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : isCurrent
                    ? "bg-transparent border-[var(--red-500)] text-[var(--red-500)]"
                    : "bg-transparent border-zinc-700 text-zinc-500"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  stepNumber
                )}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    isCurrent ? "text-white" : isCompleted ? "text-zinc-400" : "text-zinc-600"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[10px] text-zinc-600 mt-0.5 hidden sm:block">
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-3 mt-[-24px]">
                <div
                  className={cn(
                    "h-[2px] w-full rounded-full transition-all duration-500",
                    completedSteps.includes(index)
                      ? "bg-emerald-500"
                      : "bg-zinc-800"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
