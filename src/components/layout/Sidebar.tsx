import { X } from 'lucide-react';
import { NAV_ITEMS, useNavigation } from '../../nav';
import { useAppStore } from '../../store/AppStore';
import { cn } from '../../lib/utils';

const CONNECTIONS = [
  { name: 'OnBase', detail: 'ECM documental' },
  { name: 'Bantotal', detail: 'Core bancario' },
  { name: 'Document AI', detail: 'Extracción OCR' },
];

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { view, navigate } = useNavigation();
  const { state } = useAppStore();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 top-14 z-40 bg-slate-900/30 transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed bottom-0 left-0 top-14 z-40 flex w-[228px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navegación principal"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Operación
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                item.id === 'cartera' ? view === 'cartera' || view === 'cliente' : view === item.id;
              const badge = item.id === 'revision' && state.queue.length > 0 ? state.queue.length : null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    navigate(item.id);
                    onClose();
                  }}
                  className={cn(
                    'group relative flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-left transition-colors',
                    active
                      ? 'bg-brand-50 text-brand-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-brand-900',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {active && (
                    <span className="absolute inset-y-1 left-0 w-[2px] rounded-r bg-brand-900" />
                  )}
                  <Icon
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      active ? 'text-brand-900' : 'text-slate-400 group-hover:text-slate-600',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12.5px] font-medium leading-tight">
                        {item.label}
                      </span>
                      {badge !== null && (
                        <span className="shrink-0 rounded border border-accent-200 bg-accent-50 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-accent-700">
                          {badge}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block truncate text-[10px] leading-tight',
                        active ? 'text-brand-700/70' : 'text-slate-400',
                      )}
                    >
                      {item.caption}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 px-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Ciclo del expediente
            </p>
            <ol className="space-y-1 px-2.5">
              {['Checklist', 'Captura', 'Validación IA', 'Revisión', 'Vigente'].map((label, index) => (
                <li key={label} className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[8px] font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
            <p className="mt-2 px-2.5 text-[9px] leading-relaxed text-slate-400">
              Al abrir un cliente verás su avance real en estas cinco etapas.
            </p>
          </div>
        </nav>

        <div className="border-t border-slate-100 px-3 py-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Conexiones
          </p>
          <div className="space-y-1.5">
            {CONNECTIONS.map((connection) => (
              <div key={connection.name} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium leading-tight text-slate-600">
                    {connection.name}
                  </p>
                  <p className="truncate text-[9px] leading-tight text-slate-400">{connection.detail}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[9px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  En línea
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2 text-[9px] leading-relaxed text-slate-400">
            MVP v1.0 · Datos locales
          </p>
        </div>
      </aside>
    </>
  );
}
