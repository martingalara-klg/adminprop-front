// src/modules/settlements/components/wizard/SelectPeriodStep.tsx
//
// Wizard paso 1/4 — select_period: elegir propietario y período.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Label } from '@/shared/components'
import type { LandlordSummary } from '@/api/people.api'
import { selectPeriodSchema, type SelectPeriodInput } from '../../schemas/settlement.schema'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

type Props = {
  landlords: LandlordSummary[]
  isLoadingLandlords: boolean
  defaultValues?: Partial<SelectPeriodInput>
  onSubmit: (values: SelectPeriodInput) => void
}

export function SelectPeriodStep({
  landlords,
  isLoadingLandlords,
  defaultValues,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SelectPeriodInput>({
    resolver: zodResolver(selectPeriodSchema),
    defaultValues: {
      landlord_id: defaultValues?.landlord_id ?? '',
      period: defaultValues?.period ?? currentPeriod(),
    },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="text-base font-semibold">Paso 1 de 4 — Propietario y período</h2>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wizard-landlord">Propietario</Label>
        <select
          id="wizard-landlord"
          className={SELECT_CLASS}
          disabled={isLoadingLandlords}
          {...register('landlord_id')}
        >
          <option value="">Seleccioná un propietario</option>
          {landlords.map((landlord) => (
            <option key={landlord.id} value={landlord.id}>
              {landlord.name}
            </option>
          ))}
        </select>
        {errors.landlord_id ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.landlord_id.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wizard-period">Período</Label>
        <input
          id="wizard-period"
          type="month"
          className={SELECT_CLASS}
          max={currentPeriod()}
          {...register('period')}
        />
        {errors.period ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.period.message}
          </p>
        ) : null}
      </div>

      <div>
        <Button type="submit">Continuar</Button>
      </div>
    </form>
  )
}
