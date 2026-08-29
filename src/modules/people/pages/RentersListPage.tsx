// src/modules/people/pages/RentersListPage.tsx
//
// RF-03 — CA-02-06: listado de inquilinos + alta. Gate por `renter:read`
// (CA-02-07/RN-A01).
import { useState } from 'react'
import { usePermission } from '@/shared/auth/usePermission'
import {
  Spinner,
  ErrorState,
  EmptyState,
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
import type { RenterCreate } from '@/api/people.api'

import { PeopleTabsNav } from '../components/PeopleTabsNav'
import { RentersTable } from '../components/RentersTable'
import { RenterForm } from '../components/RenterForm'
import { useRentersList } from '../hooks/useRentersList'
import { useCreateRenter } from '../hooks/useCreateRenter'

export function RentersListPage() {
  const canReadRenters = usePermission('renter:read')
  const canManageRenters = usePermission('renter:manage')

  const rentersQuery = useRentersList({}, canReadRenters)
  const createRenter = useCreateRenter()

  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  if (!canReadRenters) {
    return (
      <ForbiddenState message="No tenés permiso para ver inquilinos. Consultá con el owner de la organización." />
    )
  }

  function handleCreate(values: RenterCreate) {
    setCreateError(null)
    createRenter.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false)
        setCreateSuccess('Inquilino creado correctamente.')
      },
      onError: (error) => setCreateError(resolveErrorMessage(error)),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Personas</h1>

      <section className="flex items-center justify-between">
        <PeopleTabsNav />
        {canManageRenters ? (
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (open) setCreateError(null)
            }}
          >
            <DialogTrigger asChild>
              <Button type="button">Nuevo inquilino</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo inquilino</DialogTitle>
              </DialogHeader>
              <RenterForm
                errorMessage={createError}
                isSubmitting={createRenter.isPending}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </section>

      {createSuccess ? <SuccessBanner message={createSuccess} /> : null}

      <section>
        {rentersQuery.isLoading ? <Spinner label="Cargando inquilinos..." /> : null}
        {rentersQuery.isError ? (
          <ErrorState message={resolveErrorMessage(rentersQuery.error)} />
        ) : null}
        {rentersQuery.data && rentersQuery.data.data.length === 0 ? (
          <EmptyState title="No hay inquilinos registrados" />
        ) : null}
        {rentersQuery.data && rentersQuery.data.data.length > 0 ? (
          <RentersTable renters={rentersQuery.data.data} />
        ) : null}
      </section>
    </div>
  )
}
