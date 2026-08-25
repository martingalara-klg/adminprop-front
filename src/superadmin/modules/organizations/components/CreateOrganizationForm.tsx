// src/superadmin/modules/organizations/components/CreateOrganizationForm.tsx
//
// RF-02 + CA-00-01: alta de organización — name obligatorio, timezone con
// default America/Argentina/Cordoba (autogenera slug/roles/settings en el
// backend, en la misma transacción).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import {
  createOrganizationSchema,
  DEFAULT_ORGANIZATION_TIMEZONE,
  type CreateOrganizationInput,
} from '../schemas/organization.schema'

type Props = {
  onSubmit: (values: CreateOrganizationInput) => void
  isSubmitting?: boolean
  onCancel: () => void
}

export function CreateOrganizationForm({ onSubmit, isSubmitting = false, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '', timezone: DEFAULT_ORGANIZATION_TIMEZONE },
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-org-name">Nombre</Label>
        <Input id="new-org-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-org-timezone">Zona horaria</Label>
        <Input id="new-org-timezone" aria-invalid={!!errors.timezone} {...register('timezone')} />
        {errors.timezone ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.timezone.message}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear organización'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
