// src/modules/settlements/components/wizard/ExchangeRateStep.tsx
//
// Wizard paso 3/4 — exchange_rate: sólo se llega acá si el backend
// respondió `400 SETTLEMENT_EXCHANGE_RATE_REQUIRED` al confirmar
// (RN-L06 — el propietario tiene montos USD en el período). El error se
// muestra explícito para que quede claro por qué el wizard "retrocedió".
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Label, MoneyInput } from '@/shared/components'
import { exchangeRateSchema, type ExchangeRateInput } from '../../schemas/settlement.schema'

type Props = {
  errorMessage: string | null
  isSubmitting: boolean
  onBack: () => void
  onSubmit: (values: ExchangeRateInput) => void
}

export function ExchangeRateStep({ errorMessage, isSubmitting, onBack, onSubmit }: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ExchangeRateInput>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: { exchange_rate: '' },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="text-base font-semibold">Paso 3 de 4 — Tipo de cambio</h2>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert" data-testid="exchange-rate-required-error">
          {errorMessage}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          El propietario tiene cobros o alquileres en USD en este período. Ingresá el tipo de
          cambio para convertir esos montos a ARS (RN-L06).
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wizard-exchange-rate">Tipo de cambio (ARS/USD)</Label>
        <Controller
          control={control}
          name="exchange_rate"
          render={({ field }) => (
            <MoneyInput
              id="wizard-exchange-rate"
              decimalPrecision={4}
              aria-invalid={!!errors.exchange_rate}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {errors.exchange_rate ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.exchange_rate.message}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Volver
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Generando…' : 'Continuar'}
        </Button>
      </div>
    </form>
  )
}
