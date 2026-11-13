import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type Variant =
  | 'primary'
  | 'brand'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'subtle'
  | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent-500 text-white border border-accent-500 hover:bg-accent-600 active:bg-accent-700',
  brand:
    'bg-brand-900 text-white border border-brand-900 hover:bg-brand-800 active:bg-brand-950',
  secondary:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-brand-900 hover:border-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-brand-900 border border-transparent',
  danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700',
  success: 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700',
  subtle:
    'bg-brand-50 text-brand-900 border border-brand-100 hover:bg-brand-100 hover:border-brand-200',
  dark: 'bg-brand-950 text-white border border-brand-950 hover:bg-brand-900',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-3.5 text-[13px] rounded-md gap-2',
  lg: 'h-10 px-4 text-sm rounded-md gap-2',
  icon: 'h-9 w-9 rounded-md',
  'icon-sm': 'h-8 w-8 rounded-md',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900/20 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
}
