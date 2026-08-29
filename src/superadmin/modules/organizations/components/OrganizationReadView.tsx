// src/superadmin/modules/organizations/components/OrganizationReadView.tsx
//
// Issue #66: modo lectura de los datos editables de la organización
// (superadmin) — slug/status no viven acá (son inmutables/ver acciones
// de estado aparte).
import type { OrganizationDetail } from '@/api/organizations.api'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  )
}

export function OrganizationReadView({ organization }: { organization: OrganizationDetail }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4" data-testid="organization-read-view">
      <Field label="Nombre" value={organization.name} />
      <Field label="Zona horaria" value={organization.timezone} />
    </div>
  )
}
