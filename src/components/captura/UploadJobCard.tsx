import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  FileText,
  Inbox,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { UploadJob } from '../../types';
import { AI_THRESHOLD } from '../../lib/constants';
import { cn, fileSizeLabel } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConfidenceBadge } from '../ui/StatusPill';
import { Input } from '../ui/Field';
import { ValidationStepper } from './ValidationStepper';

const PHASE_META: Record<UploadJob['phase'], { label: string; chip: string }> = {
  pending: { label: 'En espera', chip: 'border-slate-200 bg-slate-50 text-slate-500' },
  classifying: { label: 'Clasificando', chip: 'border-sky-200 bg-sky-50 text-sky-700' },
  extracting: { label: 'Extrayendo', chip: 'border-sky-200 bg-sky-50 text-sky-700' },
  validating: { label: 'Validando', chip: 'border-brand-200 bg-brand-50 text-brand-700' },
  indexing: { label: 'Indexando', chip: 'border-accent-200 bg-accent-50 text-accent-700' },
  done: { label: 'Indexado', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  queued: { label: 'En revisión', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
  error: { label: 'Error', chip: 'border-red-200 bg-red-50 text-red-700' },
};

const STEP_TEXT: Partial<Record<UploadJob['phase'], string>> = {
  pending: 'Documento recibido. Iniciando el pipeline de validación…',
  classifying: 'Clasificando el tipo de documento con Vertex AI…',
  extracting: 'Extrayendo metadatos con Document AI (OCR + visión)…',
  validating: 'Validando calidad, firma y cruce con Bantotal Core…',
  indexing: 'Indexando el documento en OnBase…',
};

interface Props {
  job: UploadJob;
  onEditField: (jobId: string, key: string, value: string) => void;
  onRemove: (jobId: string) => void;
  onViewDoc: (docCode: string, clientId: string) => void;
  onOpenQueue: () => void;
}

function confidenceTone(value: number | undefined): string {
  if (value === undefined) return 'bg-slate-300';
  if (value >= 0.9) return 'bg-emerald-500';
  if (value >= AI_THRESHOLD) return 'bg-sky-500';
  if (value >= 0.7) return 'bg-amber-500';
  return 'bg-red-500';
}

export function UploadJobCard({ job, onEditField, onRemove, onViewDoc, onOpenQueue }: Props) {
  const meta = PHASE_META[job.phase];
  const terminal = job.phase === 'done' || job.phase === 'queued';
  const active =
    job.phase === 'pending' ||
    job.phase === 'classifying' ||
    job.phase === 'extracting' ||
    job.phase === 'validating' ||
    job.phase === 'indexing';
  const showExtraction = job.step >= 2 || terminal;
  const showValidation = job.step >= 3 || terminal;
  const locked = terminal || job.phase === 'indexing' || job.phase === 'error';
  const percentage = Math.round(job.confidence * 100);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-white',
        job.phase === 'done'
          ? 'border-emerald-200'
          : job.phase === 'queued'
            ? 'border-amber-200'
            : 'border-slate-200',
      )}
    >
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white text-slate-500">
            {job.previewUrl ? (
              <img src={job.previewUrl} alt={job.fileName} className="h-full w-full object-cover" />
            ) : job.fileType === 'JPG' || job.fileType === 'PNG' || job.fileType === 'JPEG' ? (
              <FileImage className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-brand-950" title={job.fileName}>
              {job.fileName}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-400">
              <span>
                {job.fileType} · {fileSizeLabel(job.fileSize)}
              </span>
              {job.isSimulated && <span>· simulado</span>}
              {job.batchId && <span className="font-mono">· lote {job.batchId.slice(-5)}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-[46px] sm:pl-0">
          {showExtraction && <ConfidenceBadge value={job.confidence} />}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-medium',
              meta.chip,
            )}
          >
            {active && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            {meta.label}
          </span>
          <button
            type="button"
            onClick={() => onRemove(job.id)}
            className="rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={`Quitar ${job.fileName}`}
            title="Quitar de la lista"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <ValidationStepper job={job} />

        {active && (
          <div className="flex items-center gap-2.5 rounded border border-slate-200 bg-slate-50 px-3 py-2">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-700" />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-medium text-brand-950">
                {STEP_TEXT[job.phase] ?? 'Procesando documento…'}
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-800 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, Math.max(8, (job.step / 5) * 100))}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-[9px] font-semibold tabular-nums text-brand-800">
              {Math.round(Math.min(100, (job.step / 5) * 100))}%
            </span>
          </div>
        )}

        {job.phase === 'done' && (
          <div className="rounded border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-emerald-900">
                  Indexado automáticamente en OnBase
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-800/80">
                  {job.docName} · confianza {percentage}% · el expediente ya refleja la nueva versión
                  y el semáforo se recalculó.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="success" dot className="text-[8.5px]">
                    Sin intervención humana
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw className="h-3 w-3" />}
                    onClick={() => onViewDoc(job.docCode, job.clientId)}
                  >
                    Ver en expediente
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {job.phase === 'queued' && (
          <div className="rounded border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-start gap-2.5">
              <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-amber-950">
                  Enviado a la cola de revisión humana
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-amber-900/80">
                  {job.reason ?? `Confianza ${percentage}%: requiere validación de un analista.`}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  icon={<Inbox className="h-3 w-3" />}
                  onClick={onOpenQueue}
                >
                  Abrir cola de revisión
                </Button>
              </div>
            </div>
          </div>
        )}

        {job.phase === 'error' && (
          <div className="rounded border border-red-200 bg-red-50/60 p-3">
            <div className="flex items-start gap-2.5">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-[10.5px] leading-relaxed text-red-800">
                No fue posible procesar el documento. Intenta de nuevo con una imagen más nítida.
              </p>
            </div>
          </div>
        )}

        {showExtraction && (
          <div className="rounded border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Metadatos extraídos · Document AI
              </p>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[8.5px] text-slate-400">{job.docCode}</span>
                {!locked && (
                  <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[8px] font-medium text-slate-500">
                    Editable antes de indexar
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-x-3 gap-y-2 p-3 sm:grid-cols-2">
              {Object.entries(job.extracted).map(([key, value]) => {
                const fieldValue = job.fieldConfidence[key];
                return (
                  <div key={key} className="min-w-0">
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className="truncate text-[8.5px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                        {key}
                      </span>
                      <span
                        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', confidenceTone(fieldValue))}
                        title={
                          fieldValue === undefined
                            ? 'Sin confianza registrada'
                            : `Confianza ${Math.round(fieldValue * 100)}%`
                        }
                      />
                    </div>
                    <Input
                      value={value}
                      aria-label={key}
                      disabled={locked}
                      onChange={(event) => onEditField(job.id, key, event.target.value)}
                      className="h-8 text-[10.5px]"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[8.5px] text-slate-400">
              <span>Clasificación: {job.docName}</span>
              <span className="flex items-center gap-1.5">
                Confianza global
                <span className="font-semibold tabular-nums text-slate-600">{percentage}%</span>
                <span className="text-slate-300">· umbral {Math.round(AI_THRESHOLD * 100)}%</span>
              </span>
            </div>
          </div>
        )}

        {showValidation && (
          <div className="grid gap-2 sm:grid-cols-2">
            {job.crossChecks.map((check) => (
              <div
                key={check.label}
                className={cn(
                  'flex items-start gap-2 rounded border px-2.5 py-2',
                  check.ok
                    ? 'border-emerald-100 bg-emerald-50/40'
                    : 'border-red-100 bg-red-50/40',
                )}
              >
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                )}
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-[9.5px] font-medium leading-tight',
                      check.ok ? 'text-emerald-900' : 'text-red-900',
                    )}
                  >
                    {check.label}
                  </p>
                  <p className="mt-0.5 text-[8.5px] leading-snug text-slate-500">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {showValidation && job.issues.length > 0 && (
          <div className="rounded border border-amber-200 bg-amber-50/60 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[9.5px] font-medium text-amber-900">
              <AlertTriangle className="h-3 w-3" />
              Hallazgos del motor IA
            </p>
            <ul className="mt-1 space-y-0.5">
              {job.issues.map((issue) => (
                <li
                  key={issue}
                  className="flex items-start gap-1.5 text-[9px] leading-snug text-amber-800/90"
                >
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {terminal && !job.issues.length && (
          <p className="flex items-center gap-1.5 text-[9px] text-slate-400">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Todos los controles de calidad y cruces con Bantotal se completaron sin hallazgos.
          </p>
        )}
      </div>
    </div>
  );
}
