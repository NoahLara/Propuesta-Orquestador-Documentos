import { CATALOG_BY_CODE } from '../data/catalog';
import type {
  ChecklistItem,
  Client,
  CrossCheck,
  CustomRule,
  DocTemplate,
  UploadJob,
  ValidityOverride,
} from '../types';
import { AI_THRESHOLD } from './constants';
import { resolveTemplate } from './engine';
import {
  addDays,
  currency,
  formatDateNumeric,
  hashString,
  seeded,
  todayISO,
  uid,
} from './utils';

export type AiScenario = 'normal' | 'blurry' | 'signature' | 'mismatch' | 'reflection' | 'unknown';

export interface FileDescriptor {
  fileName: string;
  size: number;
  mime: string;
  fileType: string;
  docCode?: string;
  docName?: string;
  scenario?: AiScenario;
  isSimulated: boolean;
}

export interface ClassificationResult {
  docCode: string;
  docName: string;
  confidence: number;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const KEYWORDS: { test: (name: string) => boolean; code: string }[] = [
  { test: (name) => name.includes('constancia') && name.includes('nit'), code: 'CONSTANCIA_NIT' },
  {
    test: (name) => name.includes('constancia') && (name.includes('ingreso') || name.includes('salario')),
    code: 'CONSTANCIA_INGRESOS',
  },
  { test: (name) => name.includes('dui'), code: 'DUI' },
  { test: (name) => name.includes('pasaporte'), code: 'PASAPORTE' },
  { test: (name) => name.includes('nomina'), code: 'NOMINA_ACCIONISTAS' },
  { test: (name) => name.includes('balance'), code: 'BALANCE_GENERAL' },
  { test: (name) => name.includes('resultado'), code: 'ESTADO_RESULTADOS' },
  { test: (name) => name.includes('iva'), code: 'DECLARACION_IVA' },
  { test: (name) => name.includes('flujo'), code: 'FLUJO_CAJA' },
  {
    test: (name) => name.includes('estado') && name.includes('cuenta'),
    code: 'ESTADOS_CUENTA',
  },
  {
    test: (name) => name.includes('escritura') && name.includes('propiedad'),
    code: 'ESCRITURA_PROPIEDAD',
  },
  { test: (name) => name.includes('escritura'), code: 'ESCRITURA_CONSTITUCION' },
  { test: (name) => name.includes('acta'), code: 'ACTA_REPRESENTANTE' },
  { test: (name) => name.includes('poder'), code: 'PODER_REPRESENTACION' },
  { test: (name) => name.includes('matricula'), code: 'MATRICULA_COMERCIO' },
  { test: (name) => name.includes('licencia'), code: 'LICENCIA_FUNCIONAMIENTO' },
  { test: (name) => name.includes('avaluo'), code: 'AVALUO' },
  { test: (name) => name.includes('gravamen'), code: 'GRAVAMENES' },
  { test: (name) => name.includes('prenda'), code: 'CONTRATO_PRENDA' },
  { test: (name) => name.includes('fianza'), code: 'FIANZA_SOLIDARIA' },
  {
    test: (name) =>
      name.includes('recibo') ||
      name.includes('domicilio') ||
      name.includes('energia') ||
      name.includes('agua'),
    code: 'COMPROBANTE_DOMICILIO',
  },
  { test: (name) => name.includes('origen'), code: 'ORIGEN_FONDOS' },
  { test: (name) => name.includes('kyc') || name.includes('conozca'), code: 'KYC' },
  { test: (name) => name.includes('lista'), code: 'LISTAS_RESTRICTIVAS' },
  {
    test: (name) => name.includes('referencia') && name.includes('banc'),
    code: 'REFERENCIAS_BANCARIAS',
  },
  { test: (name) => name.includes('referencia'), code: 'REFERENCIAS_COMERCIALES' },
  {
    test: (name) => name.includes('ambiental') || name.includes('marn'),
    code: 'PERMISO_AMBIENTAL',
  },
  {
    test: (name) => name.includes('verde') || name.includes('solar') || name.includes('certificacion'),
    code: 'CERTIFICACION_VERDE',
  },
  { test: (name) => name.includes('plan') && name.includes('negocio'), code: 'PLAN_NEGOCIOS' },
  { test: (name) => name.includes('laboral'), code: 'REFERENCIA_LABORAL' },
  { test: (name) => name.includes('nit'), code: 'NIT' },
];

export function classifyFile(
  fileName: string,
  items: ChecklistItem[],
  index = 0,
): ClassificationResult {
  const name = normalize(fileName);
  const applicable = new Set(items.map((item) => item.template.code));
  const keywordMatch = KEYWORDS.find((entry) => entry.test(name));

  let code: string | undefined;
  let confidence = 0.72;

  if (keywordMatch && applicable.has(keywordMatch.code)) {
    code = keywordMatch.code;
    confidence = 0.93;
  }

  if (!code) {
    const pending = items.filter(
      (item) => item.status === 'faltante' || item.status === 'vencido' || item.status === 'por-vencer',
    );
    const pool = pending.length > 0 ? pending : items;
    if (pool.length > 0) {
      const hash = hashString(`${fileName}-${index}`);
      code = pool[hash % pool.length].template.code;
      confidence = 0.78;
    }
  }

  const template = code ? resolveTemplate(code) : undefined;
  return {
    docCode: code ?? 'NIT',
    docName: template?.name ?? CATALOG_BY_CODE.NIT.name,
    confidence,
  };
}

function buildFields(
  template: DocTemplate,
  client: Client,
  seed: number,
): { key: string; value: string }[] {
  const today = todayISO();
  const issue = formatDateNumeric(addDays(today, -(1 + (seed % 9))));
  const expiry = formatDateNumeric(
    addDays(today, Math.max(7, template.internalDays - (seed % 5))),
  );
  const random = seeded(seed + 11);
  const amount = currency(3200 + Math.floor(random() * 18000));

  switch (template.category) {
    case 'Identidad':
      return [
        {
          key: client.personType === 'juridica' ? 'Razón social' : 'Nombre completo',
          value: client.name,
        },
        {
          key: client.personType === 'juridica' ? 'NIT' : 'Número de DUI',
          value: client.docNumber,
        },
        { key: 'Nacionalidad', value: 'Salvadoreña' },
        { key: 'Fecha de emisión', value: issue },
        { key: 'Fecha de vencimiento', value: expiry },
      ];
    case 'Legal':
      return [
        { key: 'Nombre / Razón social', value: client.name },
        { key: 'Instrumento', value: 'Instrumento público notarial' },
        { key: 'Notario', value: 'Lic. Roberto Antonio Menjívar' },
        { key: 'Número de registro', value: `${280 + (seed % 400)}-${2026}` },
        { key: 'Fecha de emisión', value: issue },
      ];
    case 'Financiero':
      return [
        { key: 'Nombre / Razón social', value: client.name },
        { key: 'Institución emisora', value: 'Banco Integral' },
        { key: 'Período', value: '2026' },
        { key: 'Monto / Saldo', value: amount },
        { key: 'NIT', value: client.nit },
        { key: 'Fecha de emisión', value: issue },
      ];
    case 'Garantías':
      return [
        { key: 'Nombre / Razón social', value: client.name },
        { key: 'Tipo de garantía', value: 'Hipotecaria' },
        { key: 'Valor asegurado', value: currency(68_000 + (seed % 22) * 4500) },
        { key: 'Ubicación del bien', value: `${client.department}, El Salvador` },
        { key: 'Perito valuador', value: 'Ing. Claudia Regalado' },
        { key: 'Fecha de emisión', value: issue },
      ];
    case 'PLAFT':
      return [
        { key: 'Nombre / Razón social', value: client.name },
        { key: 'Perfil transaccional', value: 'Medio' },
        { key: 'Origen de fondos', value: 'Actividad económica declarada' },
        { key: 'Listas consultadas', value: 'OFAC · ONU · Internas BI' },
        { key: 'Resultado', value: 'Sin coincidencias' },
        { key: 'Fecha de emisión', value: issue },
      ];
    default:
      return [
        { key: 'Nombre / Razón social', value: client.name },
        { key: 'Persona de contacto', value: client.personType === 'juridica' ? 'Gerencia General' : client.name },
        { key: 'Dirección', value: client.address },
        { key: 'Teléfono', value: client.phone },
        { key: 'Fecha de emisión', value: issue },
        { key: 'Fecha de vencimiento', value: expiry },
      ];
  }
}

function scenarioFromConfidence(confidence: number, scenario: AiScenario): number {
  const jitter = seeded(hashString(`${scenario}-${confidence}`))() * 0.03;
  if (scenario === 'normal') return Math.min(0.985, 0.9 + jitter);
  if (scenario === 'blurry') return Math.min(0.79, 0.62 + jitter);
  if (scenario === 'signature') return Math.min(0.82, 0.73 + jitter);
  if (scenario === 'mismatch') return Math.min(0.84, 0.79 + jitter);
  if (scenario === 'reflection') return Math.min(0.79, 0.71 + jitter);
  return 0.66;
}

export interface ExtractionResult {
  fields: Record<string, string>;
  fieldConfidence: Record<string, number>;
  confidence: number;
  issues: string[];
  crossChecks: CrossCheck[];
  reason?: string;
}

export function extractDocument(
  template: DocTemplate,
  client: Client,
  scenario: AiScenario,
  seed: number,
): ExtractionResult {
  const base = scenarioFromConfidence(0, scenario);
  const confidence = Math.min(0.99, base + (seeded(seed)() * 0.03));
  const fields: Record<string, string> = {};
  const fieldConfidence: Record<string, number> = {};

  buildFields(template, client, seed).forEach((field) => {
    fields[field.key] = field.value;
    const jitter = seeded(hashString(`${field.key}-${seed}`))();
    let value = Math.max(0.5, Math.min(0.995, confidence - 0.03 + jitter * 0.1));
    if (scenario === 'blurry' && /vencimiento|emisión/i.test(field.key)) {
      value = 0.56 + jitter * 0.08;
    }
    if (scenario === 'reflection' && /nombre|número|nit/i.test(field.key)) {
      value = Math.min(value, 0.72);
    }
    fieldConfidence[field.key] = value;
  });

  const mismatch = scenario === 'mismatch';
  const signatureMissing = scenario === 'signature';
  const blurred = scenario === 'blurry';
  const reflection = scenario === 'reflection';

  const crossChecks: CrossCheck[] = [
    {
      label: 'Legibilidad del documento',
      ok: !blurred && !reflection,
      detail: blurred
        ? 'Fecha de vencimiento y sello con legibilidad parcial'
        : reflection
          ? 'Reflejo sobre zona de datos del titular'
          : 'OCR completo sobre el 98% del documento',
    },
    {
      label: 'Firma y sello institucional',
      ok: !signatureMissing,
      detail: signatureMissing
        ? 'No se detectó firma ni sello del emisor'
        : 'Firma y sello detectados correctamente',
    },
    {
      label: 'Cruce Bantotal · Identificación',
      ok: !mismatch,
      detail: mismatch
        ? 'El NIT/DUI del documento no coincide con el core bancario'
        : 'Identificación conciliada con Bantotal Core',
    },
    {
      label: 'Cruce Bantotal · Titular',
      ok: !mismatch,
      detail: mismatch
        ? 'Nombre del titular con diferencia respecto a Bantotal'
        : 'Nombre del titular coincide al 100%',
    },
  ];

  if (template.category === 'Financiero') {
    crossChecks.push({
      label: 'Cruce Bantotal · Monto declarado',
      ok: !mismatch,
      detail: mismatch
        ? 'Saldo declarado difiere en $1,240.00 respecto al core'
        : 'Monto conciliado con saldo del core',
    });
  }

  const issues: string[] = [];
  if (confidence < AI_THRESHOLD) {
    issues.push(`Confianza ${Math.round(confidence * 100)}% por debajo del umbral del 85%`);
  }
  if (blurred) issues.push('Fecha de vencimiento borrosa (confianza 58%)');
  if (reflection) issues.push('Documento fotografiado con reflejo');
  if (signatureMissing) issues.push('Firma del representante legal no detectada');
  if (mismatch) issues.push('Discrepancia con Bantotal en identificación y montos');
  if (scenario === 'unknown') issues.push('Tipo de documento no reconocido con certeza');
  if (!blurred && !reflection && !signatureMissing && !mismatch && confidence < 0.9) {
    issues.push('Legibilidad parcial en campos secundarios');
  }

  let reason: string | undefined;
  if (mismatch) {
    reason = 'Discrepancia con Bantotal: identificación y monto no coinciden';
  } else if (signatureMissing) {
    reason = `Confianza ${Math.round(confidence * 100)}%: firma o sello no detectado`;
  } else if (blurred) {
    reason = `Confianza ${Math.round(confidence * 100)}%: fecha de vencimiento borrosa`;
  } else if (reflection) {
    reason = `Confianza ${Math.round(confidence * 100)}%: documento con reflejo`;
  } else if (confidence < AI_THRESHOLD) {
    reason = `Confianza ${Math.round(confidence * 100)}%: legibilidad insuficiente`;
  }

  return { fields, fieldConfidence, confidence, issues, crossChecks, reason };
}

export function inferScenario(fileName: string, size: number): AiScenario {
  const name = normalize(fileName);
  if (name.includes('borros') || name.includes('blur')) return 'blurry';
  if (name.includes('reflej')) return 'reflection';
  if (name.includes('firma') && name.includes('falt')) return 'signature';
  const roll = hashString(`${fileName}-${size}`) % 100;
  if (roll < 8) return 'blurry';
  if (roll < 13) return 'signature';
  if (roll < 17) return 'mismatch';
  if (roll < 21) return 'reflection';
  return 'normal';
}

export function buildUploadJob({
  file,
  client,
  items,
  overrides = {},
  customRules = [],
  batchId,
  scenario,
}: {
  file: FileDescriptor;
  client: Client;
  items: ChecklistItem[];
  overrides?: Record<string, ValidityOverride>;
  customRules?: CustomRule[];
  batchId?: string;
  scenario?: AiScenario;
}): UploadJob {
  const classification = file.docCode
    ? {
        docCode: file.docCode,
        docName:
          file.docName ?? resolveTemplate(file.docCode, overrides, customRules)?.name ?? 'Documento',
        confidence: 0.95,
      }
    : classifyFile(file.fileName, items);

  const template: DocTemplate =
    resolveTemplate(classification.docCode, overrides, customRules) ??
    ({
      code: classification.docCode,
      name: classification.docName,
      description: 'Documento adicional del expediente.',
      category: 'Comercial',
      internalDays: 180,
      applies: { personTypes: ['natural', 'juridica'], products: [] },
    } as DocTemplate);

  const activeScenario = scenario ?? file.scenario ?? inferScenario(file.fileName, file.size);
  const seed = hashString(`${file.fileName}-${file.size}-${activeScenario}`);
  const extraction = extractDocument(template, client, activeScenario, seed);

  return {
    id: uid('job'),
    batchId,
    fileName: file.fileName,
    fileSize: file.size,
    fileType: file.fileType,
    clientId: client.id,
    docCode: classification.docCode,
    docName: template.name || classification.docName,
    confidence: extraction.confidence,
    fieldConfidence: extraction.fieldConfidence,
    extracted: extraction.fields,
    issues: extraction.issues,
    crossChecks: extraction.crossChecks,
    phase: 'pending',
    step: 0,
    reason: extraction.reason,
    isSimulated: file.isSimulated,
  };
}

function sanitizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 46);
}

