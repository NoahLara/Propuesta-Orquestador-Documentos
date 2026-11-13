import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  FileSignature,
  ListChecks,
  Lock,
  RefreshCw,
  ScanLine,
  Scale,
  Send,
} from 'lucide-react';
import type { ChecklistItem } from '../../types';
import { useAppStore } from '../../store/AppStore';
import { useNavigation } from '../../nav';
import {
  buildChecklist,
  daysToExpire,
  progressValue,
  resolveStatus,
  summarizeChecklist,
} from '../../lib/engine';
import { GLOBAL_STATUS_META } from '../../lib/constants';
import { cn, formatDate, shortName } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, SectionHeading } from '../ui/Card';
import { CategoryIcon } from '../ui/DocIcon';
import { Progress } from '../ui/Progress';
import { DocStatusBadge, GlobalStatusBadge } from '../ui/StatusPill';
import { useToast } from '../ui/Toast';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DeclarationModal } from './DeclarationModal';

export function ExpedienteModule({ embedded = false }: { embedded?: boolean }) {
  const { state, activeClient, permissions } = useAppStore();
  const { navigate, focusDocCode, clearFocusDoc } = useNavigation();
  const { push } = useToast();

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [declarationOpen, setDeclarationOpen] = useState(false);

  const items = useMemo(
    () => buildChecklist(activeClient, state.overrides, state.customRules),
    [activeClient, state.overrides, state.customRules],
  );
  const summary = useMemo(() => summarizeChecklist(items), [items]);
  const coverage = progressValue(summary);
  const statusMeta = GLOBAL_STATUS_META[summary.status];

  useEffect(() => {
    if (focusDocCode) {
      if (activeClient.docs.some((doc) => doc.code === focusDocCode)) {
        setSelectedCode(focusDocCode);
      }
      clearFocusDoc();
    }
  }, [focusDocCode, activeClient.docs, clearFocusDoc]);

  useEffect(() => {
    setSelectedCode(null);
    setDeclarationOpen(false);
  }, [activeClient.id]);

  const updateDoc = (item: ChecklistItem) => {
    navigate('cliente', {
      step: 2,
      uploadIntent: {
        clientId: activeClient.id,
        docCode: item.template.code,
        docName: item.template.name,
      },
    });
  };

  const requestDoc = (item: ChecklistItem) => {
    push({
      kind: 'info',
      title: 'Solicitud enviada al cliente',
      description: `"${item.template.name}" se agregó a la lista de pendientes de ${shortName(activeClient.name)}.`,
    });
  };

  const renewalNote = summary.canDeclare
    ? `Renovación administrativa disponible para ${activeClient.docs.length} documento(s).`
    : summary.expired > 0 || summary.rejected > 0
      ? 'Renovación bloqueada: existen documentos vencidos o rechazados.'
      : summary.missing > 0 || summary.observed > 0
        ? 'Completa los requisitos pendientes para habilitar la renovación.'
        : 'Sin acciones correctivas pendientes.';

  const headerActions = (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<ListChecks className="h-3.5 w-3.5" />}
        onClick={() => navigate('cliente', { step: 1 })}
      >
        Ver checklist
      </Button>
      <Button
        variant="primary"
        size="sm"
        icon={<ScanLine className="h-3.5 w-3.5" />}
        onClick={() => navigate('cliente', { step: 2 })}
      >
        Capturar documento
      </Button>
    </>
  );

  return (
    <div className="space-y-4">
      {!embedded ? (
        <SectionHeading
          eyebrow="Expediente digital"
          title="Expediente y semáforo"
          description="Estado global del expediente, vigencias y versiones de cada documento."
          actions={headerActions}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-slate-400">
            Semáforo consolidado, vigencias y versiones del expediente.
          </p>
          <div className="flex flex-wrap items-center gap-2">{headerActions}</div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <KpiStat label="Vigentes" value={summary.valid} helper="Documentos al día" tone="success" />
        <KpiStat label="Vencidos" value={summary.expired} helper="Requieren actualización" tone="danger" />
        <KpiStat label="Faltantes" value={summary.missing} helper="Sin registro en OnBase" tone="neutral" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <GlobalStatusBadge status={summary.status} />
              <h3 className="text-sm font-semibold text-brand-950">{statusMeta.label}</h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{statusMeta.description}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-2">
                <Progress
                  value={coverage}
                  height="h-1.5"
                  className="w-32"
                  tone={summary.status === 'vigente' ? 'success' : summary.status === 'parcial' ? 'warning' : 'danger'}
                />
                <span className="text-[11px] font-semibold tabular-nums text-brand-950">{coverage}%</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {summary.valid + summary.expiring} de {summary.total} requisitos cubiertos
              </span>
              {summary.expiring > 0 && (
                <span className="text-[10px] font-medium text-amber-700">
                  {summary.expiring} por vencer
                </span>
              )}
              {summary.observed > 0 && (
                <span className="text-[10px] font-medium text-amber-700">
                  {summary.observed} observado(s)
                </span>
              )}
              {summary.rejected > 0 && (
                <span className="text-[10px] font-medium text-red-700">
                  {summary.rejected} rechazado(s)
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">{renewalNote}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {summary.canDeclare ? (
              <Button
                variant="primary"
                size="sm"
                icon={
                  permissions.emitDeclaration ? (
                    <FileSignature className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )
                }
                disabled={!permissions.emitDeclaration}
                onClick={() => setDeclarationOpen(true)}
                title={
                  permissions.emitDeclaration
                    ? undefined
                    : 'Solo Ejecutivo Comercial u Oficial de Cumplimiento.'
                }
              >
                Emitir Declaración de Vigencia
              </Button>
            ) : summary.missing > 0 || summary.expired > 0 || summary.rejected > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                icon={<ScanLine className="h-3.5 w-3.5" />}
                onClick={() => navigate('cliente', { step: 2 })}
              >
                Completar expediente
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={<ListChecks className="h-3.5 w-3.5" />}
                onClick={() => navigate('cliente', { step: 1 })}
              >
                Revisar checklist
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-semibold text-brand-950">Documentos del expediente</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {activeClient.docs.length} documento(s) en OnBase · {items.length} requisitos aplicables
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <th className="px-4 py-2.5 sm:px-5">Documento</th>
                <th className="px-3 py-2.5">Categoría</th>
                <th className="px-3 py-2.5">Vigencia interna</th>
                <th className="px-3 py-2.5">Vigencia legal</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-4 py-2.5 text-right sm:px-5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const { template, existing, daysToExpire: days } = item;
                const docStatus = existing ? resolveStatus(existing) : 'faltante';
                const canUpdate =
                  permissions.upload &&
                  (docStatus === 'vencido' || docStatus === 'por-vencer' || docStatus === 'rechazado');
                const internalDays = existing?.expiryDate ? daysToExpire(existing) : null;
                return (
                  <tr key={template.code} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[12.5px] font-medium text-brand-950">{template.name}</p>
                        {template.critical && (
                          <Badge variant="accent" className="text-[9px]">
                            Obligatorio
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[9px] text-slate-400">
                        {template.code}
                        {existing ? ` · ${existing.currentVersion} · ${existing.source}` : ' · sin registro'}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                        <CategoryIcon category={template.category} className="h-3.5 w-3.5 text-slate-400" />
                        {template.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {existing ? (
                        <div>
                          <p className="text-[11px] text-slate-600">{formatDate(existing.expiryDate)}</p>
                          <p
                            className={cn(
                              'text-[9px]',
                              internalDays !== null && internalDays < 0
                                ? 'text-red-600'
                                : internalDays !== null && internalDays <= 15
                                  ? 'text-amber-600'
                                  : 'text-emerald-600',
                            )}
                          >
                            {internalDays === null
                              ? 'Sin vencimiento'
                              : internalDays < 0
                                ? `Vencida hace ${Math.abs(internalDays)} días`
                                : `${internalDays} días restantes`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {existing?.legalExpiryDate ? (
                        <p className="text-[11px] text-slate-600">{formatDate(existing.legalExpiryDate)}</p>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {existing ? 'No aplica' : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <DocStatusBadge status={docStatus} compact />
                      <p className="mt-1 whitespace-nowrap text-[9px] tabular-nums text-slate-400">
                        {!existing
                          ? 'Pendiente de captura'
                          : days === null
                            ? 'Sin vencimiento'
                            : days < 0
                              ? `Venció hace ${Math.abs(days)} días`
                              : `Vence en ${days} días`}
                      </p>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center justify-end gap-1">
                        {existing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="h-3.5 w-3.5" />}
                            onClick={() => setSelectedCode(existing.code)}
                            title="Previsualizar documento"
                          >
                            Ver
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<RefreshCw className="h-3.5 w-3.5" />}
                            onClick={() => updateDoc(item)}
                          >
                            Actualizar
                          </Button>
                        )}
                        {!existing && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={
                              permissions.upload ? (
                                <ScanLine className="h-3.5 w-3.5" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )
                            }
                            onClick={() => (permissions.upload ? updateDoc(item) : requestDoc(item))}
                          >
                            {permissions.upload ? 'Capturar' : 'Solicitar'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="flex items-start gap-1.5 px-1 text-[10px] leading-relaxed text-slate-400">
        <Scale className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          <strong className="font-medium text-slate-500">Vigencia interna:</strong> política de
          actualización de Banco Integral. <strong className="font-medium text-slate-500">Vigencia legal:</strong>{' '}
          fecha de caducidad propia del documento. El semáforo considera la fecha más restrictiva.
        </span>
      </p>

      <DocumentPreviewModal docCode={selectedCode} onClose={() => setSelectedCode(null)} />
      <DeclarationModal
        open={declarationOpen}
        onClose={() => setDeclarationOpen(false)}
        summary={summary}
      />
    </div>
  );
}

function KpiStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: 'success' | 'danger' | 'neutral';
}) {
  const tones = {
    success: 'text-emerald-700',
    danger: 'text-red-700',
    neutral: 'text-slate-700',
  };
  return (
    <Card className="px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums leading-none', tones[tone])}>{value}</p>
      <p className="mt-1.5 text-[10px] text-slate-400">{helper}</p>
    </Card>
  );
}
