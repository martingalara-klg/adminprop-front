// src/modules/people/components/ConfirmDeleteButton.tsx
//
// CA-02-06: la baja es lógica (soft delete) pero irreversible desde la UI
// — pide confirmación explícita en 2 pasos (mismo patrón que
// OrganizationStatusChangeAction) antes de disparar el DELETE. Si el
// backend responde `409 ENTITY_HAS_DEPENDENCIES`, el mensaje llega vía
// `errorMessage` (mapa es-AR, ver error-codes.es-AR.ts) y NO limpia el
// estado de confirmación, para que el usuario vea el motivo en contexto.
import { useState } from 'react'
import { Button } from '@/shared/components'

type Props = {
  label: string
  confirmQuestion: string
  isSubmitting?: boolean
  errorMessage?: string | null
  onConfirm: () => void
}

export function ConfirmDeleteButton({
  label,
  confirmQuestion,
  isSubmitting = false,
  errorMessage = null,
  onConfirm,
}: Props) {
  const [isConfirming, setIsConfirming] = useState(false)

  if (!isConfirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setIsConfirming(true)}>
        {label}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-destructive/40 p-4">
      <p className="text-sm font-medium">{confirmQuestion}</p>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          disabled={isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting ? 'Eliminando…' : 'Confirmar eliminación'}
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
