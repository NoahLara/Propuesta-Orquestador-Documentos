import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

export function Tabs({
  items,
  active,
  onChange,
  variant = 'underline',
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}) {
  if (variant === 'pill') {
    return (
      <div className={cn('inline-flex rounded-md border border-slate-200 bg-slate-50 p-1', className)}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition',
              active === item.id
                ? 'bg-brand-900 text-white'
                : 'text-slate-500 hover:text-brand-900',
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px]',
                  active === item.id ? 'bg-brand-50 text-brand-700' : 'bg-slate-200 text-slate-500',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-slate-200', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            'relative -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition',
            active === item.id
              ? 'border-brand-900 text-brand-950'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-brand-900',
          )}
        >
          {item.icon}
          {item.label}
          {typeof item.count === 'number' && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
