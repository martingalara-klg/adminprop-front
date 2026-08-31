// src/modules/people/components/RenterContactView.tsx
//
// Issue #66: modo lectura de los datos de contacto del inquilino.
import type { RenterDetail } from '@/api/people.api'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  )
}

export function RenterContactView({ renter }: { renter: RenterDetail }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4" data-testid="renter-contact-view">
      <Field label="Nombre" value={renter.name} />
      <Field label="CUIT/DNI" value={renter.tax_id ?? ''} />
      <Field label="Teléfono" value={renter.phone ?? ''} />
      <Field label="Email" value={renter.email ?? ''} />
      <Field label="Notas" value={renter.notes ?? ''} />
    </div>
  )
}
