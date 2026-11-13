import { RotateCcw } from 'lucide-react';
import type { RequirementFilters } from '../../types';
import {
  GUARANTEE_OPTIONS,
  PERSON_TYPE_OPTIONS,
  PROCESS_OPTIONS,
  PRODUCT_OPTIONS,
  RISK_OPTIONS,
} from '../../lib/constants';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Select } from '../ui/Field';

interface Props {
  filters: RequirementFilters;
  onChange: (next: RequirementFilters) => void;
  onReset: () => void;
  requirementCount: number;
}

export function ChecklistFilters({ filters, onChange, onReset, requirementCount }: Props) {
  const update = <K extends keyof RequirementFilters>(key: K, value: RequirementFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <Card className="px-3 py-3">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
        <Select
          label="Persona"
          value={filters.personType}
          onChange={(event) => update('personType', event.target.value as RequirementFilters['personType'])}
          options={PERSON_TYPE_OPTIONS}
          wrapperClassName="sm:w-[148px]"
        />
        <Select
          label="Producto"
          value={filters.product}
          onChange={(event) => update('product', event.target.value as RequirementFilters['product'])}
          options={PRODUCT_OPTIONS}
          wrapperClassName="sm:w-[164px]"
        />
        <Select
          label="Riesgo PLAFT"
          value={filters.risk}
          onChange={(event) => update('risk', event.target.value as RequirementFilters['risk'])}
          options={RISK_OPTIONS}
          wrapperClassName="sm:w-[136px]"
        />
        <Select
          label="Proceso"
          value={filters.process}
          onChange={(event) => update('process', event.target.value as RequirementFilters['process'])}
          options={PROCESS_OPTIONS}
          wrapperClassName="sm:w-[136px]"
        />
        <Select
          label="Garantía"
          value={filters.guarantee}
          onChange={(event) => update('guarantee', event.target.value as RequirementFilters['guarantee'])}
          options={GUARANTEE_OPTIONS}
          wrapperClassName="sm:w-[136px]"
        />

        <div className="col-span-2 flex items-center justify-between gap-2 sm:ml-auto sm:col-span-1">
          <span className="text-[10px] text-slate-400">
            {requirementCount} requisito{requirementCount === 1 ? '' : 's'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onReset}
            title="Volver al perfil del cliente activo"
          >
            Restablecer
          </Button>
        </div>
      </div>
    </Card>
  );
}
