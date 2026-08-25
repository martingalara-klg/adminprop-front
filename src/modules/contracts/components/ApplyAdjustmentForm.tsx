// src/modules/contracts/components/ApplyAdjustmentForm.tsx
//
// RF-04 paso 3/4 + CA-03-05: el operador ingresa el % manualmente
// (nunca automático — decisión #101). No hay endpoint de preview en
// sdd_03 §8 (sólo `POST /adjustments/:id/apply`, que ya aplica el
// ajuste) — el monto nuevo mostrado acá es SOLO indicativo, calculado
// sin floats (ver utils/adjustmentPreview.ts) y nunca se envía al
// backend. % negativo → diálogo de confirmación explícito antes de
// enviar (decisión #112).
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { formatMoney } from '@/shared/utils/format'
import { applyAdjustmentSchema, type ApplyAdjustmentInput } from '../schemas/contract.schema'
import { previewAdjustedAmount } from '../utils/adjustmentPreview'

type Props = {
  previousAmount: string | null
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: ApplyAdjustmentInput) => void
  onCancel: () => void
}

export function ApplyAdjustmentForm({
  previousAmount,
  errorMessage,
  isSubmitting,
  onSubmit,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ApplyAdjustmentInput>({
    resolver: zodResolver(applyAdjustmentSchema),
    defaultValues: { pct: '' },
  })

  const [pendingValues, setPendingValues] = useState<ApplyAdjustmentInput | null>(null)

  const pct = watch('pct')
  const isNegative = pct !== '' && !Number.isNaN(Number(pct)) && Number(pct) < 0
  const preview = previousAmount ? previewAdjustedAmount(previousAmount, pct) : null

  function handleValidSubmit(values: ApplyAdjustmentInput) {
    if (Number(values.pct) < 0) {
      // Decisión #112: % negativo exige confirmación explícita antes de enviar.
      setPendingValues(values)
      return
    }
    onSubmit(values)
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit(handleValidSubmit)} noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adjustment-pct">% de ajuste</Label>
          <Input id="adjustment-pct" aria-invalid={!!errors.pct} {...register('pct')} />
          {errors.pct ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.pct.message}
            </p>
          ) : null}
        </div>

        {preview ? (
          <p className="text-sm text-muted-foreground" data-testid="adjustment-preview">
            Monto nuevo estimado: {formatMoney(preview)} (indicativo — el backend recalcula el
            valor definitivo al aplicar).
          </p>
        ) : null}

        {isNegative && !pendingValues ? (
          <p className="text-sm text-amber-700" role="status">
            El porcentaje ingresado es negativo (deflación/renegociación). Se pedirá confirmación
            explícita antes de aplicar.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Aplicando…' : 'Aplicar ajuste'}
          </Button>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>

      {pendingValues ? (
        <div className="flex flex-col gap-3 rounded-md border border-amber-600/40 bg-amber-50 p-3">
          <p className="text-sm font-medium">
            Confirmás aplicar un ajuste negativo de {pendingValues.pct}%? Esto reduce el monto
            vigente del contrato.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => onSubmit(pendingValues)}
            >
              {isSubmitting ? 'Aplicando…' : 'Confirmar % negativo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setPendingValues(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
