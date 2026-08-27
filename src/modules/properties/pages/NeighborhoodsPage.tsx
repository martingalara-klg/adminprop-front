// src/modules/properties/pages/NeighborhoodsPage.tsx
//
// RF-05 + CA-01-07: ABM del catálogo de barrios — subruta dentro del
// módulo Propiedades (issue #99 back / #49 front). Mismo criterio de
// permisos que `/properties`: lectura con `property:read`, alta/edición/
// baja con `property:manage` — sin permisos nuevos (decisión del PO).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import {
  Spinner,
  ErrorState,
  ForbiddenState,
  SuccessBanner,
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { NeighborhoodCreate } from '@/api/neighborhoods.api'

import { NeighborhoodForm } from '../components/NeighborhoodForm'
import { NeighborhoodsTable } from '../components/NeighborhoodsTable'
import { useNeighborhoodsList } from '../hooks/useNeighborhoodsList'
import { useCreateNeighborhood } from '../hooks/useCreateNeighborhood'
import { useUpdateNeighborhood } from '../hooks/useUpdateNeighborhood'
import { useDeleteNeighborhood } from '../hooks/useDeleteNeighborhood'

type RowError = { neighborhoodId: string; message: string } | null

export function NeighborhoodsPage() {
  const canReadNeighborhoods = usePermission('property:read')
  const canManageNeighborhoods = usePermission('property:manage')

  const neighborhoodsQuery = useNeighborhoodsList(canReadNeighborhoods)
  const createNeighborhood = useCreateNeighborhood()
  const updateNeighborhood = useUpdateNeighborhood()
  const deleteNeighborhood = useDeleteNeighborhood()

  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [rowError, setRowError] = useState<RowError>(null)

  if (!canReadNeighborhoods) {
    return (
      <ForbiddenState message="No tenés permiso para ver el catálogo de barrios. Consultá con el owner de la organización." />
    )
  }

  function handleCreate(values: NeighborhoodCreate) {
    setCreateError(null)
    createNeighborhood.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false)
        setCreateSuccess('Barrio creado correctamente.')
      },
      onError: (error) => setCreateError(resolveErrorMessage(error)),
    })
  }

  function handleRename(neighborhoodId: string, name: string) {
    setRowError(null)
    updateNeighborhood.mutate(
      { neighborhoodId, payload: { name } },
      {
        onError: (error) =>
          setRowError({ neighborhoodId, message: resolveErrorMessage(error) }),
      },
    )
  }

  function handleDelete(neighborhoodId: string) {
    setRowError(null)
    deleteNeighborhood.mutate(neighborhoodId, {
      onError: (error) => setRowError({ neighborhoodId, message: resolveErrorMessage(error) }),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Barrios</h1>
          <Link
            to="/properties"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Volver a propiedades
          </Link>
        </div>
        {canManageNeighborhoods ? (
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (open) setCreateError(null)
            }}
          >
            <DialogTrigger asChild>
              <Button type="button">Nuevo barrio</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo barrio</DialogTitle>
              </DialogHeader>
              <NeighborhoodForm
                errorMessage={createError}
                isSubmitting={createNeighborhood.isPending}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </header>

      {createSuccess ? <SuccessBanner message={createSuccess} /> : null}

      <section>
        {neighborhoodsQuery.isLoading ? <Spinner label="Cargando barrios..." /> : null}
        {neighborhoodsQuery.isError ? (
          <ErrorState message={resolveErrorMessage(neighborhoodsQuery.error)} />
        ) : null}
        {neighborhoodsQuery.data ? (
          <NeighborhoodsTable
            neighborhoods={neighborhoodsQuery.data.data}
            canManage={canManageNeighborhoods}
            isUpdating={updateNeighborhood.isPending}
            isDeleting={deleteNeighborhood.isPending}
            rowError={rowError}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ) : null}
      </section>
    </div>
  )
}
