import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Alert({
  tone = 'info',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'brand';
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    brand: 'border-brand-200 bg-brand-50 text-brand-900',
  };
  return (
    <div className={cn('flex gap-2.5 rounded-lg border px-3.5 py-3 text-xs', tones[tone], className)}>
      <span className="mt-0.5 shrink-0">
        {icon ?? <AlertTriangle className="h-4 w-4" />}
      </span>
      <div className="min-w-0 leading-relaxed">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div className="text-[11px] leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-brand-950">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
