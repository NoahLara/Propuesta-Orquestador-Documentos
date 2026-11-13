import { CATALOG_BY_CODE } from '../data/catalog';
import type {
  ActivityItem,
  AppState,
  Client,
  ClientDocument,
  DocTemplate,
  DocVersion,
  Metrics,
  Product,
  Process,
  Guarantee,
  QueueItem,
  RiskLevel,
} from '../types';
import { getRequirements } from '../lib/engine';
import {
  GUARANTEE_LABELS,
  PRODUCT_LABELS,
  PROCESS_LABELS,
  RISK_LABELS,
  STATUS_META,
} from '../lib/constants';
import {
  addDays,
  currency,
  daysUntil,
  formatDateNumeric,
  hashString,
  seeded,
  todayISO,
} from '../lib/utils';

interface SeedPlan {
  missing?: string[];
  expired?: string[];
  observed?: string[];
  porVencer?: string[];
  allExpired?: boolean;
}

interface ClientSpec {
  client: Omit<Client, 'docs'>;
  plan: SeedPlan;
}

const PREVIOUS_VERSION_CODES = new Set([
  'DUI',
  'NIT',
  'COMPROBANTE_DOMICILIO',
  'BALANCE_GENERAL',
  'ESTADOS_CUENTA',
  'CONSTANCIA_INGRESOS',
  'AVALUO',
  'KYC',
]);

function metadataFor(
  template: DocTemplate,
  client: Client | Omit<Client, 'docs'>,
  issue: string,
  expiry: string | undefined,
  seed: number,
): Record<string, string> {
  const number = 1200 + (seed % 7800);
  const common: Record<string, string> = {
    'Nombre / Razón social': client.name,
    'Número de documento': client.docNumber,
    NIT: client.nit,
    'Fecha de emisión': formatDateNumeric(issue),
    'Fecha de vencimiento': expiry ? formatDateNumeric(expiry) : 'No aplica',
    'Emitido por': 'Banco Integral · OnBase',
  };

  switch (template.category) {
    case 'Identidad':
      return {
        ...common,
        'Tipo de documento': template.code === 'DUI' ? 'DUI' : 'NIT',
        Nacionalidad: 'Salvadoreña',
        'Fecha de nacimiento': '14/03/1985',
        'Lugar de emisión': 'San Salvador',
      };
    case 'Legal':
      return {
        ...common,
        Instrumento: template.code.includes('ACTA') ? 'Acta notarial' : 'Instrumento público',
        Notario: 'Lic. Roberto Antonio Menjívar',
        Registro: `Matrícula ${number}-${(seed % 90) + 10}`,
        'Representante legal': client.personType === 'juridica' ? client.name : 'No aplica',
      };
    case 'Financiero':
      return {
        ...common,
        'Institución emisora': seed % 2 === 0 ? 'Banco Integral' : 'Banco Agrícola, S.A.',
        Período: `${2024 + (seed % 2)}`,
        Monto: currency(9800 + (seed % 32) * 740 + 0.25),
        Moneda: 'USD',
        'Firmado por contador': 'Sí · CPA registrado',
      };
    case 'Comercial':
      return {
        ...common,
        'Persona de contacto': client.personType === 'juridica' ? 'Gerencia General' : client.name,
        Teléfono: client.phone,
        Dirección: client.address,
        'Actividad económica': client.activity,
      };
    case 'Garantías':
      return {
        ...common,
        'Tipo de garantía': template.code.includes('PRENDA')
          ? 'Prendaria'
          : template.code.includes('FIANZA')
            ? 'Solidaria'
            : 'Hipotecaria',
        'Valor asegurado': currency(78000 + (seed % 24) * 5200),
        'Ubicación del bien': `${client.department}, El Salvador`,
        Perito: 'Ing. Claudia Regalado · Perito registrado',
      };
    case 'PLAFT':
      return {
        ...common,
        'Perfil transaccional': RISK_LABELS[client.risk],
        'Origen de fondos': 'Actividad económica declarada y verificada',
        'Listas consultadas': 'OFAC · ONU · Listas internas BI',
        Resultado: 'Sin coincidencias',
      };
    default:
      return common;
  }
}

