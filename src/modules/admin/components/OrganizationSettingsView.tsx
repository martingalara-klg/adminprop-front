// src/modules/admin/components/OrganizationSettingsView.tsx
//
// Issue #66: modo lectura de la configuración de la organización.
import type { OrganizationSettingsData } from '@/api/admin.api'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  )
}

export function OrganizationSettingsView({ settings }: { settings: OrganizationSettingsData }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-md border p-4"
      data-testid="organization-settings-view"
    >
      <Field label="Día de gracia (mora)" value={String(settings.grace_day)} />
      <Field
        label="Aviso de vencimiento de contratos (días)"
        value={String(settings.contract_expiry_notice_days)}
      />
      <Field
        label="Nombre de la administradora (liquidaciones)"
        value={settings.billing_header?.name ?? ''}
      />
      <Field label="CUIT" value={settings.billing_header?.cuit ?? ''} />
      <Field label="Contacto" value={settings.billing_header?.contact ?? ''} />
    </div>
  )
}
