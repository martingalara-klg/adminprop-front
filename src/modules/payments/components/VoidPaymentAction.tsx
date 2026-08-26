// src/modules/payments/components/VoidPaymentAction.tsx
//
// RF-05 + CA-04-07: anulación lógica con motivo obligatorio, confirmación
// en dos pasos (mismo patrón que ContractLifecycleActions/
// ConfirmDeleteButton). `409 PAYMENT_ALREADY_VOIDED` se muestra inline
// si el operador intenta anular dos veces.
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { voidPaymentSchema, type VoidPaymentInput } from '../schemas/payment.schema'

type Props = {
  isVoided: boolean
  isSubmitting: boolean
  errorMessage: string | null
  onVoid: (values: VoidPaymentInput) => void
}

export function VoidPaymentAction({ isVoided, isSubmitting, errorMessage, onVoid }: Props) {
  const [isConfirming, setIsConfirming] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VoidPaymentInput>({
    resolver: zodResolver(voidPaymentSchema),
    defaultValues: { reason: '' },
  })

  if (isVoided) {
    return (
      <p className="text-sm font-medium text-destructive" role="status">
        Cobro anulado
      </p>
    )
  }

  if (!isConfirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setIsConfirming(true)}>
        Anular cobro
      </Button>
    )
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-destructive/40 p-4"
      onSubmit={handleSubmit(onVoid)}
      noValidate
    >
      <p className="text-sm font-medium">
        ¿Anular este cobro? El saldo del período se recompone y el cobro queda visible con marca
        de anulado.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="void-payment-reason">Motivo</Label>
        <Input
          id="void-payment-reason"
          aria-invalid={!!errors.reason}
          {...register('reason')}
        />
        {errors.reason ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.reason.message}
          </p>
        ) : null}
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={isSubmitting}>
          {isSubmitting ? 'Anulando…' : 'Confirmar anulación'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => setIsConfirming(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
