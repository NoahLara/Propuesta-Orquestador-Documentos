import { Fingerprint, Landmark, ShieldCheck, UserRound } from 'lucide-react';
import type { Client, ClientDocument, DocCategory } from '../../types';
import { cn, shortName } from '../../lib/utils';

const KEYS_BY_CATEGORY: Record<DocCategory, string[]> = {
  Identidad: [
    'Nombre / Razón social',
    'Número de documento',
    'Fecha de nacimiento',
    'Fecha de emisión',
    'Fecha de vencimiento',
  ],
  Legal: [
    'Nombre / Razón social',
    'Instrumento',
    'Notario',
    'Registro',
    'Fecha de emisión',
  ],
  Financiero: [
    'Nombre / Razón social',
    'Institución emisora',
    'Período',
    'Monto',
    'Fecha de emisión',
  ],
  Comercial: [
    'Nombre / Razón social',
    'Persona de contacto',
    'Dirección',
    'Teléfono',
    'Fecha de emisión',
  ],
  Garantías: [
    'Nombre / Razón social',
    'Tipo de garantía',
    'Valor asegurado',
    'Ubicación del bien',
    'Perito',
  ],
  PLAFT: [
    'Nombre / Razón social',
    'Perfil transaccional',
    'Origen de fondos',
    'Listas consultadas',
    'Resultado',
  ],
};

const CATEGORY_TITLE: Record<DocCategory, string> = {
  Identidad: 'DOCUMENTO DE IDENTIDAD',
  Legal: 'INSTRUMENTO PÚBLICO',
  Financiero: 'ESTADO FINANCIERO',
  Comercial: 'CERTIFICACIÓN COMERCIAL',
  Garantías: 'DOCUMENTO DE GARANTÍA',
  PLAFT: 'DECLARACIÓN PLAFT',
};

