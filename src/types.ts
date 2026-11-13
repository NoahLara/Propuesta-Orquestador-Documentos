export type PersonType = 'natural' | 'juridica';
export type Product = 'credito-mype' | 'microfinanzas-verdes' | 'vivienda';
export type RiskLevel = 'bajo' | 'medio' | 'alto';
export type Process = 'vinculacion' | 'renovacion' | 'otorgamiento';
export type Guarantee = 'fiduciaria' | 'prendaria' | 'hipotecaria' | 'solidaria';
export type Role = 'ejecutivo' | 'calidad' | 'cumplimiento';
export type View = 'cartera' | 'cliente' | 'revision' | 'dashboard';
export type LifecycleStep = 1 | 2 | 3 | 4 | 5;

export type DocCategory =
  | 'Identidad'
  | 'Legal'
  | 'Financiero'
  | 'Comercial'
  | 'Garantías'
  | 'PLAFT';

export type DocStatus =
  | 'vigente'
  | 'por-vencer'
  | 'observado'
  | 'vencido'
  | 'rechazado'
  | 'faltante';

export type GlobalStatus = 'vigente' | 'parcial' | 'vencido';

export type DocumentSource =
  | 'OnBase'
  | 'Carga IA'
  | 'Carga manual'
  | 'Escaneo histórico'
  | 'Declaración de Vigencia';

export interface Applicability {
  personTypes: PersonType[];
  products: Product[];
  risks?: RiskLevel[];
  processes?: Process[];
  guarantees?: Guarantee[];
}

export interface DocTemplate {
  code: string;
  name: string;
  description: string;
  category: DocCategory;
  internalDays: number;
  legalDays?: number;
  critical?: boolean;
  applies: Applicability;
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  internalDays: number;
  personTypes: PersonType[];
  products: Product[];
  risks: RiskLevel[];
  processes: Process[];
  guarantees: Guarantee[];
  createdAt: string;
  createdBy: string;
}

export interface DocVersion {
  version: string;
  uploadedAt: string;
  uploadedBy: string;
  status: DocStatus;
  source: DocumentSource;
  notes?: string;
  confidence?: number;
  metadata?: Record<string, string>;
}

export interface ClientDocument {
  id: string;
  code: string;
  name: string;
  category: DocCategory;
  status: DocStatus;
  issueDate: string;
  expiryDate?: string;
  legalExpiryDate?: string;
  source: DocumentSource;
  confidence?: number;
  currentVersion: string;
  versions: DocVersion[];
  metadata: Record<string, string>;
  notes?: string;
  reviewedBy?: string;
}

export interface Client {
  id: string;
  name: string;
  personType: PersonType;
  segment: string;
  docType: string;
  docNumber: string;
  nit: string;
  nrc?: string;
  activity: string;
  address: string;
  department: string;
  phone: string;
  email: string;
  onboardingDate: string;
  risk: RiskLevel;
  product: Product;
  process: Process;
  guarantee: Guarantee;
  executive: string;
  color: string;
  docs: ClientDocument[];
}

export interface ValidityOverride {
  internalDays?: number;
  legalDays?: number;
  enabled?: boolean;
}

export interface EffectiveTemplate extends DocTemplate {
  custom?: boolean;
  ruleId?: string;
  enabled: boolean;
}

export interface ChecklistItem {
  template: EffectiveTemplate;
  existing?: ClientDocument;
  status: DocStatus;
  onbaseReuse: boolean;
  daysToExpire: number | null;
}

export interface RequirementFilters {
  personType: PersonType;
  product: Product;
  risk: RiskLevel;
  process: Process;
  guarantee: Guarantee;
}

export interface GlobalSummary {
  status: GlobalStatus;
  total: number;
  valid: number;
  expiring: number;
  observed: number;
  expired: number;
  missing: number;
  rejected: number;
  canDeclare: boolean;
}

export type ActivityKind =
  | 'upload'
  | 'approve'
  | 'reject'
  | 'rules'
  | 'declaration'
  | 'queue'
  | 'system';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  at: string;
  clientId?: string;
  actor: string;
}

export interface QueueItem {
  id: string;
  clientId: string;
  clientName: string;
  docCode: string;
  docName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  confidence: number;
  reason: string;
  issues: string[];
  metadata: Record<string, string>;
  submittedAt: string;
  submittedBy: string;
  priority: 'alta' | 'media' | 'baja';
  source: 'Carga IA' | 'Escaneo histórico';
  batchId?: string;
}

export interface TopError {
  label: string;
  count: number;
}

export interface WeeklyPoint {
  label: string;
  auto: number;
  manual: number;
}

export interface Metrics {
  autoApproved: number;
  escalated: number;
  manualApproved: number;
  manualRejected: number;
  avgSeconds: number;
  processedToday: number;
  topErrors: TopError[];
  weekly: WeeklyPoint[];
}

export interface AppState {
  version: number;
  clients: Client[];
  activeClientId: string;
  role: Role;
  queue: QueueItem[];
  metrics: Metrics;
  overrides: Record<string, ValidityOverride>;
  customRules: CustomRule[];
  activity: ActivityItem[];
}

export type UploadPhase =
  | 'pending'
  | 'classifying'
  | 'extracting'
  | 'validating'
  | 'indexing'
  | 'done'
  | 'queued'
  | 'error';

export interface CrossCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface UploadJob {
  id: string;
  batchId?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  clientId: string;
  docCode: string;
  docName: string;
  confidence: number;
  fieldConfidence: Record<string, number>;
  extracted: Record<string, string>;
  issues: string[];
  crossChecks: CrossCheck[];
  phase: UploadPhase;
  step: number;
  outcome?: 'indexed' | 'queued';
  reason?: string;
  previewUrl?: string;
  isSimulated: boolean;
}

export interface UploadIntent {
  clientId: string;
  docCode: string;
  docName: string;
}
