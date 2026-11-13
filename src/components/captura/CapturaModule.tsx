import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Files,
  Inbox,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Workflow,
} from 'lucide-react';
import type { ClientDocument, QueueItem, UploadJob } from '../../types';
import { CATALOG_BY_CODE } from '../../data/catalog';
import { useAppStore } from '../../store/AppStore';
import { useNavigation } from '../../nav';
import { buildChecklist, effectiveDaysForDocument } from '../../lib/engine';
import { AI_THRESHOLD } from '../../lib/constants';
import {
  buildUploadJob,
  simulatedBatchFiles,
  simulatedDirectedFile,
  type FileDescriptor,
} from '../../lib/ai';
import { addDays, sleep, todayISO, uid } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, SectionHeading } from '../ui/Card';
import { EmptyState } from '../ui/Alert';
import { useToast } from '../ui/Toast';
import { Dropzone, type DirectedTarget } from './Dropzone';
import { UploadJobCard } from './UploadJobCard';
import { cn } from '../../lib/utils';

const SUPPORTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const SUPPORTED_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILES = 12;
const ACTIVE_PHASES: UploadJob['phase'][] = [
  'pending',
  'classifying',
  'extracting',
  'validating',
  'indexing',
];

const PIPELINE = [
  {
    title: 'Clasificación',
    detail: 'El modelo identifica el tipo de documento contra el catálogo.',
    icon: ScanLine,
  },
  {
    title: 'Extracción IA',
    detail: 'OCR y visión extraen metadatos y confianza por campo.',
    icon: Sparkles,
  },
  {
    title: 'Calidad y cruce',
    detail: 'Se valida legibilidad, firma, identidad y montos contra Bantotal.',
    icon: ShieldCheck,
  },
  {
    title: 'Decisión automática',
    detail: 'Confianza ≥ 85% sin hallazgos se indexa automáticamente.',
    icon: Workflow,
  },
  {
    title: 'OnBase o revisión',
    detail: 'Los casos dudosos pasan a la cola con el motivo exacto.',
    icon: Inbox,
  },
];

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toUpperCase() ?? 'PDF';
}

function isSupported(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_MIMES.includes(file.type) || SUPPORTED_EXTENSIONS.includes(extension);
}

