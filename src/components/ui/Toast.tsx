import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn, uid } from '../../lib/utils';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastInput {
  title: string;
  description?: string;
  kind?: ToastKind;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  push: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const META: Record<ToastKind, { icon: typeof Info; ring: string; iconClass: string }> = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200', iconClass: 'text-emerald-600' },
  error: { icon: XCircle, ring: 'border-red-200', iconClass: 'text-red-600' },
  warning: { icon: AlertTriangle, ring: 'border-amber-200', iconClass: 'text-amber-600' },
  info: { icon: Info, ring: 'border-brand-200', iconClass: 'text-brand-600' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timeouts.current.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = uid('toast');
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      const timeout = window.setTimeout(() => remove(id), 4800);
      timeouts.current.push(timeout);
    },
    [remove],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-end gap-2 px-4 sm:top-4 sm:px-6">
        {toasts.map((toast) => {
          const meta = META[toast.kind ?? 'info'];
          const Icon = meta.icon;
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white p-3.5 shadow-lift animate-slide-up',
                meta.ring,
              )}
              role="status"
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.iconClass)} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-brand-950">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar notificación"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider');
  return context;
}