function previousMetadata(
  template: DocTemplate,
  client: Client | Omit<Client, 'docs'>,
  issue: string,
  expiry: string | undefined,
  seed: number,
): Record<string, string> {
  const previousIssue = addDays(issue, -365);
  const previousExpiry = expiry ? addDays(expiry, -365) : undefined;
  const previous = metadataFor(template, client, previousIssue, previousExpiry, seed - 1);
  previous['Versión del documento'] = 'v1';
  if (template.code === 'COMPROBANTE_DOMICILIO') {
    previous['Dirección'] = 'Colonia Escalón, Pasaje 3 #18, San Salvador (dirección anterior)';
  }
  if (template.category === 'Financiero') {
    previous['Monto'] = currency(8600 + (seed % 30) * 740);
  }
  return previous;
}

function buildDocument(
  template: DocTemplate,
  spec: ClientSpec,
  index: number,
  today: string,
): ClientDocument {
  const { client, plan } = spec;
  const random = seeded(hashString(`${client.id}-${template.code}`));
  const internalDays = template.internalDays;
  let status: ClientDocument['status'] = 'vigente';
  let expiry: string;

  if (plan.allExpired || plan.expired?.includes(template.code)) {
    expiry = addDays(today, -(8 + Math.floor(random() * 84)));
    status = 'vigente';
  } else if (plan.observed?.includes(template.code)) {
    expiry = addDays(today, 25 + Math.floor(random() * 40));
    status = 'observado';
  } else if (plan.porVencer?.includes(template.code)) {
    expiry = addDays(today, 4 + Math.floor(random() * 10));
  } else {
    const offset = Math.max(2, Math.floor(internalDays * (0.42 + random() * 0.5)));
    expiry = addDays(today, offset);
  }

  const issue = addDays(expiry, -internalDays);
  const legalExpiry = template.legalDays ? addDays(issue, template.legalDays) : undefined;
  const metadata = metadataFor(template, client, issue, expiry, hashString(template.code) + index);
  metadata['Versión del documento'] = PREVIOUS_VERSION_CODES.has(template.code) ? 'v2' : 'v1';

  const currentVersion: DocVersion = {
    version: PREVIOUS_VERSION_CODES.has(template.code) ? 'v2' : 'v1',
    uploadedAt: issue,
    uploadedBy: 'OnBase · Migración',
    status,
    source: 'OnBase',
    notes:
      status === 'observado'
        ? 'Documento observado por diferencia en el sello de la institución emisora.'
        : undefined,
    confidence: 0.91 + random() * 0.08,
  };

  const versions: DocVersion[] = [currentVersion];

  if (PREVIOUS_VERSION_CODES.has(template.code)) {
    versions.push({
      version: 'v1',
      uploadedAt: addDays(issue, -365),
      uploadedBy: 'OnBase · Migración',
      status: 'vencido',
      source: 'OnBase',
      notes: 'Versión anterior conservada para trazabilidad y comparación.',
      confidence: 0.89,
      metadata: previousMetadata(template, client, issue, expiry, hashString(template.code) + index),
    });
  }

  const source: ClientDocument['source'] =
    index % 11 === 0 ? 'Carga manual' : index % 7 === 0 ? 'Carga IA' : 'OnBase';

  return {
    id: `${client.id}-${template.code}`,
    code: template.code,
    name: template.name,
    category: template.category,
    status,
    issueDate: issue,
    expiryDate: expiry,
    legalExpiryDate: legalExpiry,
    source,
    confidence: source === 'OnBase' ? undefined : 0.86 + random() * 0.12,
    currentVersion: currentVersion.version,
    versions,
    metadata,
    notes:
      status === 'observado'
        ? 'Sello de la institución emisora con legibilidad parcial. Requiere validación manual.'
        : undefined,
    reviewedBy: source === 'OnBase' ? 'Migración OnBase' : 'Motor IA · Document AI',
  };
}

