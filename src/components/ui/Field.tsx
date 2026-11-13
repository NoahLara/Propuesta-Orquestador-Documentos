import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
    >
      {children}
    </label>
  );
}

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  icon?: ReactNode;
  hint?: string;
  wrapperClassName?: string;
}

export function Select({
  label,
  options,
  icon,
  hint,
  className,
  wrapperClassName,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? `select-${label?.replace(/\s+/g, '-').toLowerCase() ?? ''}`;
  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && <FieldLabel htmlFor={selectId}>{label}</FieldLabel>}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <select
          id={selectId}
          className={cn(
            'h-9 w-full appearance-none rounded-md border border-slate-200 bg-white pr-8 text-[13px] font-medium text-slate-700 transition',
            'focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-900/10',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
            icon ? 'pl-9' : 'pl-3',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {hint && <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Input({ label, hint, className, wrapperClassName, id, ...props }: InputProps) {
  const inputId = id ?? `input-${label?.replace(/\s+/g, '-').toLowerCase() ?? ''}`;
  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <input
        id={inputId}
        className={cn(
          'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 transition placeholder:text-slate-400',
          'focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-900/10',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          className,
        )}
        {...props}
      />
      {hint && <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Textarea({ label, hint, className, wrapperClassName, id, ...props }: TextareaProps) {
  const textareaId = id ?? `textarea-${label?.replace(/\s+/g, '-').toLowerCase() ?? ''}`;
  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && <FieldLabel htmlFor={textareaId}>{label}</FieldLabel>}
      <textarea
        id={textareaId}
        className={cn(
          'w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 transition placeholder:text-slate-400',
          'focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-900/10',
          className,
        )}
        {...props}
      />
      {hint && <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>}
    </div>
  );
}
