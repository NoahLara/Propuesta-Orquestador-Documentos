import { CATALOG_BY_CODE, CATEGORY_ORDER, DOCUMENT_CATALOG } from '../data/catalog';
import type {
  ChecklistItem,
  Client,
  ClientDocument,
  CustomRule,
  DocStatus,
  DocTemplate,
  EffectiveTemplate,
  GlobalSummary,
  RequirementFilters,
  ValidityOverride,
} from '../types';
import { STATUS_THRESHOLD_DAYS } from './constants';
import { daysUntil } from './utils';

export function toFilters(client: Client): RequirementFilters {
  return {
    personType: client.personType,
    product: client.product,
    risk: client.risk,
    process: client.process,
    guarantee: client.guarantee,
  };
}

function matches(template: EffectiveTemplate, filters: RequirementFilters): boolean {
  if (!template.enabled) return false;
  if (!template.applies.personTypes.includes(filters.personType)) return false;
  if (!template.applies.products.includes(filters.product)) return false;
  if (template.applies.risks && !template.applies.risks.includes(filters.risk)) return false;
  if (template.applies.processes && !template.applies.processes.includes(filters.process)) {
    return false;
  }
  if (template.applies.guarantees && !template.applies.guarantees.includes(filters.guarantee)) {
    return false;
  }
  return true;
}

export function effectiveTemplates(
  overrides: Record<string, ValidityOverride> = {},
  customRules: CustomRule[] = [],
): EffectiveTemplate[] {
  const catalog: EffectiveTemplate[] = DOCUMENT_CATALOG.map((template) => {
    const override = overrides[template.code];
    return {
      ...template,
      internalDays: override?.internalDays ?? template.internalDays,
      legalDays: override?.legalDays ?? template.legalDays,
      enabled: override?.enabled ?? true,
    };
  });

  const custom: EffectiveTemplate[] = customRules.map((rule) => ({
    code: `CUSTOM_${rule.id}`,
    name: rule.name,
    description: rule.description || 'Regla adicional configurada por el área de negocio.',
    category: 'Comercial',
    internalDays: rule.internalDays,
    applies: {
      personTypes: rule.personTypes,
      products: rule.products,
      risks: rule.risks,
      processes: rule.processes,
      guarantees: rule.guarantees,
    },
    custom: true,
    ruleId: rule.id,
    enabled: true,
  }));

  return [...catalog, ...custom];
}

export function getRequirements(
  filters: RequirementFilters,
  overrides: Record<string, ValidityOverride> = {},
  customRules: CustomRule[] = [],
): EffectiveTemplate[] {
  return effectiveTemplates(overrides, customRules)
    .filter((template) => matches(template, filters))
    .sort((a, b) => {
      const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      if (categoryDiff !== 0) return categoryDiff;
      return a.name.localeCompare(b.name, 'es');
    });
}

export function resolveTemplate(
  code: string,
  overrides: Record<string, ValidityOverride> = {},
  customRules: CustomRule[] = [],
): EffectiveTemplate | undefined {
  return effectiveTemplates(overrides, customRules).find((template) => template.code === code);
}

export function effectiveDaysForDocument(
  code: string,
  overrides: Record<string, ValidityOverride> = {},
): { internalDays: number; legalDays?: number } {
  const base: DocTemplate | undefined = CATALOG_BY_CODE[code];
  const override = overrides[code];
  return {
    internalDays: override?.internalDays ?? base?.internalDays ?? 180,
    legalDays: override?.legalDays ?? base?.legalDays,
  };
}

/** Determina el estado visual del documento combinando vigencia legal e interna. */
export function resolveStatus(doc: ClientDocument): DocStatus {
  if (doc.status === 'observado' || doc.status === 'rechazado') return doc.status;

  const internal = daysUntil(doc.expiryDate);
  const legal = daysUntil(doc.legalExpiryDate);
  const candidates = [internal, legal].filter((value): value is number => value !== null);

  if (candidates.length === 0) return 'vigente';
  if (candidates.some((days) => days < 0)) return 'vencido';
  if (candidates.some((days) => days <= STATUS_THRESHOLD_DAYS)) return 'por-vencer';
  return 'vigente';
}

export function daysToExpire(doc: ClientDocument): number | null {
  const internal = daysUntil(doc.expiryDate);
  const legal = daysUntil(doc.legalExpiryDate);
  const candidates = [internal, legal].filter((value): value is number => value !== null);
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

function latestDocument(client: Client, code: string): ClientDocument | undefined {
  return client.docs
    .filter((doc) => doc.code === code)
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
}

export function buildChecklist(
  client: Client,
  overrides: Record<string, ValidityOverride> = {},
  customRules: CustomRule[] = [],
  filters?: RequirementFilters,
): ChecklistItem[] {
  const activeFilters = filters ?? toFilters(client);
  return getRequirements(activeFilters, overrides, customRules).map((template) => {
    const existing = latestDocument(client, template.code);
    const status = existing ? resolveStatus(existing) : 'faltante';
    return {
      template,
      existing,
      status,
      onbaseReuse: Boolean(
        existing && existing.source === 'OnBase' && (status === 'vigente' || status === 'por-vencer'),
      ),
      daysToExpire: existing ? daysToExpire(existing) : null,
    };
  });
}

export function summarizeChecklist(items: ChecklistItem[]): GlobalSummary {
  const total = items.length;
  const valid = items.filter((item) => item.status === 'vigente').length;
  const expiring = items.filter((item) => item.status === 'por-vencer').length;
  const observed = items.filter((item) => item.status === 'observado').length;
  const expired = items.filter((item) => item.status === 'vencido').length;
  const missing = items.filter((item) => item.status === 'faltante').length;
  const rejected = items.filter((item) => item.status === 'rechazado').length;

  const invalid = expired + missing + rejected;
  let status: GlobalSummary['status'] = 'vigente';
  if (invalid > 0) {
    const validIncludingExpiring = valid + expiring;
    const threshold = Math.max(1, Math.ceil(total * 0.6));
    status = invalid >= threshold || validIncludingExpiring === 0 ? 'vencido' : 'parcial';
  }

  const canDeclare = total > 0 && missing === 0 && rejected === 0 && expired > 0;

  return {
    status,
    total,
    valid,
    expiring,
    observed,
    expired,
    missing,
    rejected,
    canDeclare,
  };
}

export function summarizeClient(
  client: Client,
  overrides: Record<string, ValidityOverride> = {},
  customRules: CustomRule[] = [],
): GlobalSummary {
  return summarizeChecklist(buildChecklist(client, overrides, customRules));
}

export function isValidStatus(status: DocStatus): boolean {
  return status === 'vigente' || status === 'por-vencer';
}

export function progressValue(summary: GlobalSummary): number {
  if (summary.total === 0) return 0;
  return Math.round(((summary.valid + summary.expiring) / summary.total) * 100);
}