const CLIENT_SPECS: ClientSpec[] = [
  {
    client: {
      id: 'cli-la-bendicion',
      name: 'Comercial La Bendición, S.A. de C.V.',
      personType: 'juridica',
      segment: 'MYPE · Comercio',
      docType: 'NIT',
      docNumber: '0614-180612-101-3',
      nit: '0614-180612-101-3',
      nrc: '284519-3',
      activity: 'Comercio al por menor de ferretería y materiales de construcción',
      address: 'Calle Principal #24, Barrio El Centro, Soyapango',
      department: 'San Salvador',
      phone: '+503 2210-4587',
      email: 'credito@labendicion.com.sv',
      onboardingDate: '2018-04-12',
      risk: 'medio' as RiskLevel,
      product: 'credito-mype' as Product,
      process: 'renovacion' as Process,
      guarantee: 'prendaria' as Guarantee,
      executive: 'Karla Menjívar',
      color: 'from-brand-900 to-brand-700',
    },
    plan: {
      missing: ['ESTADOS_CUENTA'],
      observed: ['DECLARACION_IVA'],
      porVencer: ['NIT', 'COMPROBANTE_DOMICILIO'],
    },
  },
  {
    client: {
      id: 'cli-maria-cruz',
      name: 'María Elena Cruz',
      personType: 'natural',
      segment: 'Microfinanzas Verdes · Persona Natural',
      docType: 'DUI',
      docNumber: '04567890-1',
      nit: '0614-1988-0456-7',
      activity: 'Elaboración artesanal de alimentos y panadería',
      address: 'Colonia La Sabana, Pasaje 4 #12, Antiguo Cuscatlán',
      department: 'La Libertad',
      phone: '+503 7784-2210',
      email: 'maria.cruz@correo.com',
      onboardingDate: '2021-09-03',
      risk: 'bajo' as RiskLevel,
      product: 'microfinanzas-verdes' as Product,
      process: 'vinculacion' as Process,
      guarantee: 'fiduciaria' as Guarantee,
      executive: 'Luis Escalante',
      color: 'from-emerald-800 to-emerald-600',
    },
    plan: {
      expired: ['CONSTANCIA_INGRESOS'],
      porVencer: ['ESTADOS_CUENTA'],
    },
  },
  {
    client: {
      id: 'cli-agroindustrias',
      name: 'Agroindustrias Cuscatlán, S.A. de C.V.',
      personType: 'juridica',
      segment: 'MYPE · Agroindustria',
      docType: 'NIT',
      docNumber: '0614-090420-458-7',
      nit: '0614-090420-458-7',
      nrc: '112045-8',
      activity: 'Beneficio y comercialización de café de altura',
      address: 'Km 68 Carretera a Santa Ana, El Congo',
      department: 'Santa Ana',
      phone: '+503 2441-9080',
      email: 'finanzas@agrocuscatlan.com.sv',
      onboardingDate: '2009-11-20',
      risk: 'alto' as RiskLevel,
      product: 'credito-mype' as Product,
      process: 'otorgamiento' as Process,
      guarantee: 'hipotecaria' as Guarantee,
      executive: 'Rodrigo Vásquez',
      color: 'from-stone-800 to-stone-600',
    },
    plan: {
      allExpired: true,
    },
  },
  {
    client: {
      id: 'cli-jose-martinez',
      name: 'José Antonio Martínez',
      personType: 'natural',
      segment: 'Vivienda · Persona Natural',
      docType: 'DUI',
      docNumber: '01234567-8',
      nit: '0614-1982-0123-4',
      activity: 'Técnico independiente en refrigeración y climatización',
      address: 'Barrio San Francisco, Calle 5 #7, San Miguel',
      department: 'San Miguel',
      phone: '+503 7612-8890',
      email: 'jose.martinez@correo.com',
      onboardingDate: '2023-02-15',
      risk: 'medio' as RiskLevel,
      product: 'vivienda' as Product,
      process: 'otorgamiento' as Process,
      guarantee: 'hipotecaria' as Guarantee,
      executive: 'Ana Sofía Renderos',
      color: 'from-sky-900 to-sky-700',
    },
    plan: {
      missing: ['REFERENCIA_LABORAL'],
      porVencer: ['DUI', 'AVALUO'],
    },
  },
  {
    client: {
      id: 'cli-lago-ilopango',
      name: 'Inversiones Lago de Ilopango, S.A. de C.V.',
      personType: 'juridica',
      segment: 'Microfinanzas Verdes · Turismo',
      docType: 'NIT',
      docNumber: '0614-160714-789-2',
      nit: '0614-160714-789-2',
      nrc: '335210-4',
      activity: 'Operación de hotel boutique y generación solar fotovoltaica',
      address: 'Calle al Puerto #18, Ilopango',
      department: 'San Salvador',
      phone: '+503 2398-7711',
      email: 'admin@lagoilopango.com',
      onboardingDate: '2016-07-08',
      risk: 'bajo' as RiskLevel,
      product: 'microfinanzas-verdes' as Product,
      process: 'renovacion' as Process,
      guarantee: 'solidaria' as Guarantee,
      executive: 'Karla Menjívar',
      color: 'from-teal-900 to-teal-700',
    },
    plan: {
      porVencer: ['LICENCIA_FUNCIONAMIENTO', 'CERTIFICACION_VERDE'],
    },
  },
  {
    client: {
      id: 'cli-costa-del-sol',
      name: 'Transportes Costa del Sol, S.A. de C.V.',
      personType: 'juridica',
      segment: 'MYPE · Transporte de carga',
      docType: 'NIT',
      docNumber: '0614-141001-561-9',
      nit: '0614-141001-561-9',
      nrc: '298741-1',
      activity: 'Transporte terrestre de carga pesada y logística',
      address: 'Kilómetro 32 Carretera Litoral, Zaragoza',
      department: 'La Libertad',
      phone: '+503 2305-6644',
      email: 'gerencia@transportescostadelsol.com',
      onboardingDate: '2014-10-01',
      risk: 'alto' as RiskLevel,
      product: 'credito-mype' as Product,
      process: 'renovacion' as Process,
      guarantee: 'prendaria' as Guarantee,
      executive: 'Rodrigo Vásquez',
      color: 'from-indigo-900 to-indigo-700',
    },
    plan: {
      missing: ['REFERENCIAS_COMERCIALES'],
      expired: ['ESTADOS_CUENTA', 'LISTAS_RESTRICTIVAS'],
      observed: ['NIT'],
    },
  },
];

