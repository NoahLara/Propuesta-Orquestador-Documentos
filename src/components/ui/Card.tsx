import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-slate-200 bg-white shadow-card', className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  children,
  actions,
}: {
  className?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold tracking-[-0.01em] text-brand-950', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-xs leading-relaxed text-slate-500', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 sm:p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5',
        className,
      )}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400',
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>}
        <h1 className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-brand-950 sm:text-lg">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
