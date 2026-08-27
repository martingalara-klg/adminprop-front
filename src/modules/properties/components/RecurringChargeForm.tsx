// src/modules/properties/components/RecurringChargeForm.tsx
//
// Issue #48: form de alta de concepto recurrente extraído de
// `PropertyRecurringCharges` (que ahora sólo lista) para poder vivir en
// un modal — mismo form, misma lógica, sin cambios de comportamiento.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import {
  createRecurringChargeSchema,
  RECURRING_CHARGE_TYPE_OPTIONS,
  CHARGE_TYPE_LABELS,
  type CreateRecurringChargeInput,
} from '../schemas/property.schema'

type Props = {
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreateRecurringChargeInput) => void
}

export function RecurringChargeForm({ errorMessage, isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRecurringChargeInput>({
    resolver: zodResolver(createRecurringChargeSchema),
    defaultValues: { charge_type: 'rentas', label: '' },
  })

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={handleSubmit((values) => {
        onSubmit(values)
        reset()
      })}
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recurring-charge-type">Tipo</Label>
        <select
          id="recurring-charge-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          {...register('charge_type')}
        >
          {RECURRING_CHARGE_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {CHARGE_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recurring-charge-label">Etiqueta</Label>
        <Input id="recurring-charge-label" aria-invalid={!!errors.label} {...register('label')} />
        {errors.label ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.label.message}
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Agregar concepto'}
        </Button>
      </div>
    </form>
  )
}