function buildClient(spec: ClientSpec, today: string): Client {
  const requirements = getRequirements({
    personType: spec.client.personType,
    product: spec.client.product,
    risk: spec.client.risk,
    process: spec.client.process,
    guarantee: spec.client.guarantee,
  });

  const docs = requirements
    .filter((template) => !spec.plan.missing?.includes(template.code))
    .map((template, index) => buildDocument(template, spec, index, today))
    .filter((doc) => {
      const status = daysUntil(doc.expiryDate);
      return status !== null;
    });

  return { ...spec.client, docs };
}

function nowAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function buildQueue(clients: Client[]): QueueItem[] {
  const findClient = (id: string): Client => clients.find((client) => client.id === id) ?? clients[0];
  const today = todayISO();

  const makeMetadata = (clientId: string, code: string): Record<string, string> => {
    const client = findClient(clientId);
    const template = CATALOG_BY_CODE[code];
    return metadataFor(template, client, addDays(today, -28), addDays(today, 120), 321);
  };

  return [
    {
      id: 'q_1001',
      clientId: 'cli-maria-cruz',
      clientName: findClient('cli-maria-cruz').name,
      docCode: 'CONSTANCIA_INGRESOS',
      docName: 'Constancia de ingresos',
      fileName: 'Constancia_Ingresos_MariaCruz.pdf',
      fileType: 'PDF',
      fileSize: 842_000,
      confidence: 0.68,
      reason: 'Confianza 68%: fecha de vencimiento borrosa',
      issues: [
        'Fecha de vencimiento reconocida con 62% de confianza',
        'Sello de la empresa con legibilidad parcial',
      ],
      metadata: makeMetadata('cli-maria-cruz', 'CONSTANCIA_INGRESOS'),
      submittedAt: nowAgo(22),
      submittedBy: 'Motor IA · Document AI',
      priority: 'media',
      source: 'Carga IA',
    },
    {
      id: 'q_1002',
      clientId: 'cli-la-bendicion',
      clientName: findClient('cli-la-bendicion').name,
      docCode: 'CONSTANCIA_NIT',
      docName: 'Constancia de NIT',
      fileName: 'Constancia_NIT_LaBendicion_2026.pdf',
      fileType: 'PDF',
      fileSize: 512_000,
      confidence: 0.74,
      reason: 'Confianza 74%: sello de Hacienda ilegible',
      issues: [
        'Sello del Ministerio de Hacienda ilegible',
        'Código de verificación no detectado',
      ],
      metadata: makeMetadata('cli-la-bendicion', 'CONSTANCIA_NIT'),
      submittedAt: nowAgo(48),
      submittedBy: 'Motor IA · Document AI',
      priority: 'media',
      source: 'Carga IA',
    },
    {
      id: 'q_1003',
      clientId: 'cli-agroindustrias',
      clientName: findClient('cli-agroindustrias').name,
      docCode: 'ACTA_REPRESENTANTE',
      docName: 'Acta de nombramiento de representante legal',
      fileName: 'Acta_Representante_Legal_Agro.pdf',
      fileType: 'PDF',
      fileSize: 1_240_000,
      confidence: 0.61,
      reason: 'Confianza 61%: firma del representante ausente',
      issues: [
        'No se detectó firma del representante legal',
        'Página 3 del instrumento incompleta',
      ],
      metadata: makeMetadata('cli-agroindustrias', 'ACTA_REPRESENTANTE'),
      submittedAt: nowAgo(96),
      submittedBy: 'Motor IA · Document AI',
      priority: 'alta',
      source: 'Escaneo histórico',
    },
    {
      id: 'q_1004',
      clientId: 'cli-costa-del-sol',
      clientName: findClient('cli-costa-del-sol').name,
      docCode: 'ESTADOS_CUENTA',
      docName: 'Estados de cuenta bancarios',
      fileName: 'EstadoCuenta_Bantotal_Q3.pdf',
      fileType: 'PDF',
      fileSize: 2_180_000,
      confidence: 0.83,
      reason: 'Discrepancia con Bantotal: saldo difiere en $1,240.00',
      issues: [
        'Saldo declarado no coincide con el core Bantotal',
        'Período del estado de cuenta fuera de los últimos 6 meses',
      ],
      metadata: makeMetadata('cli-costa-del-sol', 'ESTADOS_CUENTA'),
      submittedAt: nowAgo(130),
      submittedBy: 'Motor IA · Document AI',
      priority: 'alta',
      source: 'Carga IA',
    },
    {
      id: 'q_1005',
      clientId: 'cli-jose-martinez',
      clientName: findClient('cli-jose-martinez').name,
      docCode: 'DUI',
      docName: 'Documento Único de Identidad (DUI)',
      fileName: 'DUI_Jose_Martinez_escaneo.jpg',
      fileType: 'JPG',
      fileSize: 3_420_000,
      confidence: 0.79,
      reason: 'Confianza 79%: fotografía con reflejo',
      issues: [
        'Reflejo sobre el número de DUI',
        'Borde inferior recortado',
      ],
      metadata: makeMetadata('cli-jose-martinez', 'DUI'),
      submittedAt: nowAgo(210),
      submittedBy: 'Motor IA · Document AI',
      priority: 'baja',
      source: 'Carga IA',
    },
    {
      id: 'q_1006',
      clientId: 'cli-lago-ilopango',
      clientName: findClient('cli-lago-ilopango').name,
      docCode: 'CERTIFICACION_VERDE',
      docName: 'Certificación de proyecto verde',
      fileName: 'Certificacion_Solar_Ilopango.pdf',
      fileType: 'PDF',
      fileSize: 1_760_000,
      confidence: 0.88,
      reason: 'Confianza 88%: firma del técnico no detectable',
      issues: ['Firma del técnico certificador no detectable por OCR'],
      metadata: makeMetadata('cli-lago-ilopango', 'CERTIFICACION_VERDE'),
      submittedAt: nowAgo(280),
      submittedBy: 'Motor IA · Document AI',
      priority: 'baja',
      source: 'Escaneo histórico',
    },
  ];
}

