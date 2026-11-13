import type {
  DocStatus,
  Guarantee,
  PersonType,
  Process,
  Product,
  RiskLevel,
  Role,
} from '../types';

export const ROLE_META: Record<
  Role,
  { label: string; short: string; description: string; tone: string }
> = {
  ejecutivo: {
    label: 'Ejecutivo Comercial',
    short: 'Ejecutivo',
    description: 'Gestiona expedientes, captura documentos y solicita renovaciones.',
    tone: 'bg-brand-100 text-brand-900 border-brand-200',
  },
  calidad: {
    label: 'Analista de Calidad',
    short: 'Calidad',
    description: 'Revisa excepciones, aprueba documentos y parametriza reglas.',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cumplimiento: {
    label: 'Oficial de Cumplimiento',
    short: 'Cumplimiento',
    description: 'Supervisa PLAFT, listas restrictivas y aprobaciones sensibles.',
    tone: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export interface Permissions {
  configureRules: boolean;
  reviewQueue: boolean;
  upload: boolean;
  emitDeclaration: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, Permissions> = {
  ejecutivo: {
    configureRules: false,
    reviewQueue: false,
    upload: true,
    emitDeclaration: true,
  },
  calidad: {
    configureRules: true,
    reviewQueue: true,
    upload: true,
    emitDeclaration: false,
  },
  cumplimiento: {
    configureRules: false,
    reviewQueue: true,
    upload: true,
    emitDeclaration: true,
  },
};

export const PERSON_TYPE_OPTIONS: { value: PersonType; label: string }[] = [
  { value: 'natural', label: 'Persona Natural' },
  { value: 'juridica', label: 'Persona Jurídica' },
];

export const PRODUCT_OPTIONS: { value: Product; label: string }[] = [
  { value: 'credito-mype', label: 'Crédito MYPE' },
  { value: 'microfinanzas-verdes', label: 'Microfinanzas Verdes' },
  { value: 'vivienda', label: 'Vivienda' },
];

export const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: 'bajo', label: 'Riesgo Bajo' },
  { value: 'medio', label: 'Riesgo Medio' },
  { value: 'alto', label: 'Riesgo Alto' },
];

export const PROCESS_OPTIONS: { value: Process; label: string }[] = [
  { value: 'vinculacion', label: 'Vinculación' },
  { value: 'renovacion', label: 'Renovación' },
  { value: 'otorgamiento', label: 'Otorgamiento' },
];

export const GUARANTEE_OPTIONS: { value: Guarantee; label: string }[] = [
  { value: 'fiduciaria', label: 'Fiduciaria' },
  { value: 'prendaria', label: 'Prendaria' },
  { value: 'hipotecaria', label: 'Hipotecaria' },
  { value: 'solidaria', label: 'Solidaria' },
];

export const PRODUCT_LABELS: Record<Product, string> = {
  'credito-mype': 'Crédito MYPE',
  'microfinanzas-verdes': 'Microfinanzas Verdes',
  vivienda: 'Vivienda',
};

export const PROCESS_LABELS: Record<Process, string> = {
  vinculacion: 'Vinculación',
  renovacion: 'Renovación',
  otorgamiento: 'Otorgamiento',
};

export const GUARANTEE_LABELS: Record<Guarantee, string> = {
  fiduciaria: 'Fiduciaria',
  prendaria: 'Prendaria',
  hipotecaria: 'Hipotecaria',
  solidaria: 'Solidaria',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
};

export const PERSON_LABELS: Record<PersonType, string> = {
  natural: 'Persona natural',
  juridica: 'Persona jurídica',
};

export const STATUS_META: Record<
  DocStatus,
  { label: string; dot: string; chip: string; helper: string }
> = {
  vigente: {
    label: 'Vigente',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    helper: 'Cumple vigencia legal e interna',
  },
  'por-vencer': {
    label: 'Próximo a vencer',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    helper: 'Vence en los próximos 15 días',
  },
  observado: {
    label: 'Observado',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    helper: 'Requiere corrección o revisión',
  },
  vencido: {
    label: 'Vencido',
    dot: 'bg-red-500',
    chip: 'bg-red-50 text-red-700 border-red-200',
    helper: 'Vigencia legal o interna expirada',
  },
  rechazado: {
    label: 'Rechazado',
    dot: 'bg-red-500',
    chip: 'bg-red-50 text-red-700 border-red-200',
    helper: 'Rechazado en revisión humana',
  },
  faltante: {
    label: 'Faltante',
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
    helper: 'Aún no existe en el expediente',
  },
};

export const GLOBAL_STATUS_META = {
  vigente: {
    label: 'Expediente vigente',
    short: 'Vigente',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'text-emerald-500',
    description: 'Todos los requisitos obligatorios están vigentes.',
  },
  parcial: {
    label: 'Parcialmente vigente',
    short: 'Parcial',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    ring: 'text-amber-500',
    description: 'Existen documentos faltantes u observados por resolver.',
  },
  vencido: {
    label: 'Vencido total por riesgo',
    short: 'Vencido',
    chip: 'bg-red-50 text-red-700 border-red-200',
    ring: 'text-red-500',
    description: 'El expediente no cuenta con documentos válidos para operar.',
  },
} as const;

export const AI_THRESHOLD = 0.85;

export const STATUS_THRESHOLD_DAYS = 15;
