import {
  CheckCircle2,
  Database,
  FileSearch,
  Inbox,
  ShieldCheck,
  Tags,
  type LucideIcon,
} from 'lucide-react';
import type { UploadJob } from '../../types';
import { cn } from '../../lib/utils';

interface StepMeta {
  id: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

const STEPS: StepMeta[] = [
  { id: 'classify', label: 'Clasificación', short: 'Clasifica', icon: Tags },
  { id: 'extract', label: 'Extracción IA', short: 'Extrae', icon: FileSearch },
  { id: 'validate', label: 'Validación', short: 'Valida', icon: ShieldCheck },
  { id: 'index', label: 'Indexación', short: 'Indexa', icon: Database },
  { id: 'result', label: 'Resultado', short: 'Resultado', icon: CheckCircle2 },
];

export function ValidationStepper({ job }: { job: UploadJob }) {
  const current = job.phase === 'pending' ? -1 : Math.min(4, job.step - 1);
  const terminal = job.phase === 'done' || job.phase === 'queued';
  const progress = current <= 0 ? 0 : (current / 4) * 100;

  return (
    <div className="relative">
      <div className="absolute left-[10%] right-[10%] top-[11px] h-[2px] rounded-full bg-slate-100" />
      <div
        className={cn(
          'absolute left-[10%] top-[11px] h-[2px] rounded-full transition-[width] duration-500',
          job.phase === 'queued' ? 'bg-amber-400' : 'bg-emerald-400',
        )}
        style={{ width: `${(progress * 0.8).toFixed(1)}%` }}
      />
      <div className="relative grid grid-cols-5 gap-1">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isResult = step.id === 'result';
          const done = index < current || (isResult && terminal);
          const active = index === current && !terminal;
          const resultQueued = isResult && job.phase === 'queued';
          const resultDone = isResult && job.phase === 'done';
          const label =
            isResult && resultQueued
              ? 'En cola'
              : isResult && resultDone
                ? 'Indexado'
                : step.label;

          return (
            <div key={step.id} className="flex min-w-0 flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-[23px] w-[23px] items-center justify-center rounded-full border text-white transition-all duration-300',
                  resultQueued
                    ? 'border-amber-600 bg-amber-500'
                    : done
                      ? 'border-emerald-600 bg-emerald-500'
                      : active
                        ? 'border-brand-900 bg-brand-900 ring-4 ring-brand-100'
                        : 'border-slate-200 bg-white text-slate-300',
                  active && 'animate-pulse-soft',
                )}
                title={label}
              >
                {done || (isResult && terminal) ? (
                  resultQueued ? (
                    <Inbox className="h-3 w-3" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </span>
              <span
                className={cn(
                  'max-w-full truncate text-center text-[8.5px] font-semibold leading-tight',
                  resultQueued
                    ? 'text-amber-700'
                    : done || active
                      ? 'text-brand-900'
                      : 'text-slate-400',
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
