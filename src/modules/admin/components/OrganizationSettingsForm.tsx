// src/modules/admin/components/OrganizationSettingsForm.tsx
//
// RF-04 + CA-07-05: `grace_day`, `contract_expiry_notice_days` y
// encabezado de liquidaciones. `readOnly` cubre el caso defensivo de una
// sesión sin `organization:configure` que de todos modos llegue a
// renderizar el form (no debería — ver AdminSettingsPage/RequirePermission).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import type { OrganizationSettingsData } from '@/api/admin.api'
import {
  organizationSettingsSchema,
  type OrganizationSettingsInput,
} from '../schemas/admin.schema'

type Props = {
  settings: OrganizationSettingsData
  errorMessage: string | null
  isSubmitting: boolean
  readOnly?: boolean
  onSubmit: (values: OrganizationSettingsInput) => void
}

export function OrganizationSettingsForm({
  settings,
  errorMessage,
  isSubmitting,
  readOnly = false,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationSettingsInput>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      grace_day: settings.grace_day,
      contract_expiry_notice_days: settings.contract_expiry_notice_days,
      billing_name: settings.billing_header?.name ?? '',
      billing_cuit: settings.billing_header?.cuit ?? '',
      billing_contact: settings.billing_header?.contact ?? '',
    },
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-grace-day">Día de gracia (mora)</Label>
        <Input
          id="settings-grace-day"
          type="number"
          min={1}
          max={28}
          disabled={readOnly}
          aria-invalid={!!errors.grace_day}
          {...register('grace_day')}
        />
        {errors.grace_day ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.grace_day.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-notice-days">Aviso de vencimiento de contratos (días)</Label>
        <Input
          id="settings-notice-days"
          type="number"
          min={7}
          max={365}
          disabled={readOnly}
          aria-invalid={!!errors.contract_expiry_notice_days}
          {...register('contract_expiry_notice_days')}
        />
        {errors.contract_expiry_notice_days ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.contract_expiry_notice_days.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-billing-name">Nombre de la administradora (liquidaciones)</Label>
        <Input id="settings-billing-name" disabled={readOnly} {...register('billing_name')} />
        {errors.billing_name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.billing_name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-billing-cuit">CUIT</Label>
        <Input id="settings-billing-cuit" disabled={readOnly} {...register('billing_cuit')} />
        {errors.billing_cuit ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.billing_cuit.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-billing-contact">Contacto</Label>
        <Input
          id="settings-billing-contact"
          disabled={readOnly}
          {...register('billing_contact')}
        />
        {errors.billing_contact ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.billing_contact.message}
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {readOnly ? null : (
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      )}
    </form>
  )
}
