import { AlertCircle, CheckCircle2, Clock, FileWarning, XCircle } from 'lucide-react';
import type { DocStatus, GlobalStatus } from '../../types';
import { GLOBAL_STATUS_META, STATUS_META } from '../../lib/constants';
import { cn } from '../../lib/utils';

const STATUS_ICONS: Record<DocStatus, typeof CheckCircle2> = {
  vigente: CheckCircle2,
  'por-vencer': Clock,
  observado: AlertCircle,
  vencido: XCircle,
  rechazado: FileWarning,
  faltante: FileWarning,
};

export function DocStatusBadge({
  status,
  compact = false,
  className,
}: {
  status: DocStatus;
  compact?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold leading-none',
        meta.chip,
        className,
      )}
      title={meta.helper}
    >
      {compact ? (
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {meta.label}
    </span>
  );
}

export function GlobalStatusBadge({
  status,
  className,
}: {
  status: GlobalStatus;
  className?: string;
}) {
  const meta = GLOBAL_STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold leading-none',
        meta.chip,
        className,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'vigente' ? 'bg-emerald-500' : status === 'parcial' ? 'bg-amber-500' : 'bg-red-500',
        )}
      />
      {meta.short}
    </span>
  );
}

export function ConfidenceBadge({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 90
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : pct >= 85
        ? 'bg-sky-50 text-sky-700 border-sky-200'
        : pct >= 70
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
        tone,
        className,
      )}
    >
      {pct}%
    </span>
  );
}
