import { useMemo } from 'react';
import { ChevronRight, Inbox, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { useNavigation } from '../../nav';
import { buildChecklist, progressValue, summarizeChecklist } from '../../lib/engine';
import {
  GUARANTEE_LABELS,
  PROCESS_LABELS,
  PRODUCT_LABELS,
  RISK_LABELS,
} from '../../lib/constants';
import {
  deriveLifecycleStep,
  lifecycleStepMeta,
  stepState,
} from '../../lib/lifecycle';
import { cn, initials, shortName } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Progress } from '../ui/Progress';
import { GlobalStatusBadge } from '../ui/StatusPill';
import { ChecklistModule } from '../checklist/ChecklistModule';
import { CapturaModule } from '../captura/CapturaModule';
import { RevisionModule } from '../revision/RevisionModule';
import { ExpedienteModule } from '../expediente/ExpedienteModule';
import { ClientStepper } from './ClientStepper';

export function ClientWorkspace() {
  const { state, activeClient } = useAppStore();
  const { step, goToStep, navigate } = useNavigation();

  const items = useMemo(
    () => buildChecklist(activeClient, state.overrides, state.customRules),
    [activeClient, state.overrides, state.customRules],
  );
  const summary = useMemo(() => summarizeChecklist(items), [items]);
  const queueForClient = useMemo(
    () => state.queue.filter((item) => item.clientId === activeClient.id),
    [state.queue, activeClient.id],
  );
  const currentStep = deriveLifecycleStep(summary, queueForClient);
  const coverage = progressValue(summary);
  const pending = summary.missing + summary.expired + summary.rejected + summary.observed;
  const currentMeta = lifecycleStepMeta(currentStep);
  const selectedMeta = lifecycleStepMeta(step);
  const selectedState = stepState(step, currentStep);
  const SelectedIcon = selectedMeta.icon;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-400">
          <button
            type="button"
            onClick={() => navigate('cartera')}
            className="rounded px-1 py-0.5 font-medium text-slate-500 transition hover:bg-slate-100 hover:text-brand-900"
          >
            Cartera de clientes
          </button>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="truncate text-slate-600">{shortName(activeClient.name)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {step !== currentStep && (
            <Button
              variant="subtle"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => goToStep(currentStep)}
            >
              Volver a la etapa actual
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<Inbox className="h-3.5 w-3.5" />}
            onClick={() => navigate('revision')}
          >
            Bandeja general ({state.queue.length})
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[12px] font-semibold text-brand-900">
              {initials(activeClient.name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-brand-950 sm:text-lg">
                  {activeClient.name}
                </h1>
                <GlobalStatusBadge status={summary.status} />
                <Badge variant="brand" className="text-[9px]">
                  {currentMeta.title}
                </Badge>
              </div>
              <p className="mt-1 truncate text-[10.5px] text-slate-400">
                {activeClient.docType} {activeClient.docNumber} · NIT {activeClient.nit} ·{' '}
                {activeClient.segment}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px]">
                <WorkspaceMeta label="Producto" value={PRODUCT_LABELS[activeClient.product]} />
                <WorkspaceMeta label="Proceso" value={PROCESS_LABELS[activeClient.process]} />
                <WorkspaceMeta label="Garantía" value={GUARANTEE_LABELS[activeClient.guarantee]} />
                <WorkspaceMeta label="Riesgo" value={RISK_LABELS[activeClient.risk]} />
                <WorkspaceMeta label="Ejecutivo" value={activeClient.executive} />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-4 border-t border-slate-100 pt-3 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">
                Cobertura documental
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Progress
                  value={coverage}
                  height="h-1.5"
                  className="w-28"
                  tone={
                    summary.status === 'vigente'
                      ? 'success'
                      : summary.status === 'parcial'
                        ? 'warning'
                        : 'danger'
                  }
                />
                <span className="text-[13px] font-semibold tabular-nums text-brand-950">
                  {coverage}%
                </span>
              </div>
              <p className="mt-1 text-[9.5px] text-slate-400">
                {summary.valid + summary.expiring} de {summary.total} requisitos cubiertos
              </p>
            </div>

            <div className="border-l border-slate-200 pl-4">
              <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">
                Pendientes
              </p>
              <p
                className={cn(
                  'mt-1 text-[13px] font-semibold tabular-nums',
                  pending > 0 ? 'text-amber-700' : 'text-emerald-700',
                )}
              >
                {pending > 0 ? pending : 'Sin pendientes'}
              </p>
              <p className="mt-1 text-[9.5px] text-slate-400">
                {queueForClient.length > 0
                  ? `${queueForClient.length} documento(s) en revisión`
                  : 'Cola del expediente al día'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <ClientStepper currentStep={currentStep} selectedStep={step} onSelect={goToStep} />

      <Card
        className={cn(
          'flex flex-wrap items-start justify-between gap-3 px-4 py-3',
          selectedState === 'current' ? 'border-brand-200 bg-brand-50/30' : undefined,
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded border',
              selectedState === 'current'
                ? 'border-brand-200 bg-white text-brand-900'
                : 'border-slate-200 bg-white text-slate-500',
            )}
          >
            <SelectedIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Paso {step} de 5 · {selectedMeta.owner}
            </p>
            <p className="mt-0.5 text-[13px] font-semibold text-brand-950">{selectedMeta.title}</p>
            <p className="mt-0.5 max-w-3xl text-[10.5px] leading-relaxed text-slate-500">
              {selectedMeta.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {selectedState === 'current' ? (
            <Badge variant="brand" dot>
              Etapa actual
            </Badge>
          ) : selectedState === 'complete' ? (
            <Badge variant="success" dot>
              Etapa completada
            </Badge>
          ) : (
            <Badge variant="neutral" dot>
              Etapa futura
            </Badge>
          )}
        </div>
      </Card>

      {step === 1 && <ChecklistModule embedded />}
      {(step === 2 || step === 3) && <CapturaModule step={step} embedded />}
      {step === 4 && <RevisionModule scope="client" embedded />}
      {step === 5 && <ExpedienteModule embedded />}
    </div>
  );
}

function WorkspaceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-[8.5px] font-medium uppercase tracking-[0.08em] text-slate-400">
        {label}
      </span>
      <span className="ml-1.5 max-w-[180px] truncate text-[10.5px] font-medium text-slate-600">
        {value}
      </span>
    </div>
  );
}
