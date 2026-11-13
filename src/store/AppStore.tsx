import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CATALOG_BY_CODE } from '../data/catalog';
import { createSeedState } from '../data/seed';
import type {
  AppState,
  Client,
  ClientDocument,
  CustomRule,
  QueueItem,
  Role,
  ValidityOverride,
} from '../types';
import { ROLE_PERMISSIONS, ROLE_META, type Permissions } from '../lib/constants';
import { effectiveDaysForDocument } from '../lib/engine';
import { addDays, formatDateNumeric, todayISO, uid } from '../lib/utils';

const STORAGE_KEY = 'banco-integral-orquestador-v1';
const STATE_VERSION = 1;

function loadInitialState(): AppState {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (
          parsed &&
          parsed.version === STATE_VERSION &&
          Array.isArray(parsed.clients) &&
          parsed.clients.length > 0 &&
          Array.isArray(parsed.queue) &&
          Array.isArray(parsed.activity)
        ) {
          if (!parsed.clients.some((client) => client.id === parsed.activeClientId)) {
            parsed.activeClientId = parsed.clients[0].id;
          }
          return parsed;
        }
      }
    } catch {
      // Estado corrupto o versión anterior: se restaura la demo.
    }
  }
  return createSeedState();
}

function upsertDocument(client: Client, incoming: ClientDocument): Client {
  const existing = client.docs.find((doc) => doc.code === incoming.code);
  const baseVersion = incoming.versions[0];
  const versionNumber = existing ? existing.versions.length + 1 : 1;
  const versionLabel = `v${versionNumber}`;

  const nextDocument: ClientDocument = {
    ...incoming,
    id: existing?.id ?? incoming.id,
    currentVersion: versionLabel,
    versions: [
      {
        ...baseVersion,
        version: versionLabel,
        uploadedAt: baseVersion?.uploadedAt ?? todayISO(),
        metadata: incoming.metadata,
      },
      ...(existing?.versions ?? []),
    ].slice(0, 8),
  };

  return {
    ...client,
    docs: [nextDocument, ...client.docs.filter((doc) => doc.code !== incoming.code)],
  };
}

export interface ApprovePayload {
  reviewer: string;
  metadata: Record<string, string>;
  observations?: string;
}

export interface RejectPayload {
  reviewer: string;
  reason: string;
}

