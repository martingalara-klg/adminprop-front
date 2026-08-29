// src/superadmin/modules/organizations/components/OrganizationEditForm.tsx
//
// sdd_03 §2 (issue #44): PATCH name?/timezone? — slug inmutable, status
// solo vía disable/enable (no forma parte de este form).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import {
  updateOrganizationSchema,
  type UpdateOrganizationInput,
} from '../schemas/organization.schema'
import type { OrganizationDetail } from '@/api/organizations.api'

type Props = {
  organization: OrganizationDetail
  onSubmit: (values: UpdateOrganizationInput) => void
  isSubmitting?: boolean
  // Issue #66: presente cuando el form vive dentro de un EditableSection.
  onCancel?: () => void
}

export function OrganizationEditForm({
  organization,
  onSubmit,
  isSubmitting = false,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { name: organization.name, timezone: organization.timezone },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-org-name">Nombre</Label>
        <Input id="edit-org-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-org-timezone">Zona horaria</Label>
        <Input id="edit-org-timezone" aria-invalid={!!errors.timezone} {...register('timezone')} />
        {errors.timezone ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.timezone.message}
          </p>
        ) : null}
      </div>

      {errors.root ? (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
