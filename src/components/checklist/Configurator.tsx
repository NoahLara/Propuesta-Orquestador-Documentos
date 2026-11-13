import { useMemo, useState } from 'react';
import {
  Check,
  Info,
  Lock,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { CustomRule } from '../../types';
import { DOCUMENT_CATALOG, CATEGORY_ORDER } from '../../data/catalog';
import {
  GUARANTEE_LABELS,
  GUARANTEE_OPTIONS,
  PERSON_LABELS,
  PERSON_TYPE_OPTIONS,
  PROCESS_LABELS,
  PROCESS_OPTIONS,
  PRODUCT_LABELS,
  PRODUCT_OPTIONS,
  RISK_LABELS,
  RISK_OPTIONS,
  ROLE_META,
} from '../../lib/constants';
import { useAppStore } from '../../store/AppStore';
import { cn } from '../../lib/utils';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FieldLabel, Input, Select, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

function DaysInput({
  value,
  disabled,
  onCommit,
  ariaLabel,
}: {
  value: number;
  disabled: boolean;
  onCommit: (days: number) => void;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? draft : String(value);

  return (
    <input
      type="number"
      min={1}
      max={3650}
      value={shown}
      disabled={disabled}
      aria-label={ariaLabel}
      onFocus={() => {
        setDraft(String(value));
        setFocused(true);
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setFocused(false);
        const parsed = Number(draft);
        if (Number.isFinite(parsed) && parsed > 0 && parsed !== value) onCommit(parsed);
        else setDraft(String(value));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
      }}
      className={cn(
        'h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-right text-xs font-semibold tabular-nums text-brand-900 shadow-sm outline-none transition',
        'focus:border-brand-400 focus:ring-2 focus:ring-brand-900/10',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
      )}
    />
  );
}

function Toggle({
  enabled,
  disabled,
  onChange,
  label,
}: {
  enabled: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative h-5 w-9 rounded-full transition-colors',
        enabled ? 'bg-emerald-500' : 'bg-slate-300',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
          enabled ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

function toggleIn<T extends string>(values: T[], value: T): T[] {
  if (values.includes(value)) {
    return values.length === 1 ? values : values.filter((item) => item !== value);
  }
  return [...values, value];
}

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
  disabled,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(option.value)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10.5px] font-semibold transition',
                active
                  ? 'border-brand-300 bg-brand-50 text-brand-900'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              {active && <Check className="h-3 w-3 text-brand-700" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ruleSummary(rule: CustomRule): string[] {
  const person =
    rule.personTypes.length === 2
      ? 'Todas las personas'
      : rule.personTypes.map((value) => PERSON_LABELS[value]).join(', ');
  const products =
    rule.products.length === 3
      ? 'Todos los productos'
      : rule.products.map((value) => PRODUCT_LABELS[value]).join(', ');
  const risk =
    rule.risks.length === 3
      ? 'Todos los riesgos'
      : rule.risks.map((value) => RISK_LABELS[value]).join(', ');
  const process =
    rule.processes.length === 3
      ? 'Todos los procesos'
      : rule.processes.map((value) => PROCESS_LABELS[value]).join(', ');
  const guarantee =
    rule.guarantees.length === 4
      ? 'Todas las garantías'
      : rule.guarantees.map((value) => GUARANTEE_LABELS[value]).join(', ');
  return [person, products, risk, process, guarantee];
}

export function Configurator() {
  const { state, permissions, saveValidityOverride, addCustomRule, deleteCustomRule } = useAppStore();
  const { push } = useToast();
  const actor = ROLE_META[state.role].label;
  const canEdit = permissions.configureRules;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('todas');
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [deleteRule, setDeleteRule] = useState<CustomRule | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return DOCUMENT_CATALOG.filter((template) => {
      const matchesSearch =
        !term ||
        template.name.toLowerCase().includes(term) ||
        template.code.toLowerCase().includes(term) ||
        template.category.toLowerCase().includes(term);
      const matchesCategory = category === 'todas' || template.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const overridesCount = Object.keys(state.overrides).length;

  const docsFor = (code: string) =>
    state.clients.reduce(
      (total, client) => total + client.docs.filter((doc) => doc.code === code).length,
      0,
    );

  const commit = (templateName: string, code: string, patch: Parameters<typeof saveValidityOverride>[1]) => {
    if (!canEdit) return;
    const { affected } = saveValidityOverride(code, patch, actor);
    push({
      kind: 'success',
      title: 'Regla de vigencia actualizada',
      description: `${templateName} · ${affected} documento(s) recalculados en los expedientes.`,
    });
  };

  return (
    <div className="space-y-4">
      <Alert tone="brand" icon={<Sparkles className="h-4 w-4" />} title="Parametrización sin código">
        Las vigencias legales e internas se guardan en <strong>localStorage</strong> y recalculan los
        expedientes al instante. Las reglas personalizadas se suman al checklist cuando coinciden con
        los filtros seleccionados.
      </Alert>

      {!canEdit && (
        <Alert tone="warning" icon={<Lock className="h-4 w-4" />} title="Modo lectura para tu rol">
          Solo el <strong>Analista de Calidad</strong> puede modificar reglas de vigencia. Cambia el
          rol en la barra superior para editar la parametrización.
        </Alert>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div>
            <p className="text-[12px] font-semibold text-brand-950">
              Catálogo de documentos y vigencias
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {DOCUMENT_CATALOG.length} documentos base · {overridesCount} regla(s) ajustada(s) ·{' '}
              {state.customRules.length} regla(s) personalizada(s)
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            disabled={!canEdit}
            onClick={() => setNewRuleOpen(true)}
          >
            Nueva regla no-code
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/40 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar documento, código o categoría…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-brand-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-900/10"
            />
          </div>
          <Select
            aria-label="Filtrar por categoría"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            options={[
              { value: 'todas', label: 'Todas las categorías' },
              ...CATEGORY_ORDER.map((item) => ({ value: item, label: item })),
            ]}
            className="h-9 text-xs sm:w-[190px]"
            wrapperClassName="sm:w-[190px]"
          />
          <span className="hidden items-center gap-1 text-[10px] text-slate-400 lg:flex">
            <SlidersHorizontal className="h-3 w-3" />
            Edita los días y presiona Enter
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] uppercase tracking-[0.1em] text-slate-400">
                <th className="px-4 py-2.5 font-semibold sm:px-5">Documento</th>
                <th className="px-3 py-2.5 font-semibold">Categoría</th>
                <th className="px-3 py-2.5 text-center font-semibold">Vigencia legal</th>
                <th className="px-3 py-2.5 text-center font-semibold">Vigencia interna</th>
                <th className="px-3 py-2.5 text-center font-semibold">Docs.</th>
                <th className="px-4 py-2.5 text-center font-semibold sm:px-5">Activa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((template) => {
                const override = state.overrides[template.code];
                const internalDays = override?.internalDays ?? template.internalDays;
                const legalDays = override?.legalDays ?? template.legalDays;
                const enabled = override?.enabled ?? true;
                const customized = Boolean(override);
                return (
                  <tr key={template.code} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 sm:px-5">
                      <div className="flex items-center gap-2">
                        <p className="text-[11.5px] font-semibold text-brand-950">{template.name}</p>
                        {customized && (
                          <span className="rounded border border-accent-200 bg-accent-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-accent-700">
                            Ajustada
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[9px] text-slate-400">
                        {template.code}
                        {template.critical && ' · obligatorio'}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[9px]">
                        {template.category}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {template.legalDays ? (
                        <div className="inline-flex items-center gap-1">
                          <DaysInput
                            value={legalDays ?? template.legalDays}
                            disabled={!canEdit}
                            ariaLabel={`Vigencia legal de ${template.name}`}
                            onCommit={(days) =>
                              commit(template.name, template.code, { legalDays: days })
                            }
                          />
                          <span className="text-[9px] text-slate-400">d</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <DaysInput
                          value={internalDays}
                          disabled={!canEdit}
                          ariaLabel={`Vigencia interna de ${template.name}`}
                          onCommit={(days) =>
                            commit(template.name, template.code, { internalDays: days })
                          }
                        />
                        <span className="text-[9px] text-slate-400">d</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[10px] font-semibold tabular-nums text-slate-500">
                      {docsFor(template.code)}
                    </td>
                    <td className="px-4 py-2.5 text-center sm:px-5">
                      <Toggle
                        enabled={enabled}
                        disabled={!canEdit}
                        label={`Activar regla ${template.name}`}
                        onChange={() =>
                          commit(template.name, template.code, { enabled: !enabled })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="px-5 py-10 text-center text-xs text-slate-500">
              No hay documentos que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-950">
              Reglas personalizadas
              <Badge variant="purple" className="text-[9px]">
                {state.customRules.length}
              </Badge>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Requisitos adicionales creados por negocio sin intervención de TI.
            </p>
          </div>
        </div>

        {state.customRules.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-8 text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Plus className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-semibold text-brand-950">Aún no hay reglas personalizadas</p>
            <p className="mt-0.5 max-w-md text-[10px] leading-relaxed text-slate-400">
              Crea una regla para exigir un documento según tipo de persona, producto, riesgo,
              proceso o garantía.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {state.customRules.map((rule) => (
              <li key={rule.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-semibold text-brand-950">{rule.name}</p>
                    <Badge variant="brand" className="text-[9px]">
                      {rule.internalDays} días
                    </Badge>
                  </div>
                  {rule.description && (
                    <p className="mt-0.5 text-[10px] text-slate-500">{rule.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {ruleSummary(rule).map((condition) => (
                      <span
                        key={condition}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-500"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  disabled={!canEdit}
                  onClick={() => setDeleteRule(rule)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex items-start gap-2 px-1 text-[10px] leading-relaxed text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Ejemplo de licitación: si la Constancia de ingresos cambia de 30 a 60 días, los documentos
          existentes recalculan su fecha de vencimiento sin volver a solicitarse al cliente.
        </p>
      </div>

      <NewRuleModal
        open={newRuleOpen}
        onClose={() => setNewRuleOpen(false)}
        canEdit={canEdit}
        onCreate={(rule) => {
          addCustomRule({ ...rule, createdBy: actor }, actor);
          setNewRuleOpen(false);
          push({
            kind: 'success',
            title: 'Regla no-code creada',
            description: `${rule.name} · vigencia interna de ${rule.internalDays} días.`,
          });
        }}
      />

      <Modal
        open={Boolean(deleteRule)}
        onClose={() => setDeleteRule(null)}
        title="Eliminar regla personalizada"
        description="La regla dejará de exigirse en el checklist inmediatamente."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteRule(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => {
                if (deleteRule) {
                  deleteCustomRule(deleteRule.id, actor);
                  push({
                    kind: 'success',
                    title: 'Regla eliminada',
                    description: deleteRule.name,
                  });
                }
                setDeleteRule(null);
              }}
            >
              Eliminar regla
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-slate-600">
          ¿Confirmas la eliminación de <strong>{deleteRule?.name}</strong>? Los documentos ya
          cargados no se eliminan del expediente.
        </p>
      </Modal>
    </div>
  );
}

function NewRuleModal({
  open,
  onClose,
  onCreate,
  canEdit,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (rule: Omit<CustomRule, 'id' | 'createdAt' | 'createdBy'>) => void;
  canEdit: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState(30);
  const [personTypes, setPersonTypes] = useState<CustomRule['personTypes']>(['natural', 'juridica']);
  const [products, setProducts] = useState<CustomRule['products']>([
    'credito-mype',
    'microfinanzas-verdes',
    'vivienda',
  ]);
  const [risks, setRisks] = useState<CustomRule['risks']>(['bajo', 'medio', 'alto']);
  const [processes, setProcesses] = useState<CustomRule['processes']>([
    'vinculacion',
    'renovacion',
    'otorgamiento',
  ]);
  const [guarantees, setGuarantees] = useState<CustomRule['guarantees']>([
    'fiduciaria',
    'prendaria',
    'hipotecaria',
    'solidaria',
  ]);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setDays(30);
    setPersonTypes(['natural', 'juridica']);
    setProducts(['credito-mype', 'microfinanzas-verdes', 'vivienda']);
    setRisks(['bajo', 'medio', 'alto']);
    setProcesses(['vinculacion', 'renovacion', 'otorgamiento']);
    setGuarantees(['fiduciaria', 'prendaria', 'hipotecaria', 'solidaria']);
    setError('');
  };

  const submit = () => {
    if (!name.trim()) {
      setError('Asigna un nombre al documento requerido.');
      return;
    }
    if (!Number.isFinite(days) || days < 1) {
      setError('La vigencia debe ser mayor que cero días.');
      return;
    }
    onCreate({
      name: name.trim(),
      description: description.trim() || 'Requisito adicional definido por negocio.',
      internalDays: days,
      personTypes,
      products,
      risks,
      processes,
      guarantees,
    });
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nueva regla no-code"
      description="El documento se agregará al checklist cuando el perfil del cliente coincida con todas las condiciones."
      size="lg"
      bodyClassName="space-y-4"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={submit} disabled={!canEdit}>
            Crear regla
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Input
          label="Nombre del documento"
          placeholder="Ej. Certificación de cámara de comercio"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label="Vigencia interna (días)"
          type="number"
          min={1}
          max={3650}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        />
      </div>
      <Textarea
        label="Descripción / justificación"
        placeholder="Detalle del requisito y su origen normativo o comercial."
        rows={2}
        value={description}
        maxLength={220}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3.5">
        <ChipGroup
          label="Tipo de persona"
          options={PERSON_TYPE_OPTIONS}
          selected={personTypes}
          onToggle={(value) => setPersonTypes((prev) => toggleIn(prev, value))}
          disabled={!canEdit}
        />
        <ChipGroup
          label="Producto"
          options={PRODUCT_OPTIONS}
          selected={products}
          onToggle={(value) => setProducts((prev) => toggleIn(prev, value))}
          disabled={!canEdit}
        />
        <ChipGroup
          label="Riesgo PLAFT"
          options={RISK_OPTIONS}
          selected={risks}
          onToggle={(value) => setRisks((prev) => toggleIn(prev, value))}
          disabled={!canEdit}
        />
        <ChipGroup
          label="Proceso"
          options={PROCESS_OPTIONS}
          selected={processes}
          onToggle={(value) => setProcesses((prev) => toggleIn(prev, value))}
          disabled={!canEdit}
        />
        <ChipGroup
          label="Garantía"
          options={GUARANTEE_OPTIONS}
          selected={guarantees}
          onToggle={(value) => setGuarantees((prev) => toggleIn(prev, value))}
          disabled={!canEdit}
        />
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
          {error}
        </p>
      )}
    </Modal>
  );
}