export function CapturaModule({
  step = 2,
  embedded = false,
}: {
  step?: 2 | 3;
  embedded?: boolean;
}) {
  const {
    state,
    activeClient,
    permissions,
    addDocument,
    addQueueItem,
    setActiveClient,
  } = useAppStore();
  const { navigate, goToStep, uploadIntent, clearUploadIntent } = useNavigation();
  const { push } = useToast();

  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [directed, setDirected] = useState<DirectedTarget | null>(null);

  const jobsRef = useRef<UploadJob[]>(jobs);
  jobsRef.current = jobs;
  const storeRef = useRef({ state, addDocument, addQueueItem });
  storeRef.current = { state, addDocument, addQueueItem };
  const mountedRef = useRef(true);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const patchJob = useCallback((jobId: string, patch: Partial<UploadJob>) => {
    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, ...patch } : job)));
  }, []);

  const indexJob = useCallback((job: UploadJob) => {
    const store = storeRef.current;
    const client = store.state.clients.find((item) => item.id === job.clientId);
    if (!client) return;

    const days = effectiveDaysForDocument(job.docCode, store.state.overrides);
    const issueDate = todayISO();
    const expiryDate = addDays(issueDate, days.internalDays);
    const legalExpiryDate = days.legalDays ? addDays(issueDate, days.legalDays) : undefined;
    const source: ClientDocument['source'] = job.batchId ? 'Escaneo histórico' : 'Carga IA';
    const metadata = {
      ...job.extracted,
      'Versión del documento': 'v1',
    };

    const document: ClientDocument = {
      id: uid('doc'),
      code: job.docCode,
      name: job.docName,
      category: CATALOG_BY_CODE[job.docCode]?.category ?? 'Comercial',
      status: 'vigente',
      issueDate,
      expiryDate,
      legalExpiryDate,
      source,
      confidence: job.confidence,
      currentVersion: 'v1',
      versions: [
        {
          version: 'v1',
          uploadedAt: issueDate,
          uploadedBy: 'Motor IA · Document AI',
          status: 'vigente',
          source,
          confidence: job.confidence,
          notes: `Indexado automáticamente. Clasificación ${Math.round(job.confidence * 100)}% · cruce Bantotal aprobado.`,
          metadata,
        },
      ],
      metadata,
      reviewedBy: 'Motor IA · Document AI',
      notes: 'Documento validado por el orquestador sin intervención humana.',
    };

    store.addDocument(job.clientId, document, {
      autoIndexed: true,
      actor: 'Motor IA · Document AI',
    });
  }, []);

  const queueJob = useCallback((job: UploadJob) => {
    const store = storeRef.current;
    const client = store.state.clients.find((item) => item.id === job.clientId);
    if (!client) return;

    const percentage = Math.round(job.confidence * 100);
    const reason = job.reason ?? `Confianza ${percentage}%: requiere validación de un analista`;
    const critical = CATALOG_BY_CODE[job.docCode]?.critical ?? false;
    const priority: QueueItem['priority'] =
      critical || job.confidence < 0.7 ? 'alta' : job.confidence < 0.8 ? 'media' : 'baja';

    const item: QueueItem = {
      id: uid('q'),
      clientId: job.clientId,
      clientName: client.name,
      docCode: job.docCode,
      docName: job.docName,
      fileName: job.fileName,
      fileType: job.fileType,
      fileSize: job.fileSize,
      confidence: job.confidence,
      reason,
      issues: job.issues.length > 0 ? job.issues : [reason],
      metadata: job.extracted,
      submittedAt: new Date().toISOString(),
      submittedBy: 'Motor IA · Document AI',
      priority,
      source: job.batchId ? 'Escaneo histórico' : 'Carga IA',
      batchId: job.batchId,
    };

    store.addQueueItem(item);
  }, []);

  const processJob = useCallback(
    async (jobId: string) => {
      if (processedRef.current.has(jobId)) return;
      processedRef.current.add(jobId);

      const advance = async (phase: UploadJob['phase'], currentStep: number, ms: number) => {
        if (!mountedRef.current) return false;
        patchJob(jobId, { phase, step: currentStep });
        await sleep(ms);
        return mountedRef.current;
      };

      if (!(await advance('classifying', 1, 680))) return;
      if (!(await advance('extracting', 2, 980))) return;
      if (!(await advance('validating', 3, 900))) return;

      const reviewed = jobsRef.current.find((job) => job.id === jobId);
      if (!reviewed) return;

      const failedChecks = reviewed.crossChecks.filter((check) => !check.ok).length;
      const autoIndex = reviewed.confidence >= AI_THRESHOLD && failedChecks === 0;

      if (!(await advance('indexing', 4, 820))) return;

      const latest = jobsRef.current.find((job) => job.id === jobId);
      if (!latest) return;

      if (autoIndex) {
        indexJob(latest);
        patchJob(jobId, { phase: 'done', step: 5, outcome: 'indexed' });
      } else {
        queueJob(latest);
        patchJob(jobId, { phase: 'queued', step: 5, outcome: 'queued' });
      }
    },
    [indexJob, patchJob, queueJob],
  );

  const enqueueJobs = useCallback(
    (created: UploadJob[]) => {
      if (created.length === 0) return;
      setJobs((prev) => [...created, ...prev]);
      jobsRef.current = [...created, ...jobsRef.current];
      created.forEach((job, index) => {
        window.setTimeout(() => {
          void processJob(job.id);
        }, 60 + index * 420);
      });
    },
    [processJob],
  );

  useEffect(() => {
    if (!uploadIntent) return;
    const target = state.clients.find((client) => client.id === uploadIntent.clientId);
    if (target && state.activeClientId !== target.id) setActiveClient(target.id);
    setDirected({
      clientId: uploadIntent.clientId,
      docCode: uploadIntent.docCode,
      docName: uploadIntent.docName,
    });
    clearUploadIntent();
  }, [
    uploadIntent,
    state.clients,
    state.activeClientId,
    setActiveClient,
    clearUploadIntent,
  ]);

  useEffect(() => {
    setDirected((prev) => (prev && prev.clientId !== activeClient.id ? null : prev));
  }, [activeClient.id]);

  const handleFiles = useCallback(
    (files: File[]) => {
      if (!permissions.upload) {
        push({
          kind: 'warning',
          title: 'Tu rol no puede capturar documentos',
          description: 'Cambia el rol a Ejecutivo Comercial, Analista de Calidad u Oficial de Cumplimiento.',
        });
        return;
      }

      const accepted = files.filter(isSupported);
      const rejected = files.length - accepted.length;
      if (rejected > 0) {
        push({
          kind: 'error',
          title: `${rejected} archivo(s) no compatibles`,
          description: 'Solo se admiten documentos PDF, JPG o PNG.',
        });
      }
      if (accepted.length === 0) return;

      const selected = accepted.slice(0, MAX_FILES);
      if (accepted.length > MAX_FILES) {
        push({
          kind: 'info',
          title: 'Límite de carga por lote',
          description: `Se procesarán los primeros ${MAX_FILES} archivos en esta tanda.`,
        });
      }

      const items = buildChecklist(activeClient, state.overrides, state.customRules);
      const directedForClient = directed && directed.clientId === activeClient.id ? directed : null;

      const descriptors: FileDescriptor[] = selected.map((file, index) => {
        const applyDirected = directedForClient && index === 0;
        return {
          fileName: file.name,
          size: file.size,
          mime: file.type || 'application/octet-stream',
          fileType: extensionOf(file.name),
          docCode: applyDirected ? directedForClient?.docCode : undefined,
          docName: applyDirected ? directedForClient?.docName : undefined,
          isSimulated: false,
        };
      });

      const created = descriptors.map((file, index) => {
        const job = buildUploadJob({
          file,
          client: activeClient,
          items,
          overrides: state.overrides,
          customRules: state.customRules,
        });
        const original = selected[index];
        const previewUrl =
          original && original.type.startsWith('image/')
            ? URL.createObjectURL(original)
            : undefined;
        return { ...job, previewUrl };
      });

      enqueueJobs(created);
      if (directedForClient) setDirected(null);

      push({
        kind: 'success',
        title: `${created.length} documento(s) en validación`,
        description: directedForClient
          ? `Actualización dirigida de "${directedForClient.docName}" en curso.`
          : 'El motor IA clasificará, extraerá y cruzará cada archivo con Bantotal.',
      });
    },
    [
      permissions.upload,
      push,
      activeClient,
      state.overrides,
      state.customRules,
      directed,
      enqueueJobs,
    ],
  );

  const simulateBatch = useCallback(() => {
    if (!permissions.upload) {
      push({ kind: 'warning', title: 'Tu rol no puede capturar documentos' });
      return;
    }
    const items = buildChecklist(activeClient, state.overrides, state.customRules);
    const files = simulatedBatchFiles(activeClient, items);
    const batchId = uid('lote');
    const created = files.map((file) =>
      buildUploadJob({
        file,
        client: activeClient,
        items,
        overrides: state.overrides,
        customRules: state.customRules,
        batchId,
      }),
    );
    enqueueJobs(created);
    push({
      kind: 'success',
      title: 'Lote histórico generado',
      description: `${created.length} documentos escaneados con casos mixtos. La validación IA ya está corriendo.`,
    });
  }, [
    permissions.upload,
    push,
    activeClient,
    state.overrides,
    state.customRules,
    enqueueJobs,
  ]);

  const simulateDirected = useCallback(() => {
    if (!directed) return;
    const targetClient =
      state.clients.find((client) => client.id === directed.clientId) ?? activeClient;
    const items = buildChecklist(targetClient, state.overrides, state.customRules);
    const file = simulatedDirectedFile(directed.docCode, directed.docName, targetClient);
    const job = buildUploadJob({
      file,
      client: targetClient,
      items,
      overrides: state.overrides,
      customRules: state.customRules,
      scenario: 'normal',
    });
    enqueueJobs([job]);
    setDirected(null);
    push({
      kind: 'success',
      title: 'Captura dirigida iniciada',
      description: `Se validará únicamente "${directed.docName}" para ${targetClient.name}.`,
    });
  }, [
    directed,
    state.clients,
    state.overrides,
    state.customRules,
    activeClient,
    enqueueJobs,
    push,
  ]);

  const removeJob = useCallback((jobId: string) => {
    const target = jobsRef.current.find((job) => job.id === jobId);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    const next = jobsRef.current.filter((job) => job.id !== jobId);
    jobsRef.current = next;
    setJobs(next);
  }, []);

  const clearFinished = useCallback(() => {
    const next = jobsRef.current.filter((job) => ACTIVE_PHASES.includes(job.phase));
    jobsRef.current
      .filter((job) => !ACTIVE_PHASES.includes(job.phase))
      .forEach((job) => {
        if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
      });
    jobsRef.current = next;
    setJobs(next);
  }, []);

  const items = useMemo(
    () => buildChecklist(activeClient, state.overrides, state.customRules),
    [activeClient, state.overrides, state.customRules],
  );

  const indexed = jobs.filter((job) => job.outcome === 'indexed').length;
  const escalated = jobs.filter((job) => job.outcome === 'queued').length;
  const inProgress = jobs.filter((job) => ACTIVE_PHASES.includes(job.phase)).length;
  const avgConfidence = jobs.length
    ? Math.round((jobs.reduce((total, job) => total + job.confidence, 0) / jobs.length) * 100)
    : 0;

  const handleViewDoc = (docCode: string, clientId: string) => {
    if (clientId !== state.activeClientId) setActiveClient(clientId);
    goToStep(5, { focusDocCode: docCode });
  };

  const jobList = (
    <div className="space-y-3">
      {jobs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[12px] font-semibold text-brand-950">Documentos de esta sesión</p>
            <p className="mt-0.5 text-[9.5px] text-slate-400">
              {jobs.length} archivo(s) · {indexed} indexado(s) · {escalated} en cola
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={clearFinished}
            disabled={jobs.length === inProgress}
          >
            Limpiar finalizados
          </Button>
        </div>
      )}

      {jobs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ScanLine className="h-5 w-5" />}
            title={
              step === 2
                ? 'Aún no hay capturas en esta sesión'
                : 'Todavía no hay documentos validados en esta sesión'
            }
            description={
              step === 2
                ? 'Arrastra un PDF, JPG o PNG, o genera un lote histórico simulado para ver el pipeline de clasificación, extracción y validación IA.'
                : 'Los documentos que cargues en el paso de captura aparecerán aquí con su clasificación, metadatos extraídos, confianza y decisión del motor.'
            }
            action={
              step === 2 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowRight className="h-3.5 w-3.5" />}
                  onClick={simulateBatch}
                  disabled={!permissions.upload}
                >
                  Generar lote de demostración
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ScanLine className="h-3.5 w-3.5" />}
                  onClick={() => goToStep(2)}
                >
                  Ir a captura y carga
                </Button>
              )
            }
          />
        </Card>
      ) : (
        jobs.map((job) => (
          <UploadJobCard
            key={job.id}
            job={job}
            onEditField={(jobId, key, value) =>
              setJobs((prev) =>
                prev.map((entry) =>
                  entry.id === jobId
                    ? { ...entry, extracted: { ...entry.extracted, [key]: value } }
                    : entry,
                ),
              )
            }
            onRemove={removeJob}
            onViewDoc={handleViewDoc}
            onOpenQueue={() => goToStep(4)}
          />
        ))
      )}

      <p className="flex items-start gap-2 px-1 text-[9px] leading-relaxed text-slate-400">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          Los archivos reales se procesan localmente: el contenido no se envía a ningún servicio.
          La clasificación, extracción y cruce con Bantotal son simulaciones deterministas para la
          demostración.
        </span>
      </p>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SessionStat
        label="En sesión"
        value={String(jobs.length)}
        helper={`${inProgress} en proceso · ${items.length} requisitos`}
        icon={<Files className="h-3.5 w-3.5" />}
      />
      <SessionStat
        label="Indexados"
        value={String(indexed)}
        helper={`Umbral ≥ ${Math.round(AI_THRESHOLD * 100)}%`}
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        tone="success"
      />
      <SessionStat
        label="Escalados"
        value={String(escalated)}
        helper="Hallazgos o confianza baja"
        icon={<Inbox className="h-3.5 w-3.5" />}
        tone={escalated > 0 ? 'warning' : 'neutral'}
      />
      <SessionStat
        label="Confianza promedio"
        value={jobs.length ? `${avgConfidence}%` : '—'}
        helper="Extracción del lote actual"
        icon={<TrendingUp className="h-3.5 w-3.5" />}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {!embedded ? (
        <SectionHeading
          eyebrow="Captura y validación"
          title={step === 2 ? 'Captura y carga' : 'Validación IA y OCR'}
          description={
            step === 2
              ? 'Carga individual o por lote. Document AI clasifica, extrae metadatos y cruza con Bantotal antes de indexar en OnBase.'
              : 'Resultados del motor Document AI: clasificación, metadatos extraídos, confianza y decisión automática.'
          }
          actions={
            <>
              <Badge variant="outline" dot>
                Document AI
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                icon={<Inbox className="h-3.5 w-3.5" />}
                onClick={() => navigate('revision')}
              >
                Cola ({state.queue.length})
              </Button>
            </>
          }
        />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" dot className="text-[9px]">
              Document AI
            </Badge>
            <span className="text-[10px] text-slate-400">
              {step === 2
                ? 'Carga documentos o genera un lote; el motor valida automáticamente.'
                : 'Pipeline, metadatos y decisiones del motor para esta sesión.'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {step === 2 ? (
              <Button
                variant="secondary"
                size="sm"
                icon={<BrainCircuit className="h-3.5 w-3.5" />}
                onClick={() => goToStep(3)}
              >
                Ver validación IA
                {jobs.length > 0 && (
                  <span className="ml-1 rounded bg-brand-900 px-1.5 text-[9px] tabular-nums text-white">
                    {jobs.length}
                  </span>
                )}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={<ScanLine className="h-3.5 w-3.5" />}
                onClick={() => goToStep(2)}
              >
                Capturar más documentos
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<Inbox className="h-3.5 w-3.5" />}
              onClick={() => goToStep(4)}
            >
              Revisión ({state.queue.length})
            </Button>
          </div>
        </Card>
      )}

      {stats}

      {step === 2 && (
        <>
          <Dropzone
            directed={directed}
            onFiles={handleFiles}
            onSimulateBatch={simulateBatch}
            onSimulateDirected={simulateDirected}
            onClearDirected={() => setDirected(null)}
            disabled={!permissions.upload}
          />

          {!permissions.upload && (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
              Tu rol actual es de solo lectura para captura. Cambia el rol en el perfil superior
              para arrastrar documentos.
            </div>
          )}
        </>
      )}

      {step === 3 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold text-brand-950">Pipeline de validación IA</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Cada documento recorre cinco etapas antes de llegar a OnBase.
              </p>
            </div>
            <span className="text-[9.5px] text-slate-400">Document AI + Bantotal Core + OnBase</span>
          </div>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((stepItem, index) => {
              const Icon = stepItem.icon;
              return (
                <li key={stepItem.title} className="rounded border border-slate-200 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-semibold tabular-nums text-slate-300">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-brand-950">{stepItem.title}</p>
                  <p className="mt-0.5 text-[9px] leading-snug text-slate-400">{stepItem.detail}</p>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {jobList}
    </div>
  );
}

function SessionStat({
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
    <Card className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </p>
        <span className="text-slate-300">{icon}</span>
      </div>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums leading-none', tones[tone])}>
        {value}
      </p>
      <p className="mt-1.5 text-[9.5px] leading-snug text-slate-400">{helper}</p>
    </Card>
  );
}
