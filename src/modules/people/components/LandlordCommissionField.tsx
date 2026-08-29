// src/modules/people/components/LandlordCommissionField.tsx
//
// CA-02-02: "un admin puede editar los datos de contacto ... pero recibe
// 403 FORBIDDEN al intentar cambiar su % de comisión; el owner puede
// cambiarlo y el cambio queda auditado". La UI refleja esto SIN esperar
// el 403: gatea por `landlord:set-commission` (usePermission, nunca
// `role_name`, CLAUDE.md §4). Sin el permiso, el valor se ve pero sin
// ningún control de edición (ni input, ni botón) — es la lectura para un
// admin con `landlord:manage`.
//
// Si el backend igual respondiera 403 (bug de permisos, red, etc.), el
// mensaje del mapa es-AR (`errorMessage`) se muestra igual — no se
// asume que la UI es la única barrera.
//
// Issue #66: modo lectura por defecto — el owner ve el % como texto y
// un botón "Editar" (gateado por `landlord:set-commission` vía
// `EditableSection`); Guardar vuelve a lectura, Cancelar descarta.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label, EditableSection } from '@/shared/components'
import { formatPercent } from '@/shared/utils/format'
import {
  updateLandlordCommissionSchema,
  type UpdateLandlordCommissionInput,
} from '../schemas/people.schema'

type Props = {
  commissionPct: string
  errorMessage: string | null
  isSubmitting: boolean
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSubmit: (values: UpdateLandlordCommissionInput) => void
}

export function LandlordCommissionField({
  commissionPct,
  errorMessage,
  isSubmitting,
  isEditing,
  onEdit,
  onCancel,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateLandlordCommissionInput>({
    resolver: zodResolver(updateLandlordCommissionSchema),
    defaultValues: { commission_pct: Number(commissionPct) },
  })

  return (
    <EditableSection
      title="% de comisión"
      permission="landlord:set-commission"
      isEditing={isEditing}
      onEdit={onEdit}
      testId="landlord-commission-section"
      view={
        <div className="flex flex-col gap-1.5 rounded-md border p-4">
          <span className="text-lg font-semibold" data-testid="landlord-commission-readonly">
            {formatPercent(commissionPct)}
          </span>
          <p className="text-xs text-muted-foreground">
            Solo el owner puede cambiar el % de comisión.
          </p>
        </div>
      }
    >
      <form
        className="flex flex-col gap-3 rounded-md border p-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Label htmlFor="landlord-commission-edit">% de comisión</Label>
        <div className="flex items-center gap-2">
          <Input
            id="landlord-commission-edit"
            type="number"
            step="0.01"
            min={0}
            max={100}
            className="w-32"
            aria-invalid={!!errors.commission_pct}
            {...register('commission_pct')}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Actualizar comisión'}
          </Button>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
        {errors.commission_pct ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.commission_pct.message}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          El cambio rige para liquidaciones futuras y queda auditado (valor anterior y nuevo).
        </p>
      </form>
    </EditableSection>
  )
}
