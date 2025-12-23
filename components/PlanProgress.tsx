import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface PlanStep {
  label: string;
  details: string;
  completed: boolean;
}

interface PlanProgressProps {
  plan: {
    title: string;
    description: string;
    steps: PlanStep[];
  };
  className?: string;
}

export const PlanProgress: React.FC<PlanProgressProps> = ({ plan, className }) => {
  return (
    <div className={cn("bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 my-4", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-neutral-200">{plan.title}</h3>
        <p className="text-xs text-neutral-400 mt-1">{plan.description}</p>
      </div>
      
      <div className="space-y-3">
        {plan.steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {step.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : index === plan.steps.findIndex(s => !s.completed) ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <Circle className="w-4 h-4 text-neutral-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn(
                "text-sm font-medium",
                step.completed ? "text-neutral-400 line-through" : "text-neutral-200"
              )}>
                {step.label}
              </div>
              {step.details && (
                <p className="text-xs text-neutral-500 mt-0.5">{step.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
