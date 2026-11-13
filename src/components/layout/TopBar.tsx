import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell, Check, ChevronDown, Menu } from 'lucide-react';
import type { Role } from '../../types';
import { useNavigation } from '../../nav';
import { useAppStore } from '../../store/AppStore';
import { ROLE_META } from '../../lib/constants';
import { cn, shortName } from '../../lib/utils';
import { BankLogo } from './BankLogo';

const ROLE_PERSONA: Record<Role, { name: string; initials: string }> = {
  ejecutivo: { name: 'Karla Menjívar', initials: 'KM' },
  calidad: { name: 'Andrea Cañas', initials: 'AC' },
  cumplimiento: { name: 'Ricardo Gutiérrez', initials: 'RG' },
};

const ROLE_ORDER: Role[] = ['ejecutivo', 'calidad', 'cumplimiento'];

const VIEW_LABEL: Record<string, string> = {
  revision: 'Bandeja de revisión',
  dashboard: 'Panel de operación',
};

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { navigate, view } = useNavigation();
  const { state, activeClient, setRole } = useAppStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const persona = ROLE_PERSONA[state.role];
  const role = ROLE_META[state.role];

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [view]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand-900 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>

        <BankLogo />

        {view === 'cliente' ? (
          <div className="ml-2 hidden min-w-0 items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
            <button
              type="button"
              onClick={() => navigate('cartera')}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-brand-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cartera
            </button>
            <span className="text-slate-300">/</span>
            <span className="max-w-[220px] truncate text-[11px] font-medium text-slate-600">
              {shortName(activeClient.name)}
            </span>
          </div>
        ) : view !== 'cartera' ? (
          <div className="ml-2 hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
            <span className="text-[11px] font-medium text-slate-600">{VIEW_LABEL[view]}</span>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('revision')}
            className="relative rounded p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand-900"
            aria-label={`Notificaciones: ${state.queue.length} documentos en cola`}
            title={`${state.queue.length} documentos esperan revisión`}
          >
            <Bell className="h-4 w-4" />
            {state.queue.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-semibold text-white ring-2 ring-white">
                {state.queue.length}
              </span>
            )}
          </button>

          <div ref={profileRef} className="relative flex items-center border-l border-slate-200 pl-2.5">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-brand-900">
                {persona.initials}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[11px] font-medium leading-tight text-brand-950">
                  {persona.name}
                </p>
                <p className="truncate text-[9px] leading-tight text-slate-400">
                  Rol actual: {role.label}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform',
                  profileOpen && 'rotate-180',
                )}
              />
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-lg border border-slate-200 bg-white p-2 shadow-lift"
              >
                <p className="px-2 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Perfil de demostración
                </p>
                {ROLE_ORDER.map((roleId) => {
                  const meta = ROLE_META[roleId];
                  const active = state.role === roleId;
                  return (
                    <button
                      key={roleId}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        setRole(roleId);
                        setProfileOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-start gap-2 rounded px-2 py-2 text-left transition',
                        active ? 'bg-brand-50' : 'hover:bg-slate-50',
                      )}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        {active ? (
                          <Check className="h-3.5 w-3.5 text-brand-900" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            'block text-[11px] font-medium leading-tight',
                            active ? 'text-brand-950' : 'text-slate-700',
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="mt-0.5 block text-[9px] leading-snug text-slate-400">
                          {meta.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <p className="mt-1 border-t border-slate-100 px-2 pt-2 text-[9px] leading-relaxed text-slate-400">
                  El rol define los permisos de captura, revisión y configuración del orquestador.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
