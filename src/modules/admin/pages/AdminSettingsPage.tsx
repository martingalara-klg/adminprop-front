// src/modules/admin/pages/AdminSettingsPage.tsx
//
// RF-04 — CA-07-04/05: `GET/PUT /organization/settings` requieren
// `organization:configure` (solo owner, sdd_03 §4 + spec_data_model.md
// línea 583: el admin NO tiene este permiso — ni para leer ni para
// escribir). Un admin que navegue directo a esta ruta ve el mismo
// "acceso restringido" que el backend le daría con 403 FORBIDDEN — nunca
// un formulario de solo lectura con datos que el backend nunca le
// entregaría.
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { AdminPropApiError } from '@/api/errors'

import { ForbiddenState } from '../components/ForbiddenState'
import { OrganizationSettingsForm } from '../components/OrganizationSettingsForm'
import { useOrganizationSettings } from '../hooks/useOrganizationSettings'
import { useUpdateOrganizationSettings } from '../hooks/useUpdateOrganizationSettings'
import type { OrganizationSettingsInput } from '../schemas/admin.schema'

export function AdminSettingsPage() {
  const canConfigure = usePermission('organization:configure')
  const settingsQuery = useOrganizationSettings(canConfigure)
  const updateSettings = useUpdateOrganizationSettings()

  if (!canConfigure) {
    return (
      <ForbiddenState message="Solo el owner puede ver y editar la configuración de la organización." />
    )
  }

  if (settingsQuery.isLoading) return <Spinner label="Cargando configuración..." />
  if (settingsQuery.isError) {
    return <ErrorState message={resolveErrorMessage(settingsQuery.error)} />
  }
  if (!settingsQuery.data) return null

  function handleSubmit(values: OrganizationSettingsInput) {
    updateSettings.mutate({
      grace_day: values.grace_day,
      contract_expiry_notice_days: values.contract_expiry_notice_days,
      billing_name: values.billing_name || null,
      billing_cuit: values.billing_cuit || null,
      billing_contact: values.billing_contact || null,
    })
  }

  const errorMessage =
    updateSettings.error instanceof AdminPropApiError
      ? resolveErrorMessage(updateSettings.error)
      : null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Configuración de la organización</h1>
      <OrganizationSettingsForm
        settings={settingsQuery.data.data}
        errorMessage={errorMessage}
        isSubmitting={updateSettings.isPending}
        onSubmit={handleSubmit}
      />
      {updateSettings.isSuccess ? (
        <p className="text-sm text-muted-foreground" role="status">
          Cambios guardados. El nuevo día de gracia rige desde ahora — no recalcula intereses ya
          imputados.
        </p>
      ) : null}
    </div>
  )
}
