import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Inbox,
  Lock,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import type { ClientDocument, QueueItem } from '../../types';
import { CATALOG_BY_CODE } from '../../data/catalog';
import { useAppStore } from '../../store/AppStore';
import { useNavigation } from '../../nav';
import { ROLE_META } from '../../lib/constants';
import {
  addDays,
  cn,
  formatDateNumeric,
  initials,
  relativeTime,
  shortName,
  todayISO,
} from '../../lib/utils';
import { Alert, EmptyState } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, SectionHeading } from '../ui/Card';
import { ConfidenceBadge } from '../ui/StatusPill';
import { useToast } from '../ui/Toast';
import { MockDocument } from '../expediente/MockDocument';
import { ApproveQueueModal } from './ApproveQueueModal';
import { RejectQueueModal } from './RejectQueueModal';

type PriorityFilter = 'todas' | QueueItem['priority'];
type Decision = 'approve' | 'reject' | null;

const PRIORITY_META: Record<
  QueueItem['priority'],
  { label: string; chip: string; dot: string }
> = {
  alta: {
    label: 'Alta',
    chip: 'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
  media: {
    label: 'Media',
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  baja: {
    label: 'Baja',
    chip: 'border-slate-200 bg-slate-50 text-slate-500',
    dot: 'bg-slate-400',
  },
};

const PRIORITY_FILTERS: { id: PriorityFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Media' },
  { id: 'baja', label: 'Baja' },
];

export function RevisionModule({
  scope = 'all',
  embedded = false,
}: {
  scope?: 'client' | 'all';
  embedded?: boolean;
}) {
  const { state, activeClient, permissions, approveQueueItem, rejectQueueItem, setActiveClient } =
    useAppStore();
  const { navigate, goToStep } = useNavigation();
  const { push } = useToast();

  const clientQueue = useMemo(
    () => state.queue.filter((item) => item.clientId === activeClient.id),
    [state.queue, activeClient.id],
  );

  const [selectedId, setSelectedId] = useState<string | null>(clientQueue[0]?.id ?? null);
  const [priority, setPriority] = useState<PriorityFilter>('todas');
  const [search, setSearch] = useState('');
  const [decision, setDecision] = useState<Decision>(null);
  const [onlyClient, setOnlyClient] = useState(scope === 'client');

  const reviewer = ROLE_META[state.role].label;
  const canReview = permissions.reviewQueue;

  const showClientOnly = scope === 'client' && onlyClient;
  const scopedQueue = showClientOnly ? clientQueue : state.queue;
  const scopeLabel = showClientOnly ? 'del cliente' : 'general';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scopedQueue.filter((item) => {
      const matchesPriority = priority === 'todas' || item.priority === priority;
      const matchesSearch =
        !term ||
        item.clientName.toLowerCase().includes(term) ||
        item.docName.toLowerCase().includes(term) ||
        item.fileName.toLowerCase().includes(term) ||
        item.docCode.toLowerCase().includes(term) ||
        item.reason.toLowerCase().includes(term);
      return matchesPriority && matchesSearch;
    });
  }, [scopedQueue, priority, search]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const previewClient = selected
    ? state.clients.find((client) => client.id === selected.clientId) ?? activeClient
    : activeClient;

  const previewDoc = useMemo<ClientDocument | null>(() => {
    if (!selected) return null;
    const template = CATALOG_BY_CODE[selected.docCode];
    const issue = todayISO();
    const expiry = addDays(issue, template?.internalDays ?? 180);
    const metadata = {
      'Nombre / Razón social': previewClient.name,
      'Número de documento': previewClient.docNumber,
      'Fecha de emisión': formatDateNumeric(issue),
      'Fecha de vencimiento': formatDateNumeric(expiry),
      ...selected.metadata,
    };
    return {
      id: selected.id,
      code: selected.docCode,
      name: selected.docName,
      category: template?.category ?? 'Comercial',
      status: 'observado',
      issueDate: issue,
      expiryDate: expiry,
      source: selected.source,
      confidence: selected.confidence,
      currentVersion: 'v1 · en revisión',
      versions: [
        {
          version: 'v1',
          uploadedAt: selected.submittedAt.slice(0, 10),
          uploadedBy: selected.submittedBy,
          status: 'observado',
          source: selected.source,
          confidence: selected.confidence,
          notes: selected.reason,
          metadata,
        },
      ],
      metadata,
      notes: selected.reason,
    };
  }, [selected, previewClient]);

  const highPriority = scopedQueue.filter((item) => item.priority === 'alta').length;

  const handleApprove = (
    id: string,
    metadata: Record<string, string>,
    observations?: string,
  ) => {
    const item = state.queue.find((entry) => entry.id === id);
    approveQueueItem(id, { reviewer, metadata, observations });
    setDecision(null);
    push({
      kind: 'success',
      title: 'Documento aprobado e indexado',
      description: item
        ? `${item.docName} de ${shortName(item.clientName)} ya está vigente en el expediente.`
        : 'El expediente se actualizó en tiempo real.',
    });
  };

  const handleReject = (id: string, reason: string) => {
    const item = state.queue.find((entry) => entry.id === id);
    rejectQueueItem(id, { reviewer, reason });
    setDecision(null);
    push({
      kind: 'warning',
      title: 'Documento rechazado',
      description: item
        ? `${item.docName} quedó marcado como rechazado y se notificó al ejecutivo.`
        : 'La decisión se registró en el expediente.',
    });
  };

  const goCapture = () => {
    if (scope === 'client') {
      goToStep(2);
      return;
    }
    navigate('cartera');
  };

  return (
    <div className="space-y-4">
      {!embedded ? (
        <SectionHeading
          eyebrow="Revisión humana"
          title="Bandeja de revisión"
          description="Excepciones escaladas por el motor IA con el motivo exacto. Aprueba, corrige metadatos o rechaza; cada decisión actualiza el expediente."
          actions={
            <>
              <Badge variant={highPriority > 0 ? 'danger' : 'success'} dot>
                {highPriority} prioridad alta
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                icon={<FileSearch className="h-3.5 w-3.5" />}
                onClick={() => navigate('cartera')}
              >
                Ir a la cartera
              </Button>
            </>
          }
        />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setOnlyClient(true)}
                className={cn(
                  'rounded px-2.5 py-1 text-[10.5px] font-medium transition',
                  onlyClient ? 'bg-brand-900 text-white' : 'text-slate-500 hover:text-brand-900',
                )}
              >
                Cola del cliente
                <span className="ml-1 tabular-nums opacity-70">{clientQueue.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setOnlyClient(false)}
                className={cn(
                  'rounded px-2.5 py-1 text-[10.5px] font-medium transition',
                  !onlyClient ? 'bg-brand-900 text-white' : 'text-slate-500 hover:text-brand-900',
                )}
              >
                Bandeja general
                <span className="ml-1 tabular-nums opacity-70">{state.queue.length}</span>
              </button>
            </span>
            <Badge variant={highPriority > 0 ? 'danger' : 'success'} dot className="text-[9px]">
              {highPriority} prioridad alta
            </Badge>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileSearch className="h-3.5 w-3.5" />}
            onClick={goCapture}
          >
            Nueva captura
          </Button>
        </Card>
      )}

      {!canReview && (
        <Alert
          tone="warning"
          icon={<Lock className="h-4 w-4" />}
          title="Vista de solo lectura para tu rol"
        >
          El <strong>Ejecutivo Comercial</strong> puede consultar la cola, pero solo el Analista de
          Calidad y el Oficial de Cumplimiento pueden aprobar o rechazar documentos. Cambia el rol en
          el perfil superior para operar la cola.
        </Alert>
      )}

      {scopedQueue.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title={
              showClientOnly
                ? 'Este cliente no tiene excepciones en cola'
                : 'Cola vacía: no hay excepciones pendientes'
            }
            description={
              showClientOnly
                ? 'El motor IA indexó automáticamente los documentos de este expediente. Puedes cambiar a la bandeja general o revisar la validación IA.'
                : 'El motor IA indexó automáticamente todos los documentos recientes. Las nuevas capturas con baja confianza aparecerán aquí en tiempo real.'
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                {scope === 'client' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<FileSearch className="h-3.5 w-3.5" />}
                    onClick={goCapture}
                  >
                    Capturar documentos
                  </Button>
                )}
                {scope === 'client' && onlyClient && state.queue.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Inbox className="h-3.5 w-3.5" />}
                    onClick={() => setOnlyClient(false)}
                  >
                    Ver bandeja general ({state.queue.length})
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ArrowRight className="h-3.5 w-3.5" />}
                  onClick={() => navigate('dashboard')}
                >
                  Ver panel de operación
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid items-start lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
              <div className="space-y-2 border-b border-slate-200 px-3 py-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar cliente, documento o motivo…"
                    className="h-8 w-full rounded border border-slate-200 bg-white pl-8 pr-3 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-900/10"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {PRIORITY_FILTERS.map((filter) => {
                    const count =
                      filter.id === 'todas'
                        ? scopedQueue.length
                        : scopedQueue.filter((item) => item.priority === filter.id).length;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setPriority(filter.id)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition',
                          priority === filter.id
                            ? 'border-brand-200 bg-brand-50 text-brand-900'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                        )}
                      >
                        {filter.label}
                        <span
                          className={cn(
                            'rounded px-1 text-[8.5px] tabular-nums',
                            priority === filter.id
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
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={<Search className="h-5 w-5" />}
                  title="Sin coincidencias"
                  description="No hay documentos en cola que coincidan con la búsqueda o la prioridad seleccionada."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearch('');
                        setPriority('todas');
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  }
                />
              ) : (
                <div className="max-h-[660px] divide-y divide-slate-100 overflow-y-auto">
                  {filtered.map((item) => {
                    const active = selected?.id === item.id;
                    const meta = PRIORITY_META[item.priority];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          'relative block w-full px-3 py-2.5 text-left transition-colors',
                          active ? 'bg-brand-50/60' : 'bg-white hover:bg-slate-50/70',
                        )}
                      >
                        {active && (
                          <span className="absolute inset-y-2 left-0 w-[2px] rounded-r bg-brand-900" />
                        )}
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[9px] font-semibold text-brand-900">
                            {initials(item.clientName)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <p className="truncate text-[11.5px] font-medium text-brand-950">
                                {shortName(item.clientName)}
                              </p>
                              <span className="shrink-0 text-[8.5px] text-slate-400">
                                {relativeTime(item.submittedAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10.5px] text-slate-600">
                              {item.docName}
                            </p>
                            <p className="mt-1 line-clamp-2 text-[9px] leading-snug text-amber-700">
                              {item.reason}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[8px] font-medium',
                                  meta.chip,
                                )}
                              >
                                <span className={cn('h-1 w-1 rounded-full', meta.dot)} />
                                {meta.label}
                              </span>
                              <ConfidenceBadge value={item.confidence} />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selected && previewDoc ? (
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium',
                          PRIORITY_META[selected.priority].chip,
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            PRIORITY_META[selected.priority].dot,
                          )}
                        />
                        Prioridad {PRIORITY_META[selected.priority].label}
                      </span>
                      <ConfidenceBadge value={selected.confidence} />
                      <Badge variant="outline" className="text-[8.5px]">
                        {selected.source}
                      </Badge>
                      {selected.batchId && (
                        <Badge variant="neutral" className="text-[8.5px]">
                          Lote {selected.batchId.slice(-5)}
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-[15px] font-semibold leading-tight text-brand-950">
                      {selected.docName}
                    </h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => {
                          if (selected.clientId !== activeClient.id) {
                            setActiveClient(selected.clientId);
                          }
                          goToStep(4);
                        }}
                        className="inline-flex items-center gap-1 rounded px-0.5 font-medium text-slate-600 transition hover:text-brand-900"
                      >
                        <UserRound className="h-3 w-3 text-slate-400" />
                        {selected.clientName}
                      </button>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-[9px]">{selected.docCode}</span>
                      <span className="text-slate-300">·</span>
                      <span className="truncate">{selected.fileName}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="danger"
                      size="sm"
                      icon={
                        canReview ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )
                      }
                      disabled={!canReview}
                      onClick={() => setDecision('reject')}
                    >
                      Rechazar
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      icon={
                        canReview ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )
                      }
                      disabled={!canReview}
                      onClick={() => setDecision('approve')}
                    >
                      Aprobar
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                  <div>
                    <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Documento recibido
                    </p>
                    <div className="rounded border border-slate-200 bg-slate-50/70 p-3">
                      <MockDocument client={previewClient} doc={previewDoc} dimmed />
                    </div>
                    <p className="mt-2 text-center text-[8.5px] text-slate-400">
                      {selected.fileType} · {Math.round(selected.fileSize / 1024)} KB ·
                      previsualización simulada
                    </p>
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div className="rounded border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-amber-800">
                        <AlertTriangle className="h-3 w-3" />
                        Motivo exacto del escalamiento
                      </p>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-950">
                        {selected.reason}
                      </p>
                      {selected.issues.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t border-amber-200/70 pt-2">
                          {selected.issues.map((issue) => (
                            <li
                              key={issue}
                              className="flex items-start gap-1.5 text-[9.5px] leading-snug text-amber-900/90"
                            >
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[9.5px] font-semibold text-slate-600">
                        <ShieldCheck className="h-3 w-3" />
                        Qué ocurre al aprobar
                      </p>
                      <ul className="mt-1 space-y-0.5 text-[9px] leading-relaxed text-slate-500">
                        <li>· Se actualizan las fechas de vigencia según la regla configurada.</li>
                        <li>· La versión anterior se conserva en el historial de OnBase.</li>
                        <li>· El semáforo del expediente se recalcula en tiempo real.</li>
                        <li>· La corrección se envía como retroalimentación al modelo.</li>
                        <li>· Las observaciones quedan en las notas del documento.</li>
                      </ul>
                    </div>

                    <p className="flex items-start gap-1.5 text-[9px] leading-relaxed text-slate-400">
                      <Inbox className="mt-0.5 h-3 w-3 shrink-0" />
                      Cada decisión se registra con usuario, fecha, motivo y versión del documento
                      para auditoría.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      )}

      <ApproveQueueModal
        item={selected}
        open={decision === 'approve'}
        onClose={() => setDecision(null)}
        onConfirm={handleApprove}
        reviewer={reviewer}
      />
      <RejectQueueModal
        item={selected}
        open={decision === 'reject'}
        onClose={() => setDecision(null)}
        onConfirm={handleReject}
      />
    </div>
  );
}
