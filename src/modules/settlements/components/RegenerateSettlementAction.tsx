// src/modules/settlements/components/RegenerateSettlementAction.tsx
//
// RF-03 + RN-L03: recalcula con datos corregidos; TC nuevo opcional (si
// no viene, se mantiene el de la liquidación). 202 + mismo polling que
// generate — el caller (SettlementDetailPage) ya está montado sobre
// useSettlementDetail, así que el polling arranca solo apenas
// `job_status` vuelve a pending/processing tras la mutation.
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import {
  regenerateSettlementSchema,
  type RegenerateSettlementInput,
} from '../schemas/settlement.schema'

type Props = {
  isSubmitting: boolean
  errorMessage: string | null
  onSubmit: (values: RegenerateSettlementInput) => void
}

export function RegenerateSettlementAction({ isSubmitting, errorMessage, onSubmit }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const { register, handleSubmit } = useForm<RegenerateSettlementInput>({
    resolver: zodResolver(regenerateSettlementSchema),
    defaultValues: { exchange_rate: '' },
  })

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        Regenerar
      </Button>
    )
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-md border p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <p className="text-sm font-medium">
        Recalcula con los datos corregidos (cobros anulados/agregados, cargos corregidos). Cada
        regeneración queda auditada.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="regenerate-exchange-rate">
          Nuevo tipo de cambio (opcional — se mantiene el actual si lo dejás vacío)
        </Label>
        <Input id="regenerate-exchange-rate" {...register('exchange_rate')} />
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Regenerando…' : 'Confirmar regeneración'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => setIsOpen(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
