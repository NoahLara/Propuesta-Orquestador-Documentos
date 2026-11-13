import { useEffect, useState } from 'react';
import { CheckCircle2, FileSignature, ShieldCheck } from 'lucide-react';
import type { GlobalSummary } from '../../types';
import { useAppStore } from '../../store/AppStore';
import { ROLE_META } from '../../lib/constants';
import { formatDate, todayISO } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

export function DeclarationModal({
  open,
  onClose,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  summary: GlobalSummary;
}) {
  const { activeClient, state, emitDeclaration } = useAppStore();
  const { push } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const actor = `${ROLE_META[state.role].label} · ${activeClient.executive}`;

  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

  const emit = () => {
    const count = emitDeclaration(activeClient.id, actor);
    onClose();
    push({
      kind: 'success',
      title: 'Declaración de Vigencia emitida',
      description: `${count} documentos renovados para ${activeClient.name} sin solicitar nueva documentación.`,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Emitir Declaración de Vigencia"
      description="Renovación administrativa del expediente conforme a la normativa salvadoreña aplicable."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<FileSignature className="h-3.5 w-3.5" />}
            disabled={!confirmed}
            onClick={emit}
          >
            Emitir y renovar expediente
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded border border-slate-200 bg-slate-50 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-brand-800">
            <FileSignature className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-brand-950">
              Renovación sin nueva documentación
            </p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">
              Se actualizarán las fechas de vigencia de los {activeClient.docs.length} documentos
              del expediente y se conservará el historial de versiones en OnBase. El cliente no
              deberá entregar documentos nuevamente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded border border-slate-200">
          <div className="px-3 py-2.5 text-center">
            <p className="text-lg font-semibold tabular-nums text-brand-950">
              {activeClient.docs.length}
            </p>
            <p className="text-[9px] font-medium text-slate-500">Documentos a renovar</p>
          </div>
          <div className="px-3 py-2.5 text-center">
            <p className="text-lg font-semibold tabular-nums text-brand-950">{summary.total}</p>
            <p className="text-[9px] font-medium text-slate-500">Requisitos cubiertos</p>
          </div>
          <div className="px-3 py-2.5 text-center">
            <p className="text-lg font-semibold tabular-nums text-brand-950">
              {formatDate(todayISO())}
            </p>
            <p className="text-[9px] font-medium text-slate-500">Fecha de emisión</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Alcance de la declaración
          </p>
          <ul className="max-h-44 space-y-1 overflow-y-auto rounded border border-slate-200 p-2">
            {activeClient.docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 truncate text-[10.5px] text-slate-600">
                  {doc.name}
                </span>
                <span className="shrink-0 text-[9px] text-slate-400">{doc.category}</span>
              </li>
            ))}
          </ul>
        </div>

        <label className="flex items-start gap-2.5 rounded border border-slate-200 p-3 text-[10.5px] leading-relaxed text-slate-600">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-900 focus:ring-brand-900/20"
          />
          <span>
            Confirmo que el cliente mantiene las mismas condiciones de vinculación, que no existen
            alertas PLAFT pendientes y que la renovación cumple la política interna de vigencia de
            expedientes de Banco Integral.
          </span>
        </label>

        <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-slate-400">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
          Queda registro del usuario, fecha, alcance y versión anterior de cada documento para
          auditoría y trazabilidad.
        </p>
      </div>
    </Modal>
  );
}
