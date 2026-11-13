import { useState } from 'react';
import { Database, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/AppStore';
import { useNavigation } from '../../nav';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

export function Footer() {
  const { resetDemo } = useAppStore();
  const { navigate } = useNavigation();
  const { push } = useToast();
  const [open, setOpen] = useState(false);

  const restore = () => {
    resetDemo();
    setOpen(false);
    navigate('cartera');
    push({
      kind: 'success',
      title: 'Datos demo restaurados',
      description: 'Clientes, documentos, reglas y métricas volvieron a su estado inicial.',
    });
  };

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
          <span className="font-medium text-slate-500">Banco Integral · Orquestador Documental</span>
          <span className="hidden h-3 w-px bg-slate-200 sm:block" />
          <span className="inline-flex items-center gap-1">
            <Database className="h-3 w-3" />
            Estado en localStorage
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-400 transition hover:text-brand-800"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar datos demo
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Restaurar datos demo"
        description="Esta acción reemplaza todos los cambios realizados en este navegador."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={restore}>
              Restaurar demo
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs leading-relaxed text-slate-600">
          <p>
            Se restablecerán los 6 clientes precargados, sus expedientes, la cola de revisión humana,
            las reglas de vigencia y las métricas del motor IA.
          </p>
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
            Los documentos que hayas subido o las aprobaciones manuales se perderán.
          </p>
        </div>
      </Modal>
    </footer>
  );
}
