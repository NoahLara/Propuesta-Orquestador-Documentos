import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Fingerprint,
  FilePlus2,
  Landmark,
  Scale,
  ShieldAlert,
  Store,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { DocCategory, DocStatus } from '../../types';
import { cn } from '../../lib/utils';

const CATEGORY_ICONS: Record<DocCategory, LucideIcon> = {
  Identidad: Fingerprint,
  Legal: Scale,
  Financiero: Wallet,
  Comercial: Store,
  Garantías: Landmark,
  PLAFT: ShieldAlert,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: DocCategory;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon className={cn('h-4 w-4', className)} />;
}

const STATUS_ICONS: Record<DocStatus, LucideIcon> = {
  vigente: CheckCircle2,
  'por-vencer': Clock,
  observado: AlertCircle,
  vencido: XCircle,
  rechazado: XCircle,
  faltante: FilePlus2,
};

const STATUS_STYLES: Record<DocStatus, string> = {
  vigente: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  'por-vencer': 'bg-amber-50 text-amber-600 ring-amber-100',
  observado: 'bg-amber-50 text-amber-600 ring-amber-100',
  vencido: 'bg-red-50 text-red-600 ring-red-100',
  rechazado: 'bg-red-50 text-red-600 ring-red-100',
  faltante: 'bg-slate-50 text-slate-400 ring-slate-100',
};

export function StatusCircle({ status, className }: { status: DocStatus; className?: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2',
        STATUS_STYLES[status],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
