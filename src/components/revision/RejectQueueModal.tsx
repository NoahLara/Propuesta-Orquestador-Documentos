import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import type { QueueItem } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Field';
import { ConfidenceBadge } from '../ui/StatusPill';

const SUGGESTIONS = [
  'Documento ilegible: no permite verificar los datos del titular.',
  'Fecha de vencimiento vencida o fuera de la política interna.',
  'Firma o sello institucional no detectable.',
  'Información del documento no coincide con Bantotal Core.',
  'Tipo de documento incorrecto para el requisito del expediente.',
];

interface Props {
  item: QueueItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: string, reason: string) => void;
}

export function RejectQueueModal({ item, open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open, item?.id]);

  if (!item) return null;

  const submit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 8) {
      setError('Describe el motivo con al menos 8 caracteres para dejar trazabilidad.');
      return;
    }
    onConfirm(item.id, trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rechazar documento"
      description={`${item.docName} · ${item.clientName}`}
      size="lg"
      headerExtra={<ConfidenceBadge value={item.confidence} />}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<XCircle className="h-3.5 w-3.5" />}
            onClick={submit}
          >
            Rechazar documento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded border border-slate-200 bg-slate-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="text-[10px] leading-relaxed text-slate-600">
            <p className="font-medium text-brand-950">El rechazo queda en el expediente</p>
            <p className="mt-0.5">
              El documento se marcará como rechazado, el ejecutivo comercial verá el motivo y la
              decisión se usará para ajustar la confianza del modelo en casos similares.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Motivo detectado por la IA
          </p>
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] leading-relaxed text-amber-900">
            {item.reason}
          </p>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Motivos sugeridos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setReason(suggestion);
                  setError('');
                }}
                className={cn(
                  'rounded border px-2.5 py-1.5 text-left text-[9.5px] font-medium leading-snug transition',
                  reason === suggestion
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Motivo del rechazo"
          rows={3}
          value={reason}
          placeholder="Explica al ejecutivo qué debe corregir el cliente antes de volver a cargar el documento…"
          onChange={(event) => {
            setReason(event.target.value);
            if (error) setError('');
          }}
          hint={`${reason.trim().length} caracteres · quedará visible en el expediente`}
        />

        {error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
