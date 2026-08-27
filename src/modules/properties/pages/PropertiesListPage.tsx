// src/modules/properties/pages/PropertiesListPage.tsx
//
// RF-01 — CA-01-01: listado de propiedades + alta. Gate por
// `property:read` (CA-01-06): `maintenance` no lo tiene — el backend
// rechazaría con 403/404, así que la página ni dispara el request (ver
// ForbiddenState).
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
import type { PropertyCreate } from '@/api/properties.api'

import { PropertiesTable } from '../components/PropertiesTable'
import { PropertyForm } from '../components/PropertyForm'
import { usePropertiesList } from '../hooks/usePropertiesList'
import { useCreateProperty } from '../hooks/useCreateProperty'
import { useLandlordOptions } from '../hooks/useLandlordOptions'

export function PropertiesListPage() {
  const canReadProperties = usePermission('property:read')
  const canManageProperties = usePermission('property:manage')

  // idle/loading/error/empty/success — flow-implementation.md. `expired`
  // no aplica (sin tokens en este flujo).
  const propertiesQuery = usePropertiesList({}, canReadProperties)
  const landlordsQuery = useLandlordOptions(canReadProperties)
  const createProperty = useCreateProperty()

  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  if (!canReadProperties) {
    return (
      <ForbiddenState message="No tenés permiso para ver propiedades. Consultá con el owner de la organización." />
    )
  }

  function handleCreate(values: PropertyCreate) {
    setCreateError(null)
    createProperty.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false)
        setCreateSuccess('Propiedad creada correctamente.')
      },
      onError: (error) => setCreateError(resolveErrorMessage(error)),
    })
  }

  const landlords = landlordsQuery.data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Propiedades</h1>
        {canManageProperties ? (
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (open) setCreateError(null)
            }}
          >
            <DialogTrigger asChild>
              <Button type="button">Nueva propiedad</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva propiedad</DialogTitle>
              </DialogHeader>
              <PropertyForm
                landlords={landlords}
                errorMessage={createError}
                isSubmitting={createProperty.isPending}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </header>

      {createSuccess ? <SuccessBanner message={createSuccess} /> : null}

      <section>
        {propertiesQuery.isLoading ? <Spinner label="Cargando propiedades..." /> : null}
        {propertiesQuery.isError ? (
          <ErrorState message={resolveErrorMessage(propertiesQuery.error)} />
        ) : null}
        {propertiesQuery.data && propertiesQuery.data.data.length === 0 ? (
          <EmptyState title="No hay propiedades registradas" />
        ) : null}
        {propertiesQuery.data && propertiesQuery.data.data.length > 0 ? (
          <PropertiesTable properties={propertiesQuery.data.data} landlords={landlords} />
        ) : null}
      </section>
    </div>
  )
}
