// src/modules/contracts/components/DeleteContractAction.tsx
//
// Issue #86 (back#124, decisión #130 — RF-07/RN-C08): eliminar contrato,
// visible SOLO con el permiso atómico `contract:delete` (exclusivo de
// owner — mismo patrón de gating que `contract:terminate`, #56).
//
// Dos niveles de confirmación según el estado del contrato:
// - NO activo (draft/expired/terminated): confirmación de 2 pasos
//   existente (`ConfirmDeleteButton`, shared/components).
// - ACTIVO: confirmación FUERTE — modal que exige tipear la palabra
//   "ELIMINAR" para habilitar el botón destructivo, explicando las
//   consecuencias (se detiene la generación de meses futuros; los cobros
//   y liquidaciones ya emitidos se conservan; la propiedad vuelve a
//   estar disponible).
import { useState } from 'react'
import {
  Button,
  ConfirmDeleteButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@/shared/components'

export const DELETE_CONTRACT_CONFIRMATION_WORD = 'ELIMINAR'

type Props = {
  status: string
  canDelete: boolean
  isDeleting: boolean
  errorMessage: string | null
  onDelete: () => void
}

export function DeleteContractAction({
  status,
  canDelete,
  isDeleting,
  errorMessage,
  onDelete,
}: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [confirmationWord, setConfirmationWord] = useState('')

  if (!canDelete) return null

  // Contrato no activo: la baja no interrumpe ningún ciclo de cobro en
  // curso — alcanza la confirmación de 2 pasos estándar.
  if (status !== 'active') {
    return (
      <ConfirmDeleteButton
        label="Eliminar contrato"
        confirmQuestion="¿Eliminar este contrato? La baja es lógica: su historial se conserva."
        isSubmitting={isDeleting}
        errorMessage={errorMessage}
        onConfirm={onDelete}
      />
    )
  }

  const isConfirmationValid = confirmationWord.trim() === DELETE_CONTRACT_CONFIRMATION_WORD

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (open) setConfirmationWord('')
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground hover:text-destructive"
        >
          Eliminar contrato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar contrato activo</DialogTitle>
          <DialogDescription>
            Este contrato está activo. Al eliminarlo, se detiene la generación de meses futuros;
            los cobros y liquidaciones ya emitidos se conservan. La propiedad vuelve a estar
            disponible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="delete-contract-confirmation">
            Para confirmar, escribí {DELETE_CONTRACT_CONFIRMATION_WORD}
          </Label>
          <Input
            id="delete-contract-confirmation"
            autoComplete="off"
            value={confirmationWord}
            onChange={(event) => setConfirmationWord(event.target.value)}
          />
        </div>
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmationValid || isDeleting}
            onClick={onDelete}
          >
            {isDeleting ? 'Eliminando…' : 'Eliminar definitivamente'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => setIsDialogOpen(false)}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
