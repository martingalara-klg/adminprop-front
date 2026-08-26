// src/modules/settlements/components/IssueSettlementAction.tsx
//
// RF-03: draft → issued, con confirmación explícita (operación
// financiera irreversible desde la UI — mismo patrón en 2 pasos que
// ConfirmDeleteButton).
import { useState } from 'react'
import { Button } from '@/shared/components'

type Props = {
  isSubmitting: boolean
  errorMessage: string | null
  onConfirm: () => void
}

export function IssueSettlementAction({ isSubmitting, errorMessage, onConfirm }: Props) {
  const [isConfirming, setIsConfirming] = useState(false)

  if (!isConfirming) {
    return (
      <Button type="button" onClick={() => setIsConfirming(true)}>
        Emitir liquidación
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <p className="text-sm font-medium">
        ¿Emitir esta liquidación? Queda formalmente emitida — igual podés regenerarla después si
        hace falta corregirla (RN-L03).
      </p>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" disabled={isSubmitting} onClick={onConfirm}>
          {isSubmitting ? 'Emitiendo…' : 'Confirmar emisión'}
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
    </div>
  )
}
