// src/modules/properties/components/PropertyRecurringCharges.tsx
//
// RF-03 + CA-01-05: "Conceptos recurrentes activos (rentas, muni) — link
// al Módulo 5". Solo lectura + alta del concepto en esta ficha; la carga
// mensual de importes (spec_module_05, liquidaciones UI) es #14 y queda
// fuera de este issue.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label, EmptyState } from '@/shared/components'
import type { RecurringChargeDetail } from '@/api/properties.api'
import {
  createRecurringChargeSchema,
  RECURRING_CHARGE_TYPE_OPTIONS,
  type CreateRecurringChargeInput,
} from '../schemas/property.schema'

const CHARGE_TYPE_LABELS: Record<string, string> = {
  rentas: 'Rentas',
  municipalidad: 'Municipalidad',
  otro: 'Otro',
}

type Props = {
  charges: RecurringChargeDetail[]
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreateRecurringChargeInput) => void
}

export function PropertyRecurringCharges({ charges, errorMessage, isSubmitting, onSubmit }: Props) {
  const activeCharges = charges.filter((charge) => charge.is_active)

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
    <div className="flex flex-col gap-4">
      {activeCharges.length === 0 ? (
        <EmptyState
          title="Sin conceptos recurrentes activos"
          description="Los importes mensuales se cargan desde el módulo de liquidaciones."
        />
      ) : (
        <table className="w-full text-sm" data-testid="property-recurring-charges">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Tipo</th>
              <th className="py-2 font-medium">Etiqueta</th>
            </tr>
          </thead>
          <tbody>
            {activeCharges.map((charge) => (
              <tr key={charge.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{CHARGE_TYPE_LABELS[charge.charge_type] ?? charge.charge_type}</td>
                <td className="py-2">{charge.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form
        className="flex flex-col gap-3 rounded-md border p-4"
        onSubmit={handleSubmit((values) => {
          onSubmit(values)
          reset()
        })}
        noValidate
      >
        <h4 className="text-sm font-medium">Nuevo concepto recurrente</h4>

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
          <Input
            id="recurring-charge-label"
            aria-invalid={!!errors.label}
            {...register('label')}
          />
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
    </div>
  )
}
