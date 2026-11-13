import {
  BadgeCheck,
  BrainCircuit,
  ListChecks,
  ScanLine,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import type { GlobalSummary, LifecycleStep, QueueItem } from '../types';

export interface LifecycleStepMeta {
  id: LifecycleStep;
  title: string;
  short: string;
  caption: string;
  description: string;
  owner: string;
  icon: LucideIcon;
}

export const LIFECYCLE_STEPS: LifecycleStepMeta[] = [
  {
    id: 1,
    title: 'Checklist y requisitos',
    short: 'Checklist',
    caption: 'Reglas del expediente',
    description:
      'El motor calcula los requisitos aplicables al perfil del cliente y reutiliza lo que ya existe en OnBase.',
    owner: 'Ejecutivo Comercial',
    icon: ListChecks,
  },
  {
    id: 2,
    title: 'Captura y carga',
    short: 'Captura',
    caption: 'Documentos y escaneo',
    description:
      'El ejecutivo carga documentos individuales o por lote, o solicita al cliente lo que falta.',
    owner: 'Ejecutivo Comercial',
    icon: ScanLine,
  },
  {
    id: 3,
    title: 'Validación IA y OCR',
    short: 'Validación IA',
    caption: 'Clasificación y cruce',
    description:
      'Document AI clasifica, extrae metadatos y cruza la información con Bantotal antes de indexar en OnBase.',
    owner: 'Motor IA · Document AI',
    icon: BrainCircuit,
  },
  {
    id: 4,
    title: 'Revisión humana',
    short: 'Revisión',
    caption: 'Cola de excepciones',
    description:
      'El analista de calidad revisa las excepciones escaladas, corrige metadatos y deja observaciones.',
    owner: 'Analista de Calidad',
    icon: UserCheck,
  },
  {
    id: 5,
    title: 'Expediente vigente',
    short: 'Vigente',
    caption: 'Listo para Bantotal',
    description:
      'El expediente está completo y vigente. El semáforo global y el historial quedan disponibles para auditoría.',
    owner: 'Ejecutivo Comercial',
    icon: BadgeCheck,
  },
];

export function lifecycleStepMeta(step: LifecycleStep): LifecycleStepMeta {
  return LIFECYCLE_STEPS.find((item) => item.id === step) ?? LIFECYCLE_STEPS[0];
}

/**
 * Deriva la etapa actual del expediente a partir de su estado real.
 * No se persiste una etapa aparte: documentos, cola y reglas siguen siendo
 * la única fuente de verdad, por lo que el stepper siempre queda sincronizado.
 */
export function deriveLifecycleStep(
  summary: GlobalSummary,
  queueForClient: QueueItem[],
): LifecycleStep {
  if (summary.total === 0) return 1;
  if (summary.missing > 0) return 2;
  if (summary.status === 'vigente') return 5;
  if (queueForClient.length > 0) return 4;
  return 3;
}

export type StepState = 'complete' | 'current' | 'future';

export function stepState(step: LifecycleStep, current: LifecycleStep): StepState {
  if (step < current) return 'complete';
  if (step === current) return 'current';
  return 'future';
}
