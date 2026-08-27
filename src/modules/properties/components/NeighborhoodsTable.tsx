// src/modules/properties/components/NeighborhoodsTable.tsx
//
// RF-05 + CA-01-07: ABM del catálogo de barrios — listado con rename
// inline (mismo patrón que ServiceAccountsList) y baja con confirmación
// de 2 pasos (ConfirmDeleteButton). `empty`: sin barrios cargados todavía
// — CTA guía a crear el primero.
import { useState } from 'react'
import { Button, Input, Label, EmptyState, ConfirmDeleteButton } from '@/shared/components'
import type { NeighborhoodDetail } from '@/api/neighborhoods.api'

type RowError = { neighborhoodId: string; message: string } | null

type Props = {
  neighborhoods: NeighborhoodDetail[]
  canManage: boolean
  isUpdating: boolean
  isDeleting: boolean
  rowError: RowError
  onRename: (neighborhoodId: string, name: string) => void
  onDelete: (neighborhoodId: string) => void
}

export function NeighborhoodsTable({
  neighborhoods,
  canManage,
  isUpdating,
  isDeleting,
  rowError,
  onRename,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (neighborhoods.length === 0) {
    return (
      <EmptyState
        title="No hay barrios cargados"
        description="Creá el primer barrio para poder asignarlo a las propiedades."
      />
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Nombre</th>
          {canManage ? <th className="py-2 font-medium" /> : null}
        </tr>
      </thead>
      <tbody>
        {neighborhoods.map((neighborhood) =>
          editingId === neighborhood.id ? (
            <NeighborhoodRenameRow
              key={neighborhood.id}
              neighborhood={neighborhood}
              isUpdating={isUpdating}
              errorMessage={rowError?.neighborhoodId === neighborhood.id ? rowError.message : null}
              onCancel={() => setEditingId(null)}
              onSave={(name) => onRename(neighborhood.id, name)}
            />
          ) : (
            <tr key={neighborhood.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{neighborhood.name}</td>
              {canManage ? (
                <td className="py-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingId(neighborhood.id)}
                      >
                        Renombrar
                      </Button>
                      <ConfirmDeleteButton
                        label="Eliminar"
                        confirmQuestion={`¿Eliminar el barrio "${neighborhood.name}"?`}
                        isSubmitting={isDeleting}
                        errorMessage={
                          rowError?.neighborhoodId === neighborhood.id ? rowError.message : null
                        }
                        onConfirm={() => onDelete(neighborhood.id)}
                      />
                    </div>
                  </div>
                </td>
              ) : null}
            </tr>
          ),
        )}
      </tbody>
    </table>
  )
}

type RenameRowProps = {
  neighborhood: NeighborhoodDetail
  isUpdating: boolean
  errorMessage: string | null
  onCancel: () => void
  onSave: (name: string) => void
}

function NeighborhoodRenameRow({
  neighborhood,
  isUpdating,
  errorMessage,
  onCancel,
  onSave,
}: RenameRowProps) {
  const [name, setName] = useState(neighborhood.name)

  return (
    <tr className="border-b last:border-0 bg-muted/30">
      <td className="py-2 pr-4">
        <Label htmlFor={`rename-neighborhood-${neighborhood.id}`} className="sr-only">
          Nuevo nombre
        </Label>
        <Input
          id={`rename-neighborhood-${neighborhood.id}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </td>
      <td className="py-2">
        <div className="flex gap-2">
          <Button type="button" disabled={isUpdating} onClick={() => onSave(name)}>
            Guardar
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </td>
    </tr>
  )
}
