import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Database,
  FileImage,
  FileText,
  History,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

export interface DirectedTarget {
  clientId: string;
  docCode: string;
  docName: string;
}

interface Props {
  directed: DirectedTarget | null;
  onFiles: (files: File[]) => void;
  onSimulateBatch: () => void;
  onSimulateDirected: () => void;
  onClearDirected: () => void;
  disabled?: boolean;
}

export function Dropzone({
  directed,
  onFiles,
  onSimulateBatch,
  onSimulateDirected,
  onClearDirected,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const emitFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    emitFiles(event.target.files);
    event.target.value = '';
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (disabled) return;
    emitFiles(event.dataTransfer.files);
  };

  return (
    <Card className="overflow-hidden">
      {directed && (
        <div className="flex flex-col gap-2 border-b border-accent-200 bg-accent-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-accent-200 bg-white text-accent-600">
              <ScanLine className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-accent-700">
                Actualización dirigida
              </p>
              <p className="truncate text-[12px] font-semibold text-brand-950">
                {directed.docName}
                <span className="ml-1.5 font-mono text-[9px] font-normal text-slate-400">
                  {directed.docCode}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={onSimulateDirected}
              disabled={disabled}
            >
              Simular archivo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={openPicker}
              disabled={disabled}
            >
              Subir archivo
            </Button>
            <button
              type="button"
              onClick={onClearDirected}
              className="rounded p-1.5 text-accent-600 transition hover:bg-white/70"
              aria-label="Quitar documento dirigido"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'group flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center transition-colors',
            dragging
              ? 'border-accent-400 bg-accent-50/60'
              : 'border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-brand-50/40',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full border transition',
              dragging
                ? 'border-accent-500 bg-accent-500 text-white'
                : 'border-slate-200 bg-white text-brand-800',
            )}
          >
            <Upload className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-brand-950">
            {dragging ? 'Suelta los archivos para validarlos' : 'Arrastra aquí los documentos'}
          </p>
          <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-slate-500">
            Carga individual o por lote. El motor clasifica, extrae metadatos y cruza cada documento
            con Bantotal antes de indexarlo en OnBase.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700">
            <FileText className="h-3.5 w-3.5" />
            Seleccionar archivos
          </span>
          <span className="mt-2 text-[9.5px] text-slate-400">PDF, JPG o PNG · máximo 12 archivos</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={handleChange}
        />

        <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: 'OCR Document AI', icon: FileImage },
              { label: 'Cruce Bantotal', icon: ShieldCheck },
              { label: 'Indexar OnBase', icon: Database },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500"
                >
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  {item.label}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">
              Lote histórico
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              icon={<History className="h-3.5 w-3.5" />}
              onClick={onSimulateBatch}
              disabled={disabled}
            >
              Simular escaneo
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
