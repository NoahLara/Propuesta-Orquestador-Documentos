import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Inbox,
  ScanLine,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { GlobalSummary } from '../../types';
import { useAppStore } from '../../store/AppStore';
import { useNavigation } from '../../nav';
import { buildChecklist, progressValue, summarizeChecklist } from '../../lib/engine';
import { deriveLifecycleStep } from '../../lib/lifecycle';
import { AI_THRESHOLD, GLOBAL_STATUS_META } from '../../lib/constants';
import { cn, initials, shortName } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, SectionHeading } from '../ui/Card';
import { Progress } from '../ui/Progress';

const STATUS_DOT: Record<GlobalSummary['status'], string> = {
  vigente: 'bg-emerald-500',
  parcial: 'bg-amber-500',
  vencido: 'bg-red-500',
};

const STATUS_BAR: Record<GlobalSummary['status'], string> = {
  vigente: 'bg-emerald-500',
  parcial: 'bg-amber-500',
  vencido: 'bg-red-500',
};

export function DashboardModule() {
  const { state, setActiveClient } = useAppStore();
  const { navigate } = useNavigation();
  const { metrics, clients, overrides, customRules } = state;

  const totalProcessed = metrics.autoApproved + metrics.escalated;
  const autoRate = totalProcessed
    ? Math.round((metrics.autoApproved / totalProcessed) * 100)
    : 0;
  const manualTotal = metrics.manualApproved + metrics.manualRejected;
  const manualApprovalRate = manualTotal
    ? Math.round((metrics.manualApproved / manualTotal) * 100)
    : 0;

  const topErrors = useMemo(
    () => [...metrics.topErrors].sort((a, b) => b.count - a.count).slice(0, 5),
    [metrics.topErrors],
  );
  const maxError = Math.max(1, ...topErrors.map((error) => error.count));

  const portfolio = useMemo(
    () =>
      clients.map((client) => {
        const items = buildChecklist(client, overrides, customRules);
        const summary = summarizeChecklist(items);
        const queue = state.queue.filter((item) => item.clientId === client.id);
        return {
          client,
          summary,
          step: deriveLifecycleStep(summary, queue),
        };
      }),
    [clients, overrides, customRules, state.queue],
  );

  const statusCounts = portfolio.reduce(
    (totals, entry) => {
      totals[entry.summary.status] += 1;
      return totals;
    },
    { vigente: 0, parcial: 0, vencido: 0 } as Record<GlobalSummary['status'], number>,
  );

  const weeklyTotal = metrics.weekly.reduce(
    (total, point) => total + point.auto + point.manual,
    0,
  );

  const openClient = (clientId: string, step: 1 | 2 | 3 | 4 | 5) => {
    setActiveClient(clientId);
    navigate('cliente', { step });
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Módulo 5"
        title="Dashboard de IA y Operación"
        description="Resultados del orquestador: auto-aprobación, excepciones escaladas, tiempo de validación y estado de la cartera."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Inbox className="h-3.5 w-3.5" />}
              onClick={() => navigate('revision')}
            >
              Revisar cola ({state.queue.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<ScanLine className="h-3.5 w-3.5" />}
              onClick={() => navigate('cartera')}
            >
              Ir a la cartera
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Auto-aprobación"
          value={`${autoRate}%`}
          helper={`${metrics.autoApproved} de ${totalProcessed} documentos sin intervención`}
          icon={<Zap className="h-3.5 w-3.5" />}
          tone="success"
        />
        <KpiCard
          label="Escalados a revisión"
          value={String(metrics.escalated)}
          helper={`${state.queue.length} casos esperando decisión humana`}
          icon={<Inbox className="h-3.5 w-3.5" />}
          tone="warning"
        />
        <KpiCard
          label="Tiempo promedio"
          value={`${metrics.avgSeconds.toFixed(1)} s`}
          helper="Clasificación, extracción y cruce con Bantotal"
          icon={<Clock3 className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Procesados hoy"
          value={String(metrics.processedToday)}
          helper="Documentos clasificados e indexados en la jornada"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div>
              <p className="text-[13px] font-semibold text-brand-950">
                Volumen de validación semanal
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Documentos procesados por el orquestador, automáticos vs. revisión humana.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-brand-900" />
                Automático
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-accent-500" />
                Manual
              </span>
            </div>
          </div>
          <div className="px-3 pb-3 pt-4 sm:px-5">
            <WeeklyChart points={metrics.weekly} />
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-2.5 text-[10px] text-slate-500">
              <span>
                Total semana: <strong className="font-semibold text-brand-950">{weeklyTotal}</strong>{' '}
                documentos
              </span>
              <span>
                Promedio diario:{' '}
                <strong className="font-semibold text-brand-950">
                  {Math.round(weeklyTotal / Math.max(1, metrics.weekly.length))}
                </strong>
              </span>
              <span className="ml-auto text-[9px] text-slate-400">
                Fuente: OnBase · Bantotal · Document AI
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <p className="text-[13px] font-semibold text-brand-950">Salud del motor</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Tasa de indexación automática del período.
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-3xl font-semibold tabular-nums leading-none text-brand-950">
                  {autoRate}%
                </p>
                <p className="mt-1 text-[10px] text-slate-400">indexación automática</p>
              </div>
              <Badge variant={autoRate >= 80 ? 'success' : 'warning'} className="text-[9px]">
                {autoRate >= 80 ? 'Óptimo' : 'A revisar'}
              </Badge>
            </div>
            <Progress
              value={autoRate}
              tone="success"
              height="h-1.5"
              className="mt-3"
            />
            <div className="mt-4 space-y-2">
              <BreakdownRow label="Indexados automáticamente" value={metrics.autoApproved} tone="success" />
              <BreakdownRow label="Escalados a humano" value={metrics.escalated} tone="warning" />
              <BreakdownRow label="Aprobados en revisión" value={metrics.manualApproved} tone="brand" />
              <BreakdownRow label="Rechazados en revisión" value={metrics.manualRejected} tone="danger" />
            </div>
            <div className="mt-3 flex items-start gap-1.5 border-t border-slate-100 pt-2.5 text-[9.5px] leading-relaxed text-slate-500">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
              <span>
                Indexación automática con confianza ≥ {Math.round(AI_THRESHOLD * 100)}% y todos los
                cruces con Bantotal aprobados.
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div>
              <p className="text-[13px] font-semibold text-brand-950">Motivos de escalamiento</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Causas detectadas por el motor IA.
              </p>
            </div>
            <Badge variant="warning" className="text-[9px]">
              {topErrors.reduce((total, error) => total + error.count, 0)} casos
            </Badge>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            {topErrors.map((error, index) => (
              <div key={error.label}>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-start gap-1.5 text-[10.5px] leading-snug text-slate-600">
                    <span className="mt-px font-mono text-[9px] text-slate-300">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {error.label}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold tabular-nums text-brand-950">
                    {error.count}
                  </span>
                </div>
                <Progress
                  value={(error.count / maxError) * 100}
                  height="h-1"
                  tone={index === 0 ? 'warning' : 'brand'}
                />
              </div>
            ))}
            <p className="pt-0.5 text-[9px] leading-relaxed text-slate-400">
              Los rechazos manuales se incorporan al conjunto de reentrenamiento del modelo de
              clasificación.
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div>
              <p className="text-[13px] font-semibold text-brand-950">Cartera de clientes</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Distribución del semáforo para {clients.length} clientes demo.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-medium text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {statusCounts.vigente} vigentes
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {statusCounts.parcial} parciales
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {statusCounts.vencido} vencidos
              </span>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
              {(['vigente', 'parcial', 'vencido'] as const).map((status) =>
                statusCounts[status] > 0 ? (
                  <div
                    key={status}
                    className={STATUS_BAR[status]}
                    style={{ width: `${(statusCounts[status] / clients.length) * 100}%` }}
                    title={`${GLOBAL_STATUS_META[status].label}: ${statusCounts[status]}`}
                  />
                ) : null,
              )}
            </div>

            <ul className="mt-3 divide-y divide-slate-100">
              {portfolio.map(({ client, summary, step }) => {
                const coverage = progressValue(summary);
                const pending = summary.expired + summary.missing + summary.rejected;
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => openClient(client.id, step)}
                      className="flex w-full items-center gap-2.5 py-2 text-left transition-colors hover:bg-slate-50/70"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[8.5px] font-semibold text-brand-900">
                        {initials(client.name)}
                      </span>
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[summary.status])} />
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700">
                        {shortName(client.name)}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-[9.5px] tabular-nums',
                          pending > 0 ? 'text-amber-700' : 'text-slate-400',
                        )}
                      >
                        {pending > 0 ? `${pending} por atender` : 'Sin pendientes'}
                      </span>
                      <span className="w-10 shrink-0 text-right text-[10px] font-semibold tabular-nums text-brand-950">
                        {coverage}%
                      </span>
                      <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-300" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[9px] text-slate-400">
              <span>Aprobación humana: {manualApprovalRate}% de {manualTotal} decisiones</span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {statusCounts.vencido} expedientes en riesgo
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const tones = {
    neutral: 'text-brand-950',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
  };
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </p>
        <span className="text-slate-300">{icon}</span>
      </div>
      <p className={cn('mt-1.5 text-2xl font-semibold tabular-nums leading-none', tones[tone])}>
        {value}
      </p>
      <p className="mt-1.5 text-[9.5px] leading-snug text-slate-400">{helper}</p>
    </Card>
  );
}

function BreakdownRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'brand' | 'danger';
}) {
  const dots = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    brand: 'bg-brand-800',
    danger: 'bg-red-500',
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dots[tone])} />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-[10.5px] font-semibold tabular-nums text-brand-950">{value}</span>
    </div>
  );
}

function WeeklyChart({ points }: { points: { label: string; auto: number; manual: number }[] }) {
  const width = 640;
  const height = 200;
  const padX = 24;
  const top = 12;
  const baseY = 168;
  const slot = (width - padX * 2) / Math.max(1, points.length);
  const barWidth = Math.min(16, slot / 3);
  const maxValue = Math.max(1, ...points.map((point) => point.auto + point.manual));
  const heightFor = (value: number) => (value / maxValue) * (baseY - top);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Documentos procesados por día, automáticos y manuales"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = baseY - ratio * (baseY - top);
        return (
          <line
            key={ratio}
            x1={padX}
            x2={width - padX}
            y1={y}
            y2={y}
            stroke="#f1f5f9"
            strokeWidth={1}
          />
        );
      })}

      {points.map((point, index) => {
        const center = padX + index * slot + slot / 2;
        const autoHeight = heightFor(point.auto);
        const manualHeight = heightFor(point.manual);
        return (
          <g key={point.label}>
            <title>
              {point.label}: {point.auto} automáticos, {point.manual} manuales
            </title>
            <rect
              x={center - barWidth - 1}
              y={baseY - autoHeight}
              width={barWidth}
              height={autoHeight}
              rx={1}
              fill="#0f3b5f"
            />
            <rect
              x={center + 1}
              y={baseY - manualHeight}
              width={barWidth}
              height={manualHeight}
              rx={1}
              fill="#f28500"
            />
            <text
              x={center}
              y={baseY + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {point.label}
            </text>
          </g>
        );
      })}

      <line
        x1={padX}
        x2={width - padX}
        y1={baseY}
        y2={baseY}
        stroke="#e2e8f0"
        strokeWidth={1}
      />
    </svg>
  );
}
