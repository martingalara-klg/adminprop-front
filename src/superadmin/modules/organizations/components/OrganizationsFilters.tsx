// src/superadmin/modules/organizations/components/OrganizationsFilters.tsx
//
// spec_module_00_superadmin.md §RF-01: "Filtros por status y búsqueda por
// nombre/slug." Presentacional puro — recibe value, emite onChange.
import { Input, Label } from '@/shared/components'

export type OrganizationsFilterValue = { status: string; search: string }

type Props = {
  value: OrganizationsFilterValue
  onChange: (value: OrganizationsFilterValue) => void
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending_owner', label: 'Pendiente de owner' },
  { value: 'active', label: 'Activa' },
  { value: 'disabled', label: 'Deshabilitada' },
]

export function OrganizationsFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="organizations-search">Buscar</Label>
        <Input
          id="organizations-search"
          type="search"
          placeholder="Nombre o slug…"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="organizations-status">Estado</Label>
        <select
          id="organizations-status"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
