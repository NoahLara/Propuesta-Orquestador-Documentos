import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CalendarClock,
  Columns2,
  Database,
  FileClock,
  PencilLine,
  Scale,
  X,
} from 'lucide-react';
import type { ClientDocument } from '../../types';
import { useAppStore } from '../../store/AppStore';
import { useNavigation } from '../../nav';
import { daysUntil, formatDate, formatDateNumeric } from '../../lib/utils';
import { resolveStatus, daysToExpire } from '../../lib/engine';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConfidenceBadge, DocStatusBadge } from '../ui/StatusPill';
import { cn } from '../../lib/utils';
import { MockDocument } from './MockDocument';

function versionMetadata(doc: ClientDocument, versionLabel: string): Record<string, string> {
  const version = doc.versions.find((entry) => entry.version === versionLabel);
  if (!version) return doc.metadata;
  if (version.version === doc.currentVersion) return doc.metadata;
  return version.metadata ?? doc.metadata;
}

export function DocumentPreviewModal({
  docCode,
  onClose,
}: {
  docCode: string | null;
  onClose: () => void;
}) {
  const { activeClient, permissions } = useAppStore();
  const { navigate } = useNavigation();
  const doc = activeClient.docs.find((entry) => entry.code === docCode) ?? null;

  const [compare, setCompare] = useState(false);
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');

  const versions = useMemo(() => doc?.versions ?? [], [doc]);
  const canCompare = versions.length > 1;

  useEffect(() => {
    if (!doc) return;
    setCompare(false);
    setVersionA(doc.versions[1]?.version ?? doc.currentVersion);
    setVersionB(doc.currentVersion);
  }, [doc?.id, doc?.currentVersion]);

  useEffect(() => {
    if (!docCode) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previous;
    };
  }, [docCode, onClose]);

  if (!doc) return null;

  const status = resolveStatus(doc);
  const days = daysToExpire(doc);
  const internalDays = daysUntil(doc.expiryDate);
  const legalDays = daysUntil(doc.legalExpiryDate);

  const metaA = versionMetadata(doc, versionA);
  const metaB = versionMetadata(doc, versionB);
  const diffKeys = Array.from(new Set([...Object.keys(metaA), ...Object.keys(metaB)]));
  const changedKeys = diffKeys.filter((key) => (metaA[key] ?? '') !== (metaB[key] ?? ''));
  const orderedKeys = [
    ...changedKeys,
    ...diffKeys.filter((key) => !changedKeys.includes(key)),
  ];

  const canUpdate = permissions.upload;

  const goUpdate = () => {
    navigate('cliente', {
      step: 2,
      uploadIntent: {
        clientId: activeClient.id,
        docCode: doc.code,
        docName: doc.name,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Cerrar previsualización"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/25"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Previsualización de ${doc.name}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-[1020px] flex-col border-l border-slate-200 bg-white shadow-lift"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <DocStatusBadge status={status} />
              <Badge variant="brand" className="text-[9px]">
                {doc.currentVersion}
              </Badge>
              <Badge variant="outline" className="text-[9px]">
                <Database className="h-2.5 w-2.5" />
                {doc.source}
              </Badge>
              {doc.confidence && <ConfidenceBadge value={doc.confidence} />}
            </div>
            <h2 className="mt-1.5 text-[15px] font-semibold leading-tight text-brand-950">
              {doc.name}
            </h2>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">
              {activeClient.name} · {doc.category} · Expediente digital certificado
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-[1.45fr_1fr]">
            <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:p-5 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {compare ? 'Comparador lado a lado' : 'Previsualización del documento'}
                </p>
                {canCompare ? (
                  <div className="inline-flex rounded border border-slate-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setCompare(false)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition',
                        !compare ? 'bg-brand-900 text-white' : 'text-slate-500 hover:text-brand-900',
                      )}
                    >
                      <FileClock className="h-3 w-3" />
                      Documento
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompare(true)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition',
                        compare ? 'bg-brand-900 text-white' : 'text-slate-500 hover:text-brand-900',
                      )}
                    >
                      <Columns2 className="h-3 w-3" />
                      Comparar
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] text-slate-400">Única versión registrada</span>
                )}
              </div>

              {!compare ? (
                <>
                  <MockDocument client={activeClient} doc={doc} versionLabel={doc.currentVersion} />
                  <div className="mx-auto mt-3 flex max-w-[380px] flex-wrap items-center justify-between gap-2 text-[9px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Documento validado por Document AI
                    </span>
                    {doc.confidence && <ConfidenceBadge value={doc.confidence} />}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        A
                      </span>
                      <select
                        value={versionA}
                        onChange={(event) => setVersionA(event.target.value)}
                        className="h-7 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-700 outline-none focus:border-brand-700"
                        aria-label="Versión anterior"
                      >
                        {versions.map((version) => (
                          <option key={version.version} value={version.version}>
                            {version.version} · {formatDate(version.uploadedAt)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        B
                      </span>
                      <select
                        value={versionB}
                        onChange={(event) => setVersionB(event.target.value)}
                        className="h-7 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-700 outline-none focus:border-brand-700"
                        aria-label="Versión actual"
                      >
                        {versions.map((version) => (
                          <option key={version.version} value={version.version}>
                            {version.version} · {formatDate(version.uploadedAt)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="ml-auto rounded border border-amber-200 bg-amber-50 px-1.5 py-1 text-[9px] font-medium text-amber-700">
                      {changedKeys.length} campo(s) modificado(s)
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: `Versión A · ${versionA}`, meta: metaA, version: versionA },
                      { label: `Versión B · ${versionB}`, meta: metaB, version: versionB },
                    ].map((pane, index) => (
                      <div key={pane.label}>
                        <div className="mb-1.5 flex items-center justify-between px-0.5">
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                            {pane.label}
                          </span>
                          <span className="text-[8px] text-slate-400">
                            {formatDate(
                              versions.find((v) => v.version === pane.version)?.uploadedAt,
                            )}
                          </span>
                        </div>
                        <MockDocument
                          client={activeClient}
                          doc={doc}
                          metadata={pane.meta}
                          versionLabel={pane.version}
                          className={
                            index === 0
                              ? 'ring-1 ring-amber-200'
                              : 'ring-1 ring-emerald-200'
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 overflow-hidden rounded border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Diferencias detectadas · {versionA} vs {versionB}
                      </p>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-[10px]">
                        <thead className="sticky top-0 bg-slate-50 text-[8px] uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="px-3 py-1.5 font-semibold">Campo</th>
                            <th className="px-3 py-1.5 font-semibold">Versión A</th>
                            <th className="px-3 py-1.5 font-semibold">Versión B</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orderedKeys.map((key) => {
                            const changed = changedKeys.includes(key);
                            return (
                              <tr key={key} className={changed ? 'bg-amber-50/50' : undefined}>
                                <td className="px-3 py-1.5 font-medium text-slate-500">{key}</td>
                                <td className="px-3 py-1.5 text-slate-600">{metaA[key] ?? '—'}</td>
                                <td
                                  className={cn(
                                    'px-3 py-1.5',
                                    changed ? 'font-medium text-amber-800' : 'text-slate-600',
                                  )}
                                >
                                  {metaB[key] ?? '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Vigencias y trazabilidad
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                    <p className="flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">
                      <CalendarClock className="h-2.5 w-2.5" />
                      Vigencia interna
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-brand-950">
                      {formatDate(doc.expiryDate)}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-[9px] font-medium',
                        internalDays !== null && internalDays < 0
                          ? 'text-red-600'
                          : internalDays !== null && internalDays <= 15
                            ? 'text-amber-600'
                            : 'text-emerald-600',
                      )}
                    >
                      {internalDays === null
                        ? 'Sin vencimiento'
                        : internalDays < 0
                          ? `Vencida hace ${Math.abs(internalDays)} días`
                          : `Vigente · ${internalDays} días restantes`}
                    </p>
                  </div>
                  <div className="rounded border border-slate-200 bg-white p-2.5">
                    <p className="flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">
                      <Scale className="h-2.5 w-2.5" />
                      Vigencia legal
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-brand-950">
                      {doc.legalExpiryDate ? formatDate(doc.legalExpiryDate) : 'No aplica'}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-[9px] font-medium',
                        legalDays !== null && legalDays < 0
                          ? 'text-red-600'
                          : legalDays !== null && legalDays <= 15
                            ? 'text-amber-600'
                            : 'text-slate-500',
                      )}
                    >
                      {legalDays === null
                        ? 'Documento sin caducidad legal'
                        : legalDays < 0
                          ? `Vencida hace ${Math.abs(legalDays)} días`
                          : `${legalDays} días restantes`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-slate-200 px-3 py-2 text-[9px] text-slate-500">
                  <span>
                    Emitido:{' '}
                    <strong className="font-medium text-slate-700">
                      {formatDateNumeric(doc.issueDate)}
                    </strong>
                  </span>
                  <span>
                    Estado: <strong className="font-medium text-slate-700">{status}</strong>
                  </span>
                  <span>
                    Revisado por:{' '}
                    <strong className="font-medium text-slate-700">
                      {doc.reviewedBy ?? 'OnBase'}
                    </strong>
                  </span>
                </div>
                {days !== null && days < 0 && (
                  <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[9.5px] font-medium text-red-700">
                    Documento vencido: actualízalo solo si el resto del expediente está vigente.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Metadatos extraídos
                </p>
                <div className="divide-y divide-slate-100 rounded border border-slate-200">
                  {Object.entries(doc.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-2 px-2.5 py-1.5">
                      <span className="text-[9px] leading-snug text-slate-400">{key}</span>
                      <span className="max-w-[60%] text-right text-[9.5px] font-medium leading-snug text-slate-700">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Historial de versiones
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-500">
                    {versions.length}
                  </span>
                </p>
                <ol className="space-y-2">
                  {versions.map((version) => (
                    <li
                      key={version.version}
                      className="relative rounded border border-slate-200 bg-white p-2.5 pl-3"
                    >
                      <span
                        className={cn(
                          'absolute left-0 top-2.5 h-[calc(100%-20px)] w-[2px] rounded-r',
                          version.version === doc.currentVersion
                            ? 'bg-emerald-400'
                            : 'bg-slate-200',
                        )}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-brand-950">
                          {version.version}
                          {version.version === doc.currentVersion && (
                            <span className="rounded bg-emerald-50 px-1 py-0.5 text-[7.5px] font-semibold uppercase tracking-wide text-emerald-600">
                              Actual
                            </span>
                          )}
                        </span>
                        <span className="text-[8.5px] text-slate-400">
                          {formatDate(version.uploadedAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[8.5px] text-slate-500">
                        {version.source} · {version.uploadedBy}
                      </p>
                      {version.notes && (
                        <p className="mt-1 text-[8.5px] leading-relaxed text-slate-400">
                          {version.notes}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5">
                        <DocStatusBadge status={version.status} compact />
                        {version.confidence && <ConfidenceBadge value={version.confidence} />}
                      </div>
                    </li>
                  ))}
                </ol>
                {canCompare && (
                  <button
                    type="button"
                    onClick={() => setCompare((value) => !value)}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-brand-800 underline-offset-2 hover:underline"
                  >
                    <Columns2 className="h-3 w-3" />
                    {compare ? 'Volver a vista individual' : 'Comparar versiones lado a lado'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-5">
          <span className="mr-auto hidden text-[10px] text-slate-400 sm:block">
            Última actualización: {formatDate(doc.issueDate)} · Conservado en OnBase
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          {canUpdate && (
            <Button
              variant="primary"
              size="sm"
              icon={<PencilLine className="h-3.5 w-3.5" />}
              onClick={goUpdate}
            >
              Actualizar este documento
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
