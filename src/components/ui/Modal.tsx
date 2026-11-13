import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl';

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
  '5xl': 'max-w-7xl',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  bodyClassName?: string;
  headerExtra?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  bodyClassName,
  headerExtra,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/35"
      />
      <div
        className={cn(
          'relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-lg border border-slate-200 bg-white shadow-lift animate-slide-up sm:rounded-lg',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-brand-950">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
            )}
            {headerExtra && <div className="mt-2">{headerExtra}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={cn('flex-1 overflow-y-auto px-4 py-4 sm:px-5', bodyClassName)}>{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
