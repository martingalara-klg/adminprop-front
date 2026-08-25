// src/modules/maintenance/components/CancelWorkOrderAction.tsx
//
// RF-05/CA-06-07: owner/admin cancelan un pedido open/in_progress con
// motivo obligatorio, con confirmación en 2 pasos (mismo patrón que
// ConfirmDeleteButton). Un pedido closed ya liquidado no puede
// cancelarse (`422 WORK_ORDER_ALREADY_SETTLED`, mensaje vía
// errorMessage — la page no limpia el estado de confirmación para que
// el usuario vea el motivo en contexto).
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { cancelWorkOrderSchema, type CancelWorkOrderInput } from '../schemas/maintenance.schema'

type Props = {
  errorMessage: string | null
  isSubmitting: boolean
  onConfirm: (values: CancelWorkOrderInput) => void
}

export function CancelWorkOrderAction({ errorMessage, isSubmitting, onConfirm }: Props) {
  const [isConfirming, setIsConfirming] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelWorkOrderInput>({
    resolver: zodResolver(cancelWorkOrderSchema),
    defaultValues: { reason: '' },
  })

  if (!isConfirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setIsConfirming(true)}>
        Cancelar pedido
      </Button>
    )
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-destructive/40 p-4"
      onSubmit={handleSubmit(onConfirm)}
      noValidate
    >
      <p className="text-sm font-medium">¿Cancelar este pedido de reparación?</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cancel-reason">Motivo</Label>
        <Input id="cancel-reason" aria-invalid={!!errors.reason} {...register('reason')} />
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
          {isSubmitting ? 'Cancelando…' : 'Confirmar cancelación'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => setIsConfirming(false)}
        >
          Volver
        </Button>
      </div>
    </form>
  )
}
