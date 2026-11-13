import { useMemo } from 'react';
import { Database, Eye, RefreshCw, Send } from 'lucide-react';
import type { ChecklistItem, DocCategory } from '../../types';
import { CATEGORY_ORDER } from '../../data/catalog';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CategoryIcon, StatusCircle } from '../ui/DocIcon';
import { DocStatusBadge } from '../ui/StatusPill';
import { cn } from '../../lib/utils';

interface Props {
  items: ChecklistItem[];
  canUpload: boolean;
  onView: (docCode: string) => void;
  onUpdate: (item: ChecklistItem) => void;
  onRequest: (item: ChecklistItem) => void;
}

function validityText(days?: number): string {
  if (!days) return 'Sin vencimiento';
  if (days >= 365) return `${Math.round(days / 365)} año${days >= 730 ? 's' : ''}`;
  return `${days} días`;
}

export function ChecklistList({ items, canUpload, onView, onUpdate, onRequest }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<DocCategory, ChecklistItem[]>();
    CATEGORY_ORDER.forEach((category) => map.set(category, []));
    items.forEach((item) => {
      const list = map.get(item.template.category) ?? [];
      list.push(item);
      map.set(item.template.category, list);
    });
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [items]);

  if (items.length === 0) {
    return (
      <Card>
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-brand-950">No hay requisitos con esta combinación</p>
          <p className="mt-1 text-xs text-slate-500">
            Ajusta los filtros del motor para explorar otras reglas del catálogo.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map(([category, categoryItems]) => {
        const complete = categoryItems.filter(
          (item) => item.status === 'vigente' || item.status === 'por-vencer',
        ).length;
        const pending = categoryItems.length - complete;
        return (
          <Card key={category} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <CategoryIcon category={category} className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  {category}
                </p>
                <span className="text-[10px] tabular-nums text-slate-400">
                  {complete}/{categoryItems.length}
                </span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  pending === 0 ? 'text-emerald-700' : 'text-slate-400',
                )}
              >
                {pending === 0 ? 'Completo' : `${pending} pendiente${pending === 1 ? '' : 's'}`}
              </span>
            </div>

            <ul className="divide-y divide-slate-100">
              {categoryItems.map((item) => {
                const { template, existing, status, onbaseReuse, daysToExpire } = item;
                const daysAbs = daysToExpire === null ? null : Math.abs(daysToExpire);
                const canUpdate =
                  canUpload && (status === 'vencido' || status === 'por-vencer' || status === 'rechazado');
                return (
                  <li
                    key={template.code}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <StatusCircle status={status} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-[13px] font-medium leading-snug text-brand-950">
                            {template.name}
                          </p>
                          {template.critical && (
                            <Badge variant="accent" className="text-[9px]">
                              Obligatorio
                            </Badge>
                          )}
                          {template.custom && (
                            <Badge variant="neutral" className="text-[9px]">
                              No-code
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-slate-500">
                          {template.description}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-400">
                          <span>Interna {validityText(template.internalDays)}</span>
                          {template.legalDays && <span>· Legal {validityText(template.legalDays)}</span>}
                          {onbaseReuse ? (
                            <span className="inline-flex items-center gap-1 font-medium text-brand-700">
                              <Database className="h-3 w-3" />
                              {status === 'vigente' ? 'Reutilizado de OnBase' : 'En OnBase · por vencer'}
                            </span>
                          ) : existing ? (
                            <span>· {existing.source}</span>
                          ) : (
                            <span className="font-medium text-amber-700">· Solicitar al cliente</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pl-10 sm:justify-end sm:pl-0">
                      <div className="text-right">
                        <DocStatusBadge status={status} compact />
                        <p className="mt-1 whitespace-nowrap text-[10px] tabular-nums text-slate-400">
                          {status === 'faltante'
                            ? 'No registrado'
                            : daysToExpire === null
                              ? 'Sin vencimiento'
                              : daysToExpire < 0
                                ? `Venció hace ${daysAbs} días`
                                : `Vence en ${daysAbs} días`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {existing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="h-3.5 w-3.5" />}
                            onClick={() => onView(template.code)}
                          >
                            <span className="hidden sm:inline">Ver</span>
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<RefreshCw className="h-3.5 w-3.5" />}
                            onClick={() => onUpdate(item)}
                          >
                            Actualizar
                          </Button>
                        )}
                        {!existing && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Send className="h-3.5 w-3.5" />}
                            onClick={() => onRequest(item)}
                            disabled={!canUpload}
                            title={!canUpload ? 'Tu rol no puede solicitar documentos' : undefined}
                          >
                            Solicitar
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <p className="flex items-center gap-1.5 px-1 text-[10px] leading-relaxed text-slate-400">
        <Database className="h-3 w-3 shrink-0" />
        Los documentos marcados como reutilizados ya existen vigentes en OnBase y no se solicitan de nuevo.
      </p>
    </div>
  );
}