function DocumentBody({
  doc,
  metadata,
}: {
  doc: ClientDocument;
  metadata: Record<string, string>;
}) {
  const keys = KEYS_BY_CATEGORY[doc.category];
  const entries = keys
    .map((key) => ({ key, value: metadata[key] }))
    .filter((entry): entry is { key: string; value: string } => Boolean(entry.value));

  if (doc.category === 'Identidad') {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[6px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              República de El Salvador
            </p>
            <p className="text-[9px] font-bold tracking-wide text-brand-950">
              {doc.code === 'DUI' ? 'DOCUMENTO ÚNICO DE IDENTIDAD' : 'IDENTIFICACIÓN TRIBUTARIA'}
            </p>
          </div>
          <span className="text-[6px] font-bold uppercase tracking-widest text-accent-600">
            {doc.code}
          </span>
        </div>
        <div className="mb-2 h-1 w-full rounded-full bg-brand-900" />
        <div className="grid grid-cols-[1fr_58px] gap-2">
          <div className="space-y-1.5">
            {entries.slice(0, 4).map((entry) => (
              <div key={entry.key}>
                <p className="text-[5.5px] font-semibold uppercase tracking-wider text-slate-400">
                  {entry.key}
                </p>
                <p className="border-b border-slate-200 pb-0.5 text-[8px] font-semibold leading-tight text-slate-700">
                  {entry.value}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-300">
              <UserRound className="h-6 w-6" />
            </div>
            <Fingerprint className="h-4 w-4 text-slate-300" />
          </div>
        </div>
        <div className="mt-2.5 space-y-[3px] rounded border border-slate-200 bg-slate-50 px-1.5 py-1 font-mono text-[4.5px] uppercase tracking-[0.16em] text-slate-500">
          <p className="truncate">SV{metadata['Número de documento']?.replace(/\W/g, '') ?? '00000000'}«««««««««««««««</p>
          <p className="truncate">{shortName(String(metadata['Nombre / Razón social'] ?? '')).toUpperCase()}««««««««««</p>
        </div>
      </div>
    );
  }

  if (doc.category === 'Financiero') {
    const amount = metadata['Monto'] ?? '$—';
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div>
            <p className="text-[6px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Banco Integral · Bantotal Core
            </p>
            <p className="text-[9px] font-bold tracking-wide text-brand-950">ESTADO FINANCIERO</p>
          </div>
          <Landmark className="h-4 w-4 text-brand-800" />
        </div>
        <p className="mb-2 text-[6.5px] text-slate-500">
          {metadata['Nombre / Razón social']} · Período {metadata['Período'] ?? '—'}
        </p>
        <div className="mb-2 grid grid-cols-3 gap-1">
          {['Ingresos', 'Egresos', 'Resultado'].map((label, index) => (
            <div key={label} className="rounded border border-slate-200 bg-slate-50 p-1">
              <p className="text-[4.5px] uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-[6.5px] font-bold text-brand-900">
                {index === 2 ? amount : index === 0 ? metadata['Monto'] ?? '$12,480.00' : '$8,210.00'}
              </p>
            </div>
          ))}
        </div>
        <table className="w-full border-collapse text-[5.5px]">
          <thead>
            <tr className="bg-brand-900 text-white">
              <th className="px-1 py-0.5 text-left font-semibold">Concepto</th>
              <th className="px-1 py-0.5 text-right font-semibold">Debe</th>
              <th className="px-1 py-0.5 text-right font-semibold">Haber</th>
            </tr>
          </thead>
          <tbody className="text-slate-600">
            {[
              ['Caja y bancos', '$4,280.00', '—'],
              ['Cuentas por cobrar', '$6,940.00', '—'],
              ['Inventario', '—', '$3,120.00'],
              ['Obligaciones bancarias', '—', '$2,450.00'],
            ].map((row) => (
              <tr key={row[0]} className="border-b border-slate-100">
                <td className="px-1 py-[3px]">{row[0]}</td>
                <td className="px-1 py-[3px] text-right tabular-nums">{row[1]}</td>
                <td className="px-1 py-[3px] text-right tabular-nums">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex items-end justify-between">
          <div className="text-[5.5px] text-slate-500">
            <p className="font-semibold text-slate-600">Firmado por contador</p>
            <p>{metadata['Firmado por contador'] ?? 'CPA registrado'}</p>
          </div>
          <div className="flex h-9 w-9 rotate-[-8deg] flex-col items-center justify-center rounded-full border border-dashed border-emerald-500/50 text-emerald-600/70">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[4px] font-bold">VERIFICADO</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[6px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        República de El Salvador · Banco Integral
      </p>
      <p className="mb-2 text-[9px] font-bold tracking-wide text-brand-950">
        {CATEGORY_TITLE[doc.category]}
      </p>
      <p className="mb-2 text-[6.5px] font-semibold leading-relaxed text-slate-600">{doc.name}</p>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div key={entry.key} className="grid grid-cols-[72px_1fr] gap-2">
            <p className="text-[5.5px] font-semibold uppercase tracking-wider text-slate-400">
              {entry.key}
            </p>
            <p className="border-b border-slate-200 pb-0.5 text-[7px] font-medium leading-tight text-slate-700">
              {entry.value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[5.5px] leading-relaxed text-slate-400">
        El presente documento se incorpora al expediente digital del cliente y se conserva como
        evidencia de la debida diligencia aplicada por Banco Integral. Su validez está sujeta a las
        políticas internas y a la normativa vigente en la República de El Salvador.
      </p>
      <div className="mt-3 flex items-end justify-between">
        <div className="w-24">
          <div className="h-px bg-slate-300" />
          <p className="mt-0.5 text-[5px] text-slate-400">Firma autorizada</p>
        </div>
        <div className="flex h-10 w-10 rotate-[-10deg] flex-col items-center justify-center rounded-full border-2 border-dashed border-brand-300/60 text-brand-500/60">
          <span className="text-[5px] font-bold tracking-wider">BANCO</span>
          <span className="text-[6px] font-black">BI</span>
          <span className="text-[3.5px] tracking-wider">ONBASE</span>
        </div>
      </div>
    </div>
  );
}

export function MockDocument({
  client,
  doc,
  metadata,
  versionLabel,
  className,
  dimmed = false,
}: {
  client: Client;
  doc: ClientDocument;
  metadata?: Record<string, string>;
  versionLabel?: string;
  className?: string;
  dimmed?: boolean;
}) {
  const data = metadata ?? doc.metadata;
  return (
    <div
      className={cn(
        'relative mx-auto flex w-full max-w-[380px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,59,95,0.45)]',
        dimmed && 'opacity-90',
        className,
      )}
      style={{ aspectRatio: '1 / 1.28' }}
    >
      <div className="h-1 w-full bg-brand-900" />
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-900">
            <span className="text-[5px] font-black text-white">BI</span>
          </div>
          <div>
            <p className="text-[5.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Banco Integral
            </p>
            <p className="text-[5px] text-slate-300">Expediente del Cliente · OnBase</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[5.5px] font-bold text-slate-400">{versionLabel ?? doc.currentVersion}</p>
          <p className="text-[4.5px] text-slate-300">Copia digital certificada</p>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden px-4 py-3">
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] select-none whitespace-nowrap text-[30px] font-black tracking-[0.08em] text-brand-950/[0.035]">
          ONBASE · COPIA
        </span>
        <DocumentBody doc={doc} metadata={data} />
        <p className="absolute bottom-1.5 right-3 text-[4px] text-slate-300">
          {client.department} · El Salvador
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-1.5 text-[4.5px] text-slate-400">
        <span>Documento simulado para demostración · No válido legalmente</span>
        <span className="font-mono">SHA-256 · 8f2a…c41d</span>
      </div>
    </div>
  );
}
