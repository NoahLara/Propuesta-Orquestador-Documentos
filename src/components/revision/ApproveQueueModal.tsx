import { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';
import type { QueueItem } from '../../types';
import { formatDateNumeric, addDays, todayISO } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Field';
import { ConfidenceBadge } from '../ui/StatusPill';

interface Props {
  item: QueueItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: string, metadata: Record<string, string>, observations?: string) => void;
  reviewer: string;
}

export function ApproveQueueModal({ item, open, onClose, onConfirm, reviewer }: Props) {
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState('');

  useEffect(() => {
    if (open && item) {
      setMetadata({ ...item.metadata });
      setObservations('');
    }
  }, [open, item?.id]);

  if (!item) return null;

  const update = (key: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  };

  const expiryPreview = formatDateNumeric(addDays(todayISO(), 180));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aprobar documento en revisión"
      description={`${item.docName} · ${item.clientName}`}
      size="lg"
      headerExtra={
        <div className="flex flex-wrap items-center gap-1.5">
          <ConfidenceBadge value={item.confidence} />
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-medium text-slate-500">
            {item.fileType} · {item.source}
          </span>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="success"
            size="sm"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            onClick={() => onConfirm(item.id, metadata, observations)}
          >
            Aprobar e indexar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded border border-slate-200 bg-slate-50 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-800" />
          <div className="text-[10px] leading-relaxed text-slate-600">
            <p className="font-medium text-brand-950">La decisión alimenta al modelo</p>
            <p className="mt-0.5">
              Se conservará la versión anterior en OnBase, se actualizará el semáforo del expediente
              y la corrección de metadatos quedará registrada como retroalimentación para Document AI.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Motivo del escalamiento
          </p>
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] leading-relaxed text-amber-900">
            {item.reason}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Metadatos validados por el analista
            </p>
            <span className="flex items-center gap-1 text-[9px] font-medium text-slate-500">
              <Sparkles className="h-2.5 w-2.5" />
              Editable
            </span>
          </div>
          <div className="grid max-h-[280px] gap-2 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-2">
            {Object.entries(metadata).map(([key, value]) => (
              <Input
                key={key}
                label={key}
                value={value}
                onChange={(event) => update(key, event.target.value)}
                className="h-9 text-[11px]"
              />
            ))}
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-slate-400">
            Las fechas de emisión y vencimiento se recalcularán automáticamente según la regla de
            vigencia vigente. Vista previa de vencimiento: <strong>{expiryPreview}</strong>.
          </p>
        </div>

        <div>
          <Textarea
            label="Observaciones del analista (opcional)"
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            placeholder="Ej.: se verificó el sello con el banco por teléfono; metadatos corregidos contra Bantotal."
            rows={3}
            className="text-[11px]"
          />
          <p className="mt-1.5 flex items-start gap-1.5 text-[9px] leading-relaxed text-slate-400">
            <MessageSquareText className="mt-0.5 h-3 w-3 shrink-0" />
            La observación queda en las notas del documento y en el historial de versiones para
            auditoría.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded border border-slate-200 p-2.5">
            <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">Revisor</p>
            <p className="mt-1 truncate text-[10.5px] font-medium text-brand-950">{reviewer}</p>
          </div>
          <div className="rounded border border-slate-200 p-2.5">
            <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">Confianza IA</p>
            <p className="mt-1 text-[10.5px] font-medium tabular-nums text-brand-950">
              {Math.round(item.confidence * 100)}%
            </p>
          </div>
          <div className="rounded border border-slate-200 p-2.5">
            <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">Archivo</p>
            <p className="mt-1 truncate text-[10.5px] font-medium text-brand-950" title={item.fileName}>
              {item.fileName}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
