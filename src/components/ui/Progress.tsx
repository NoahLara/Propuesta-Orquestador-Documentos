import { cn } from '../../lib/utils';

export function Progress({
  value,
  tone = 'brand',
  className,
  height = 'h-2',
}: {
  value: number;
  tone?: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'emerald';
  className?: string;
  height?: string;
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-700',
    accent: 'bg-accent-500',
    success: 'bg-emerald-500',
    emerald: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-slate-100', height, className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Gauge({
  value,
  size = 88,
  label,
  tone = 'brand',
}: {
  value: number;
  size?: number;
  label?: string;
  tone?: 'brand' | 'emerald' | 'amber' | 'red';
}) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const tones: Record<string, string> = {
    brand: 'stroke-brand-700',
    emerald: 'stroke-emerald-500',
    amber: 'stroke-amber-500',
    red: 'stroke-red-500',
  };
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={8}
          className="stroke-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(tones[tone], 'transition-all duration-700')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums text-brand-950">{Math.round(value)}%</span>
        {label && <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>}
      </div>
    </div>
  );
}
