// src/modules/payments/pages/PaymentsListPage.tsx
//
// RF-02 — CA-04-01/02/03/04/05: panel de cobranzas del mes. Gate por
// `rent-period:read` (maintenance no lo tiene — RN-A01).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, EmptyState, ForbiddenState } from '@/shared/components'
import type { RentPeriodListFilters } from '@/api/payments.api'

import { RentPeriodsFilters } from '../components/RentPeriodsFilters'
import { RentPeriodsTable } from '../components/RentPeriodsTable'
import { useRentPeriodsList } from '../hooks/useRentPeriodsList'
import { usePropertyOptions } from '../hooks/usePropertyOptions'
import { useLandlordOptions } from '../hooks/useLandlordOptions'
import { useRenterOptions } from '../hooks/useRenterOptions'

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

export function PaymentsListPage() {
  const canReadRentPeriods = usePermission('rent-period:read')

  const [filters, setFilters] = useState<RentPeriodListFilters>({ period: currentPeriod() })

  const rentPeriodsQuery = useRentPeriodsList(filters, canReadRentPeriods)
  const propertiesQuery = usePropertyOptions(canReadRentPeriods)
  const landlordsQuery = useLandlordOptions(canReadRentPeriods)
  const rentersQuery = useRenterOptions(canReadRentPeriods)

  if (!canReadRentPeriods) {
    return (
      <ForbiddenState message="No tenés permiso para ver cobranzas. Consultá con el owner de la organización." />
    )
  }

  function handleFilterChange(patch: Partial<RentPeriodListFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const properties = propertiesQuery.data?.data ?? []
  const landlords = landlordsQuery.data?.data ?? []
  const renters = rentersQuery.data?.data ?? []

  const propertyLabels = Object.fromEntries(properties.map((p) => [p.id, p.address]))
  const renterLabels = Object.fromEntries(renters.map((r) => [r.id, r.name]))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Cobranzas — Panel del mes</h1>
        <Link
          to="/payments/debt"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Ver estado de deuda global
        </Link>
      </header>

      <section>
        <RentPeriodsFilters
          value={filters}
          properties={properties}
          landlords={landlords}
          renters={renters}
          onChange={handleFilterChange}
        />
      </section>

      <section>
        {rentPeriodsQuery.isLoading ? <Spinner label="Cargando alquileres del período..." /> : null}
        {rentPeriodsQuery.isError ? <ErrorState error={rentPeriodsQuery.error} /> : null}
        {rentPeriodsQuery.data && rentPeriodsQuery.data.data.length === 0 ? (
          <EmptyState title="No hay alquileres para los filtros aplicados" />
        ) : null}
        {rentPeriodsQuery.data && rentPeriodsQuery.data.data.length > 0 ? (
          <RentPeriodsTable
            rentPeriods={rentPeriodsQuery.data.data}
            propertyLabels={propertyLabels}
            renterLabels={renterLabels}
          />
        ) : null}
      </section>
    </div>
  )
}
