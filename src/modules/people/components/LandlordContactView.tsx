// src/modules/people/components/LandlordContactView.tsx
//
// Issue #66: modo lectura de los datos de contacto del propietario.
import type { LandlordDetail } from '@/api/people.api'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  )
}

export function LandlordContactView({ landlord }: { landlord: LandlordDetail }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4" data-testid="landlord-contact-view">
      <Field label="Nombre" value={landlord.name} />
      <Field label="CUIT/DNI" value={landlord.tax_id ?? ''} />
      <Field label="Teléfono" value={landlord.phone ?? ''} />
      <Field label="Email" value={landlord.email ?? ''} />
      <Field label="Datos bancarios (CBU)" value={landlord.bank_info ?? ''} />
      <Field label="Notas" value={landlord.notes ?? ''} />
    </div>
  )
}
