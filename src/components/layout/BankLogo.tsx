import { cn } from '../../lib/utils';

export function BankLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand-900">
        <span className="text-[11px] font-bold tracking-tight text-white">BI</span>
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-brand-950">Banco Integral</p>
          <p className="text-[9px] font-medium uppercase leading-tight tracking-[0.12em] text-slate-400">
            Orquestador Documental
          </p>
        </div>
      )}
    </div>
  );
}

export function BankWordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-900">
        <span className="text-[11px] font-bold text-white">BI</span>
      </div>
      <div>
        <p className="text-xs font-semibold leading-none text-brand-950">Banco Integral</p>
        <p className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.14em] text-slate-400">
          Expediente del Cliente
        </p>
      </div>
    </div>
  );
}
