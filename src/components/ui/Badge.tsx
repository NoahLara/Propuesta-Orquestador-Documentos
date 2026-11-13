import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant =
  | 'brand'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'purple'
  | 'outline'
  | 'info';

const VARIANTS: Record<Variant, string> = {
  brand: 'bg-brand-50 text-brand-900 border-brand-100',
  accent: 'bg-accent-50 text-accent-700 border-accent-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  outline: 'bg-transparent text-slate-600 border-slate-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
  dotClassName?: string;
  icon?: ReactNode;
  size?: 'xs' | 'sm';
}

export function Badge({
  variant = 'neutral',
  dot = false,
  dotClassName,
  icon,
  size = 'xs',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border font-medium leading-none',
        size === 'xs' ? 'px-1.5 py-1 text-[10px]' : 'px-2 py-1.5 text-xs',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full bg-current', dotClassName)} />}
      {icon}
      {children}
    </span>
  );
}
