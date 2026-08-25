// src/modules/people/pages/LandlordsListPage.tsx
//
// RF-01/RF-02 — CA-02-01/04: listado de propietarios + alta. Gate por
// `landlord:read` (CA-02-07/RN-A01): `maintenance` no lo tiene — el
// backend rechazaría con 403/404, así que la página ni dispara el
// request (ver ForbiddenState).
import { useState } from 'react'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, EmptyState, ForbiddenState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { LandlordCreate } from '@/api/people.api'

import { PeopleTabsNav } from '../components/PeopleTabsNav'
import { LandlordsTable } from '../components/LandlordsTable'
import { LandlordForm } from '../components/LandlordForm'
import { useLandlordsList } from '../hooks/useLandlordsList'
import { useCreateLandlord } from '../hooks/useCreateLandlord'

export function LandlordsListPage() {
  const canReadLandlords = usePermission('landlord:read')
  const canManageLandlords = usePermission('landlord:manage')

  // idle/loading/error/empty/success — flow-implementation.md. `expired`
  // no aplica (sin tokens en este flujo).
  const landlordsQuery = useLandlordsList({}, canReadLandlords)
  const createLandlord = useCreateLandlord()

  const [createError, setCreateError] = useState<string | null>(null)

  if (!canReadLandlords) {
    return (
      <ForbiddenState message="No tenés permiso para ver propietarios. Consultá con el owner de la organización." />
    )
  }

  function handleCreate(values: LandlordCreate) {
    setCreateError(null)
    createLandlord.mutate(values, {
      onError: (error) => setCreateError(resolveErrorMessage(error)),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Personas</h1>
        <PeopleTabsNav />
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Propietarios</h2>
        {landlordsQuery.isLoading ? <Spinner label="Cargando propietarios..." /> : null}
        {landlordsQuery.isError ? (
          <ErrorState message={resolveErrorMessage(landlordsQuery.error)} />
        ) : null}
        {landlordsQuery.data && landlordsQuery.data.data.length === 0 ? (
          <EmptyState title="No hay propietarios registrados" />
        ) : null}
        {landlordsQuery.data && landlordsQuery.data.data.length > 0 ? (
          <LandlordsTable landlords={landlordsQuery.data.data} />
        ) : null}
      </section>

      {canManageLandlords ? (
        <section>
          <LandlordForm
            errorMessage={createError}
            isSubmitting={createLandlord.isPending}
            onSubmit={handleCreate}
          />
        </section>
      ) : null}
    </div>
  )
}