interface AppStoreValue {
  state: AppState;
  activeClient: Client;
  permissions: Permissions;
  setActiveClient: (clientId: string) => void;
  setRole: (role: Role) => void;
  addDocument: (
    clientId: string,
    doc: ClientDocument,
    options?: { autoIndexed?: boolean; actor?: string },
  ) => void;
  updateDocument: (clientId: string, docId: string, patch: Partial<ClientDocument>) => void;
  saveValidityOverride: (
    code: string,
    patch: ValidityOverride,
    actor: string,
  ) => { affected: number };
  addCustomRule: (rule: Omit<CustomRule, 'id' | 'createdAt'>, actor: string) => void;
  deleteCustomRule: (id: string, actor: string) => void;
  addQueueItem: (item: QueueItem) => void;
  approveQueueItem: (id: string, payload: ApprovePayload) => void;
  rejectQueueItem: (id: string, payload: RejectPayload) => void;
  emitDeclaration: (clientId: string, actor: string) => number;
  resetDemo: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function pushActivity(
  state: AppState,
  activity: Omit<AppState['activity'][number], 'id' | 'at'> & { at?: string },
): AppState['activity'] {
  return [
    {
      id: uid('act'),
      at: activity.at ?? new Date().toISOString(),
      ...activity,
    },
    ...state.activity,
  ].slice(0, 40);
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Si el navegador niega el almacenamiento, la demo sigue operando en memoria.
    }
  }, [state]);

  const activeClient = useMemo(
    () => state.clients.find((client) => client.id === state.activeClientId) ?? state.clients[0],
    [state.clients, state.activeClientId],
  );

  const permissions = ROLE_PERMISSIONS[state.role];

  const setActiveClient = useCallback((clientId: string) => {
    setState((prev) => ({ ...prev, activeClientId: clientId }));
  }, []);

  const setRole = useCallback((role: Role) => {
    setState((prev) => ({ ...prev, role }));
  }, []);

  const addDocument = useCallback<AppStoreValue['addDocument']>((clientId, doc, options) => {
    setState((prev) => {
      const client = prev.clients.find((item) => item.id === clientId);
      if (!client) return prev;
      const updated = upsertDocument(client, { ...doc, source: doc.source });
      const title = options?.autoIndexed
        ? 'Documento indexado automáticamente'
        : 'Documento actualizado en el expediente';
      return {
        ...prev,
        clients: prev.clients.map((item) => (item.id === clientId ? updated : item)),
        metrics: {
          ...prev.metrics,
          autoApproved: options?.autoIndexed ? prev.metrics.autoApproved + 1 : prev.metrics.autoApproved,
          processedToday: prev.metrics.processedToday + 1,
        },
        activity: pushActivity(prev, {
          kind: options?.autoIndexed ? 'upload' : 'upload',
          title,
          detail: `${doc.name} · ${updated.name}${doc.confidence ? ` · Confianza ${Math.round(doc.confidence * 100)}%` : ''}`,
          clientId,
          actor: options?.actor ?? 'Document AI',
        }),
      };
    });
  }, []);

  const updateDocument = useCallback<AppStoreValue['updateDocument']>((clientId, docId, patch) => {
    setState((prev) => ({
      ...prev,
      clients: prev.clients.map((client) =>
        client.id === clientId
          ? {
              ...client,
              docs: client.docs.map((doc) => (doc.id === docId ? { ...doc, ...patch } : doc)),
            }
          : client,
      ),
    }));
  }, []);

  const saveValidityOverride = useCallback<AppStoreValue['saveValidityOverride']>(
    (code, patch, actor) => {
      const affected = state.clients.reduce(
        (total, client) => total + client.docs.filter((doc) => doc.code === code).length,
        0,
      );
      setState((prev) => {
        const overrides = {
          ...prev.overrides,
          [code]: { ...prev.overrides[code], ...patch },
        };
        const clients = prev.clients.map((client) => ({
          ...client,
          docs: client.docs.map((doc) => {
            if (doc.code !== code) return doc;
            const next = { ...doc };
            if (patch.internalDays && patch.internalDays > 0) {
              next.expiryDate = addDays(doc.issueDate, patch.internalDays);
              next.metadata = {
                ...doc.metadata,
                'Fecha de vencimiento': formatDateNumeric(next.expiryDate),
              };
            }
            if (patch.legalDays && patch.legalDays > 0) {
              next.legalExpiryDate = addDays(doc.issueDate, patch.legalDays);
            }
            return next;
          }),
        }));
        const templateName = CATALOG_BY_CODE[code]?.name ?? 'Documento';
        const bits: string[] = [];
        if (patch.internalDays) bits.push(`vigencia interna a ${patch.internalDays} días`);
        if (patch.legalDays) bits.push(`vigencia legal a ${patch.legalDays} días`);
        if (patch.enabled === false) bits.push('regla desactivada');
        if (patch.enabled === true) bits.push('regla reactivada');
        return {
          ...prev,
          overrides,
          clients,
          activity: pushActivity(prev, {
            kind: 'rules',
            title: 'Regla de vigencia actualizada',
            detail: `${templateName}: ${bits.join(' · ') || 'sin cambios'} (${affected} documentos recalculados)`,
            actor,
          }),
        };
      });
      return { affected };
    },
    [state.clients],
  );

  const addCustomRule = useCallback<AppStoreValue['addCustomRule']>((rule, actor) => {
    const newRule: CustomRule = {
      ...rule,
      id: uid('rule').replace('rule_', ''),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      customRules: [newRule, ...prev.customRules],
      activity: pushActivity(prev, {
        kind: 'rules',
        title: 'Nueva regla no-code creada',
        detail: `${newRule.name} · vigencia ${newRule.internalDays} días`,
        actor,
      }),
    }));
  }, []);

  const deleteCustomRule = useCallback<AppStoreValue['deleteCustomRule']>((id, actor) => {
    setState((prev) => {
      const rule = prev.customRules.find((item) => item.id === id);
      return {
        ...prev,
        customRules: prev.customRules.filter((item) => item.id !== id),
        activity: pushActivity(prev, {
          kind: 'rules',
          title: 'Regla no-code eliminada',
          detail: rule?.name ?? 'Regla personalizada',
          actor,
        }),
      };
    });
  }, []);

  const addQueueItem = useCallback<AppStoreValue['addQueueItem']>((item) => {
    setState((prev) => ({
      ...prev,
      queue: [item, ...prev.queue],
      metrics: {
        ...prev.metrics,
        escalated: prev.metrics.escalated + 1,
        processedToday: prev.metrics.processedToday + 1,
      },
      activity: pushActivity(prev, {
        kind: 'queue',
        title: 'Documento escalado a revisión humana',
        detail: `${item.docName} · ${item.clientName} · ${item.reason}`,
        clientId: item.clientId,
        actor: 'Document AI',
      }),
    }));
  }, []);

  const approveQueueItem = useCallback<AppStoreValue['approveQueueItem']>((id, payload) => {
    setState((prev) => {
      const item = prev.queue.find((entry) => entry.id === id);
      if (!item) return prev;
      const client = prev.clients.find((entry) => entry.id === item.clientId);
      if (!client) return prev;

      const days = effectiveDaysForDocument(item.docCode, prev.overrides);
      const issueDate = todayISO();
      const expiryDate = addDays(issueDate, days.internalDays);
      const metadata = {
        ...item.metadata,
        ...payload.metadata,
        'Fecha de emisión': formatDateNumeric(issueDate),
        'Fecha de vencimiento': formatDateNumeric(expiryDate),
      };
      const document: ClientDocument = {
        id: uid('doc'),
        code: item.docCode,
        name: item.docName,
        category: CATALOG_BY_CODE[item.docCode]?.category ?? 'Comercial',
        status: 'vigente',
        issueDate,
        expiryDate,
        legalExpiryDate: days.legalDays ? addDays(issueDate, days.legalDays) : undefined,
        source: 'Carga IA',
        confidence: item.confidence,
        currentVersion: 'v1',
        versions: [
          {
            version: 'v1',
            uploadedAt: issueDate,
            uploadedBy: payload.reviewer,
            status: 'vigente',
            source: 'Carga IA',
            confidence: item.confidence,
            notes: payload.observations?.trim()
              ? `Aprobado manualmente en cola de revisión humana. Observación: ${payload.observations.trim()}`
              : 'Aprobado manualmente en cola de revisión humana.',
            metadata,
          },
        ],
        metadata,
        reviewedBy: payload.reviewer,
        notes: payload.observations?.trim()
          ? `Validado manualmente por el analista. Observación: ${payload.observations.trim()}`
          : 'Validado manualmente por el analista. Retroalimentación enviada al modelo.',
      };

      const updatedClient = upsertDocument(client, document);

      return {
        ...prev,
        clients: prev.clients.map((entry) => (entry.id === item.clientId ? updatedClient : entry)),
        queue: prev.queue.filter((entry) => entry.id !== id),
        metrics: {
          ...prev.metrics,
          manualApproved: prev.metrics.manualApproved + 1,
          processedToday: prev.metrics.processedToday + 1,
        },
        activity: pushActivity(prev, {
          kind: 'approve',
          title: 'Documento aprobado manualmente',
          detail: payload.observations?.trim()
            ? `${item.docName} · ${item.clientName} · Observación: ${payload.observations.trim()}`
            : `${item.docName} · ${item.clientName} · ${item.reason}`,
          clientId: item.clientId,
          actor: payload.reviewer,
        }),
      };
    });
  }, []);

  const rejectQueueItem = useCallback<AppStoreValue['rejectQueueItem']>((id, payload) => {
    setState((prev) => {
      const item = prev.queue.find((entry) => entry.id === id);
      if (!item) return prev;
      const client = prev.clients.find((entry) => entry.id === item.clientId);
      if (!client) return prev;

      const days = effectiveDaysForDocument(item.docCode, prev.overrides);
      const issueDate = todayISO();
      const document: ClientDocument = {
        id: uid('doc'),
        code: item.docCode,
        name: item.docName,
        category: CATALOG_BY_CODE[item.docCode]?.category ?? 'Comercial',
        status: 'rechazado',
        issueDate,
        expiryDate: addDays(issueDate, days.internalDays),
        legalExpiryDate: days.legalDays ? addDays(issueDate, days.legalDays) : undefined,
        source: 'Carga IA',
        confidence: item.confidence,
        currentVersion: 'v1',
        versions: [
          {
            version: 'v1',
            uploadedAt: issueDate,
            uploadedBy: payload.reviewer,
            status: 'rechazado',
            source: 'Carga IA',
            confidence: item.confidence,
            notes: payload.reason,
            metadata: item.metadata,
          },
        ],
        metadata: item.metadata,
        reviewedBy: payload.reviewer,
        notes: payload.reason,
      };

      const updatedClient = upsertDocument(client, document);
      const errorExists = prev.metrics.topErrors.some(
        (error) => error.label === 'Rechazo manual del analista',
      );
      const topErrors = errorExists
        ? prev.metrics.topErrors.map((error) =>
            error.label === 'Rechazo manual del analista'
              ? { ...error, count: error.count + 1 }
              : error,
          )
        : [...prev.metrics.topErrors, { label: 'Rechazo manual del analista', count: 1 }];

      return {
        ...prev,
        clients: prev.clients.map((entry) => (entry.id === item.clientId ? updatedClient : entry)),
        queue: prev.queue.filter((entry) => entry.id !== id),
        metrics: {
          ...prev.metrics,
          manualRejected: prev.metrics.manualRejected + 1,
          processedToday: prev.metrics.processedToday + 1,
          topErrors,
        },
        activity: pushActivity(prev, {
          kind: 'reject',
          title: 'Documento rechazado en revisión',
          detail: `${item.docName} · ${item.clientName} · ${payload.reason}`,
          clientId: item.clientId,
          actor: payload.reviewer,
        }),
      };
    });
  }, []);

  const emitDeclaration = useCallback<AppStoreValue['emitDeclaration']>((clientId, actor) => {
    const affected =
      state.clients.find((entry) => entry.id === clientId)?.docs.length ?? 0;
    setState((prev) => {
      const client = prev.clients.find((entry) => entry.id === clientId);
      if (!client) return prev;
      const issueDate = todayISO();
      const updatedDocs = client.docs.map((doc) => {
        const days = effectiveDaysForDocument(doc.code, prev.overrides);
        const expiryDate = addDays(issueDate, days.internalDays);
        const legalExpiryDate = days.legalDays ? addDays(issueDate, days.legalDays) : undefined;
        const metadata: Record<string, string> = {
          ...doc.metadata,
          'Fecha de emisión': formatDateNumeric(issueDate),
          'Fecha de vencimiento': formatDateNumeric(expiryDate),
          'Versión del documento': `v${doc.versions.length + 1}`,
        };
        return {
          ...doc,
          status: 'vigente' as const,
          issueDate,
          expiryDate,
          legalExpiryDate,
          currentVersion: `v${doc.versions.length + 1}`,
          metadata,
          versions: [
            {
              version: `v${doc.versions.length + 1}`,
              uploadedAt: issueDate,
              uploadedBy: actor,
              status: 'vigente' as const,
              source: 'Declaración de Vigencia' as const,
              notes:
                'Renovación administrativa por Declaración de Vigencia conforme a normativa salvadoreña. No se solicitaron documentos nuevos.',
              metadata,
            },
            ...doc.versions,
          ].slice(0, 10),
          notes: 'Renovado mediante Declaración de Vigencia.',
          reviewedBy: actor,
        };
      });

      return {
        ...prev,
        clients: prev.clients.map((entry) =>
          entry.id === clientId ? { ...entry, docs: updatedDocs } : entry,
        ),
        activity: pushActivity(prev, {
          kind: 'declaration',
          title: 'Declaración de Vigencia emitida',
          detail: `${client.name} · ${affected} documentos renovados sin nueva documentación`,
          clientId,
          actor,
        }),
      };
    });
    return affected;
  }, [state.clients]);

  const resetDemo = useCallback(() => {
    setState(createSeedState());
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      activeClient,
      permissions,
      setActiveClient,
      setRole,
      addDocument,
      updateDocument,
      saveValidityOverride,
      addCustomRule,
      deleteCustomRule,
      addQueueItem,
      approveQueueItem,
      rejectQueueItem,
      emitDeclaration,
      resetDemo,
    }),
    [
      state,
      activeClient,
      permissions,
      setActiveClient,
      setRole,
      addDocument,
      updateDocument,
      saveValidityOverride,
      addCustomRule,
      deleteCustomRule,
      addQueueItem,
      approveQueueItem,
      rejectQueueItem,
      emitDeclaration,
      resetDemo,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore debe usarse dentro de AppStoreProvider');
  return context;
}

export function roleLabel(role: Role): string {
  return ROLE_META[role].label;
}
