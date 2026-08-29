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
  Label,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { PropertyCreate, PropertyListFilters } from '@/api/properties.api'

import { PropertiesTabsNav } from '../components/PropertiesTabsNav'
import { PropertiesTable } from '../components/PropertiesTable'
import { PropertyForm } from '../components/PropertyForm'
import { usePropertiesList } from '../hooks/usePropertiesList'
import { useCreateProperty } from '../hooks/useCreateProperty'
import { useLandlordOptions } from '../hooks/useLandlordOptions'
import { useNeighborhoodsList } from '../hooks/useNeighborhoodsList'

export function PropertiesListPage() {
  const canReadProperties = usePermission('property:read')
  const canManageProperties = usePermission('property:manage')

  // issue #99/#49: filtro adicional por barrio (GET /properties?neighborhood_id=).
  const [filters, setFilters] = useState<PropertyListFilters>({})

  // idle/loading/error/empty/success — flow-implementation.md. `expired`
  // no aplica (sin tokens en este flujo).
  const propertiesQuery = usePropertiesList(filters, canReadProperties)
  const landlordsQuery = useLandlordOptions(canReadProperties)
  const neighborhoodsQuery = useNeighborhoodsList(canReadProperties)
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
  const neighborhoods = neighborhoodsQuery.data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Propiedades</h1>

      <div className="flex items-center justify-between">
        <PropertiesTabsNav />
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
                neighborhoods={neighborhoods}
                errorMessage={createError}
                isSubmitting={createProperty.isPending}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {createSuccess ? <SuccessBanner message={createSuccess} /> : null}

      <div className="flex flex-col gap-1.5 sm:w-64">
        <Label htmlFor="properties-neighborhood-filter">Filtrar por barrio</Label>
        <select
          id="properties-neighborhood-filter"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={filters.neighborhood_id ?? ''}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, neighborhood_id: event.target.value || undefined }))
          }
        >
          <option value="">Todos</option>
          {neighborhoods.map((neighborhood) => (
            <option key={neighborhood.id} value={neighborhood.id}>
              {neighborhood.name}
            </option>
          ))}
        </select>
      </div>

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
