import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Inbox,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type { GlobalSummary, Product } from '../../types';
import { useAppStore } from '../../store/AppStore';
import { useNavigation } from '../../nav';
import { buildChecklist, progressValue, summarizeChecklist } from '../../lib/engine';
import {
  GLOBAL_STATUS_META,
  PRODUCT_LABELS,
  PRODUCT_OPTIONS,
  PROCESS_LABELS,
} from '../../lib/constants';
import { deriveLifecycleStep, LIFECYCLE_STEPS, stepState } from '../../lib/lifecycle';
import { cn, initials } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, SectionHeading } from '../ui/Card';
import { GlobalStatusBadge } from '../ui/StatusPill';

type StatusFilter = 'todos' | GlobalSummary['status'];
type ProductFilter = 'todos' | Product;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'vigente', label: 'Vigentes' },
  { id: 'parcial', label: 'En proceso' },
  { id: 'vencido', label: 'En riesgo' },
];

export function PortfolioModule() {
  const { state, setActiveClient } = useAppStore();
  const { navigate } = useNavigation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [product, setProduct] = useState<ProductFilter>('todos');

  const portfolio = useMemo(
    () =>
      state.clients.map((client) => {
        const items = buildChecklist(client, state.overrides, state.customRules);
        const summary = summarizeChecklist(items);
        const queue = state.queue.filter((item) => item.clientId === client.id);
        return {
          client,
          summary,
          queue,
          step: deriveLifecycleStep(summary, queue),
          coverage: progressValue(summary),
          pending: summary.missing + summary.expired + summary.rejected + summary.observed,
        };
      }),
    [state.clients, state.overrides, state.customRules, state.queue],
  );

  const counts = portfolio.reduce(
    (totals, entry) => {
      totals[entry.summary.status] += 1;
      return totals;
    },
    { vigente: 0, parcial: 0, vencido: 0 } as Record<GlobalSummary['status'], number>,
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return portfolio.filter(({ client, summary }) => {
      const matchesStatus = status === 'todos' || summary.status === status;
      const matchesProduct = product === 'todos' || client.product === product;
      const matchesSearch =
        !term ||
        client.name.toLowerCase().includes(term) ||
        client.nit.toLowerCase().includes(term) ||
        client.segment.toLowerCase().includes(term) ||
        client.executive.toLowerCase().includes(term) ||
        PRODUCT_LABELS[client.product].toLowerCase().includes(term);
      return matchesStatus && matchesProduct && matchesSearch;
    });
  }, [portfolio, search, status, product]);

  const openClient = (clientId: string, step: 1 | 2 | 3 | 4 | 5) => {
    setActiveClient(clientId);
    navigate('cliente', { step });
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Orquestador documental"
        title="Cartera de clientes"
        description="Cada tarjeta resume el semáforo del expediente y la etapa actual de su ciclo de vida. Abre un cliente para continuar desde donde corresponde."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Inbox className="h-3.5 w-3.5" />}
              onClick={() => navigate('revision')}
            >
              Bandeja de revisión ({state.queue.length})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<FolderOpen className="h-3.5 w-3.5" />}
              onClick={() => navigate('dashboard')}
            >
              Panel de operación
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PortfolioStat
          label="Expedientes"
          value={String(portfolio.length)}
          helper="Clientes en cartera"
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <PortfolioStat
          label="Vigentes"
          value={String(counts.vigente)}
          helper="Listos para Bantotal"
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="success"
        />
        <PortfolioStat
          label="En proceso"
          value={String(counts.parcial)}
          helper="Con requisitos por completar"
          icon={<Clock3 className="h-3.5 w-3.5" />}
          tone="warning"
        />
        <PortfolioStat
          label="En riesgo"
          value={String(counts.vencido)}
          helper="Expedientes vencidos"
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          tone="danger"
        />
      </div>

      <Card className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cliente, NIT, segmento o ejecutivo…"
            className="h-8 w-full rounded border border-slate-200 bg-white pl-8 pr-3 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-900/10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter.id === 'todos' ? portfolio.length : counts[filter.id as GlobalSummary['status']];
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatus(filter.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition',
                  status === filter.id
                    ? 'border-brand-200 bg-brand-50 text-brand-900'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                )}
              >
                {filter.label}
                <span
                  className={cn(
                    'rounded px-1 text-[8.5px] tabular-nums',
                    status === filter.id
                      ? 'bg-white text-brand-700'
                      : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <select
          value={product}
          onChange={(event) => setProduct(event.target.value as ProductFilter)}
          aria-label="Filtrar por producto"
          className="h-8 rounded border border-slate-200 bg-white px-2 text-[10.5px] font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-brand-700 focus:ring-2 focus:ring-brand-900/10"
        >
          <option value="todos">Todos los productos</option>
          {PRODUCT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <div className="px-6 py-14 text-center">
            <Search className="mx-auto h-5 w-5 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-brand-950">Sin expedientes con ese criterio</p>
            <p className="mt-1 text-xs text-slate-500">
              Ajusta la búsqueda o los filtros para volver a ver la cartera completa.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSearch('');
                setStatus('todos');
                setProduct('todos');
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ client, summary, queue, step, coverage, pending }) => {
            const meta = LIFECYCLE_STEPS.find((item) => item.id === step) ?? LIFECYCLE_STEPS[0];
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => openClient(client.id, step)}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-card transition hover:border-brand-300 hover:shadow-lift"
              >
                <div className="flex items-start gap-2.5 px-4 pb-3 pt-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-brand-900">
                    {initials(client.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-brand-950 transition group-hover:text-brand-800">
                      {client.name}
                    </p>
                    <p className="mt-1 truncate text-[9.5px] text-slate-400">
                      NIT {client.nit} · {client.segment}
                    </p>
                  </div>
                  <GlobalStatusBadge status={summary.status} className="shrink-0 text-[9px]" />
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 pb-3">
                  <CardInfo label="Producto" value={PRODUCT_LABELS[client.product]} />
                  <CardInfo label="Proceso" value={PROCESS_LABELS[client.process]} />
                  <CardInfo label="Ejecutivo" value={client.executive} />
                  <CardInfo label="Garantía" value={client.department} />
                </div>

                <div className="mt-auto border-t border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold text-brand-900">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-900 text-[8px] font-semibold tabular-nums text-white">
                        {step}
                      </span>
                      <span className="truncate">{meta.title}</span>
                    </span>
                    <span className="shrink-0 text-[9px] tabular-nums text-slate-400">
                      {coverage}% cobertura
                    </span>
                  </div>

                  <div className="mt-2 flex gap-1" aria-hidden>
                    {LIFECYCLE_STEPS.map((item) => {
                      const state = stepState(item.id, step);
                      return (
                        <span
                          key={item.id}
                          className={cn(
                            'h-1 flex-1 rounded-full',
                            state === 'complete'
                              ? 'bg-emerald-500'
                              : state === 'current'
                                ? 'bg-brand-900'
                                : 'bg-slate-200',
                          )}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 text-[9px]">
                    <span
                      className={cn(
                        'truncate font-medium',
                        pending > 0 ? 'text-amber-700' : 'text-emerald-700',
                      )}
                    >
                      {pending > 0
                        ? `${pending} requisito${pending === 1 ? '' : 's'} por atender`
                        : 'Sin pendientes documentales'}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-slate-400">
                      {queue.length > 0 ? (
                        <Badge variant="warning" className="text-[8px]">
                          {queue.length} en cola
                        </Badge>
                      ) : (
                        <span className="text-slate-400">{GLOBAL_STATUS_META[summary.status].short}</span>
                      )}
                      <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5 group-hover:text-brand-800" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="px-1 text-[10px] leading-relaxed text-slate-400">
        El semáforo considera la vigencia más restrictiva entre la política interna de Banco Integral
        y la fecha legal del documento. Las etapas se calculan con el estado real del expediente y la
        bandeja de revisión.
      </p>
    </div>
  );
}

function PortfolioStat({
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
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    neutral: 'text-brand-950',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
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

function CardInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[8.5px] font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-600" title={value}>
        {value}
      </p>
    </div>
  );
}