const SIMULATED_SCENARIOS: AiScenario[] = [
  'normal',
  'blurry',
  'normal',
  'signature',
  'mismatch',
  'normal',
];

export function simulatedBatchFiles(
  client: Client,
  items: ChecklistItem[],
): FileDescriptor[] {
  const priority = (item: ChecklistItem) => {
    if (item.status === 'vencido') return 0;
    if (item.status === 'faltante') return 1;
    if (item.status === 'por-vencer') return 2;
    if (item.status === 'observado') return 3;
    return 4;
  };

  const sorted = [...items].sort((a, b) => {
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return a.template.category.localeCompare(b.template.category);
  });

  const selected: ChecklistItem[] = [];
  const categoryCount = new Map<string, number>();
  sorted.forEach((item) => {
    if (selected.length >= 6) return;
    const count = categoryCount.get(item.template.category) ?? 0;
    if (count < 2) {
      selected.push(item);
      categoryCount.set(item.template.category, count + 1);
    }
  });
  sorted.forEach((item) => {
    if (selected.length < 6 && !selected.includes(item)) selected.push(item);
  });

  const seedBase = hashString(client.id) % 900;

  return selected.slice(0, 6).map((item, index) => {
    const identity =
      item.template.category === 'Identidad' || item.template.code === 'COMPROBANTE_DOMICILIO';
    const extension = identity ? 'jpg' : 'pdf';
    const size = 380_000 + ((seedBase + index * 337) % 32) * 102_400;
    return {
      fileName: `${sanitizeName(item.template.name)}_${sanitizeName(client.docNumber).slice(-6)}_2026.${extension}`,
      size,
      mime: identity ? 'image/jpeg' : 'application/pdf',
      fileType: identity ? 'JPG' : 'PDF',
      docCode: item.template.code,
      docName: item.template.name,
      scenario: SIMULATED_SCENARIOS[index % SIMULATED_SCENARIOS.length],
      isSimulated: true,
    };
  });
}

export function simulatedDirectedFile(
  docCode: string,
  docName: string,
  client: Client,
): FileDescriptor {
  return {
    fileName: `Actualizacion_${sanitizeName(docName)}_${sanitizeName(client.docNumber).slice(-4)}.pdf`,
    size: 742_000,
    mime: 'application/pdf',
    fileType: 'PDF',
    docCode,
    docName,
    scenario: 'normal',
    isSimulated: true,
  };
}