const SEED_METRICS: Metrics = {
  autoApproved: 420,
  escalated: 80,
  manualApproved: 52,
  manualRejected: 19,
  avgSeconds: 1.8,
  processedToday: 37,
  topErrors: [
    { label: 'Fecha de vencimiento ilegible', count: 27 },
    { label: 'Firma o sello no detectado', count: 21 },
    { label: 'Discrepancia con Bantotal', count: 14 },
    { label: 'Documento desenfocado o con reflejo', count: 11 },
    { label: 'Tipo de documento no reconocido', count: 7 },
  ],
  weekly: [
    { label: 'Lun', auto: 60, manual: 12 },
    { label: 'Mar', auto: 70, manual: 9 },
    { label: 'Mié', auto: 78, manual: 14 },
    { label: 'Jue', auto: 66, manual: 11 },
    { label: 'Vie', auto: 85, manual: 16 },
    { label: 'Sáb', auto: 41, manual: 5 },
    { label: 'Dom', auto: 20, manual: 2 },
  ],
};

export function createSeedState(): AppState {
  const today = todayISO();
  const clients = CLIENT_SPECS.map((spec) => buildClient(spec, today));
  const queue = buildQueue(clients);

  const activity: ActivityItem[] = [
    {
      id: 'act_1',
      kind: 'upload',
      title: 'Documento indexado automáticamente',
      detail: 'Balance general · Comercial La Bendición · Confianza 96%',
      at: nowAgo(12),
      clientId: 'cli-la-bendicion',
      actor: 'Document AI',
    },
    {
      id: 'act_2',
      kind: 'approve',
      title: 'Aprobación manual en cola humana',
      detail: 'Comprobante de domicilio · José Antonio Martínez',
      at: nowAgo(41),
      clientId: 'cli-jose-martinez',
      actor: 'Analista de Calidad',
    },
    {
      id: 'act_3',
      kind: 'rules',
      title: 'Regla de vigencia actualizada',
      detail: 'Estados de cuenta: vigencia interna de 30 a 45 días',
      at: nowAgo(118),
      actor: 'Analista de Calidad',
    },
    {
      id: 'act_4',
      kind: 'declaration',
      title: 'Declaración de Vigencia emitida',
      detail: 'Expediente renovado sin solicitar documentos nuevos',
      at: nowAgo(190),
      clientId: 'cli-lago-ilopango',
      actor: 'Karla Menjívar',
    },
    {
      id: 'act_5',
      kind: 'queue',
      title: 'Documento escalado a revisión humana',
      detail: 'Constancia de ingresos · María Elena Cruz · Confianza 68%',
      at: nowAgo(260),
      clientId: 'cli-maria-cruz',
      actor: 'Document AI',
    },
  ];

  return {
    version: 1,
    clients,
    activeClientId: clients[0].id,
    role: 'ejecutivo',
    queue,
    metrics: SEED_METRICS,
    overrides: {},
    customRules: [],
    activity,
  };
}

export const DEMO_CLIENT_IDS = CLIENT_SPECS.map((spec) => spec.client.id);

export function seedMetaForClient(client: Client): {
  product: string;
  process: string;
  guarantee: string;
  risk: string;
} {
  return {
    product: PRODUCT_LABELS[client.product],
    process: PROCESS_LABELS[client.process],
    guarantee: GUARANTEE_LABELS[client.guarantee],
    risk: RISK_LABELS[client.risk],
  };
}

export function statusLabel(status: keyof typeof STATUS_META): string {
  return STATUS_META[status].label;
}
