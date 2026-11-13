import { useEffect, useMemo, useState } from 'react';
import { Database, ListChecks, ScanLine, SlidersHorizontal } from 'lucide-react';
import type { ChecklistItem, RequirementFilters } from '../../types';
import { useAppStore } from '../../store/AppStore';
import { useNavigation } from '../../nav';
import {
  buildChecklist,
  progressValue,
  summarizeChecklist,
  toFilters,
} from '../../lib/engine';
import { Button } from '../ui/Button';
import { Card, SectionHeading } from '../ui/Card';
import { Progress } from '../ui/Progress';
import { Tabs } from '../ui/Tabs';
import { useToast } from '../ui/Toast';
import { ChecklistFilters } from './ChecklistFilters';
import { ChecklistList } from './ChecklistList';
import { Configurator } from './Configurator';
import { cn } from '../../lib/utils';

type TabId = 'checklist' | 'configurador';

export function ChecklistModule({ embedded = false }: { embedded?: boolean }) {
  const { state, activeClient, permissions } = useAppStore();
  const { navigate } = useNavigation();
  const { push } = useToast();
  const [tab, setTab] = useState<TabId>('checklist');
  const [filters, setFilters] = useState<RequirementFilters>(() => toFilters(activeClient));

  useEffect(() => {
    setFilters(toFilters(activeClient));
    // Solo se reinicia cuando cambia el cliente activo, no al actualizar documentos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClient.id]);

  const items = useMemo(
    () => buildChecklist(activeClient, state.overrides, state.customRules, filters),
    [activeClient, state.overrides, state.customRules, filters],
  );

  const summary = useMemo(() => summarizeChecklist(items), [items]);
  const reuse = items.filter((item) => item.onbaseReuse).length;
  const pending = summary.missing + summary.expired + summary.rejected;
  const coverage = progressValue(summary);

  const handleUpdate = (item: ChecklistItem) => {
    navigate('cliente', {
      step: 2,
      uploadIntent: {
        clientId: activeClient.id,
        docCode: item.template.code,
        docName: item.template.name,
      },
    });
  };

  const handleRequest = (item: ChecklistItem) => {
    push({
      kind: 'success',
      title: 'Solicitud registrada',
      description: `Se notificó al cliente la necesidad de "${item.template.name}". Seguimiento en el expediente.`,
    });
  };

  const captureButton = (
    <Button
      variant="secondary"
      size="sm"
      icon={<ScanLine className="h-3.5 w-3.5" />}
      onClick={() => navigate('cliente', { step: 2 })}
    >
      Nueva captura
    </Button>
  );

  return (
    <div className="space-y-4">
      {!embedded && (
        <SectionHeading
          eyebrow="Checklist documental"
          title="Requisitos del expediente"
          description="Requisitos calculados según el perfil del cliente, con reutilización de documentos vigentes en OnBase."
          actions={captureButton}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          variant={embedded ? 'pill' : 'underline'}
          items={[
            { id: 'checklist', label: 'Checklist dinámico', icon: <ListChecks className="h-3.5 w-3.5" />, count: items.length },
            {
              id: 'configurador',
              label: 'Configurador',
              icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
              count: state.customRules.length,
            },
          ]}
          active={tab}
          onChange={(id) => setTab(id as TabId)}
        />
        {embedded && captureButton}
      </div>

      {tab === 'checklist' ? (
        <>
          <ChecklistFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(toFilters(activeClient))}
            requirementCount={items.length}
          />

          <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                Cobertura
              </span>
              <Progress
                value={coverage}
                height="h-1.5"
                className="w-24"
                tone={summary.status === 'vigente' ? 'success' : summary.status === 'parcial' ? 'warning' : 'danger'}
              />
              <span className="text-xs font-semibold tabular-nums text-brand-950">{coverage}%</span>
            </div>
            <SummaryStat label="Requisitos" value={items.length} />
            <SummaryStat label="Reutilizados OnBase" value={reuse} icon />
            <SummaryStat label="Pendientes" value={pending} tone={pending > 0 ? 'warning' : 'success'} />
            <span className="ml-auto hidden text-[10px] text-slate-400 sm:block">
              {summary.valid + summary.expiring} de {summary.total} requisitos cubiertos
            </span>
          </Card>

          <ChecklistList
            items={items}
            canUpload={permissions.upload}
            onView={(docCode) => navigate('cliente', { step: 5, focusDocCode: docCode })}
            onUpdate={handleUpdate}
            onRequest={handleRequest}
          />
        </>
      ) : (
        <Configurator />
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = 'neutral',
  icon = false,
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'warning' | 'success';
  icon?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <Database className="h-3 w-3 text-slate-400" />}
      <span className="text-[10px] text-slate-400">{label}</span>
      <span
        className={cn(
          'text-[12px] font-semibold tabular-nums',
          tone === 'warning' ? 'text-amber-700' : tone === 'success' ? 'text-emerald-700' : 'text-brand-950',
        )}
      >
        {value}
      </span>
    </div>
  );
}
