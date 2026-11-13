import { Check } from 'lucide-react';
import type { LifecycleStep } from '../../types';
import { LIFECYCLE_STEPS, lifecycleStepMeta, stepState } from '../../lib/lifecycle';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface Props {
  currentStep: LifecycleStep;
  selectedStep: LifecycleStep;
  onSelect: (step: LifecycleStep) => void;
}

export function ClientStepper({ currentStep, selectedStep, onSelect }: Props) {
  const currentMeta = lifecycleStepMeta(currentStep);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Ciclo de vida del expediente
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-600">
            Paso {currentStep} de 5 · {currentMeta.title}
          </p>
        </div>
        <Badge variant="brand" className="text-[9px]">
          Responsable actual: {currentMeta.owner}
        </Badge>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <ol className="flex min-w-[760px] items-stretch">
          {LIFECYCLE_STEPS.map((step, index) => {
            const state = stepState(step.id, currentStep);
            const selected = step.id === selectedStep;
            const Icon = step.icon;
            return (
              <li key={step.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  title={`${step.description} · ${step.owner}`}
                  className={cn(
                    'flex flex-1 items-center gap-2 px-3 py-3 text-left transition-colors',
                    selected ? 'bg-brand-50/60' : 'hover:bg-slate-50/70',
                  )}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums transition',
                      state === 'complete' && 'border-emerald-600 bg-emerald-600 text-white',
                      state === 'current' && 'border-brand-900 bg-brand-900 text-white',
                      state === 'future' &&
                        (selected
                          ? 'border-brand-300 bg-brand-50 text-brand-800'
                          : 'border-slate-200 bg-white text-slate-400'),
                    )}
                  >
                    {state === 'complete' ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-[8.5px] font-semibold uppercase tracking-[0.08em]',
                        state === 'complete'
                          ? 'text-emerald-600'
                          : state === 'current'
                            ? 'text-brand-700'
                            : 'text-slate-400',
                      )}
                    >
                      Paso {step.id}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block truncate text-[11px] font-medium leading-tight',
                        state === 'complete'
                          ? 'text-slate-600'
                          : state === 'current'
                            ? 'text-brand-950'
                            : selected
                              ? 'text-brand-900'
                              : 'text-slate-400',
                      )}
                    >
                      {step.short}
                    </span>
                    <span className="mt-0.5 block truncate text-[8.5px] leading-tight text-slate-400">
                      {step.owner}
                    </span>
                  </span>
                </button>
                {index < LIFECYCLE_STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      'h-px w-4 shrink-0',
                      state === 'complete' ? 'bg-emerald-300' : 'bg-slate-200',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
