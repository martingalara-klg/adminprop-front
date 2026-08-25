// src/modules/payments/pages/DebtPage.tsx
//
// RF-06 — CA-04-09: vista GLOBAL de deuda (`GET /debt`), filtrable por
// propietario/inquilino/antigüedad. No duplica la ficha de deuda del
// inquilino (`GET /renters/:id/debt`, ya en people/RenterDetailPage —
// #9) — ésta es la vista de gestión de morosos de toda la cartera
// (UC-10).
import { useState } from 'react'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, ForbiddenState } from '@/shared/components'
import type { DebtListFilters } from '@/api/payments.api'

import { DebtFilters } from '../components/DebtFilters'
import { DebtTable } from '../components/DebtTable'
import { useDebtList } from '../hooks/useDebtList'
import { usePropertyOptions } from '../hooks/usePropertyOptions'
import { useLandlordOptions } from '../hooks/useLandlordOptions'
import { useRenterOptions } from '../hooks/useRenterOptions'

export function DebtPage() {
  const canReadRentPeriods = usePermission('rent-period:read')

  const [filters, setFilters] = useState<DebtListFilters>({})

  const debtQuery = useDebtList(filters, canReadRentPeriods)
  const propertiesQuery = usePropertyOptions(canReadRentPeriods)
  const landlordsQuery = useLandlordOptions(canReadRentPeriods)
  const rentersQuery = useRenterOptions(canReadRentPeriods)

  if (!canReadRentPeriods) {
    return (
      <ForbiddenState message="No tenés permiso para ver el estado de deuda. Consultá con el owner de la organización." />
    )
  }

  function handleFilterChange(patch: Partial<DebtListFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const properties = propertiesQuery.data?.data ?? []
  const landlords = landlordsQuery.data?.data ?? []
  const renters = rentersQuery.data?.data ?? []

  const propertyLabels = Object.fromEntries(properties.map((p) => [p.id, p.address]))
  const landlordLabels = Object.fromEntries(landlords.map((l) => [l.id, l.name]))
  const renterLabels = Object.fromEntries(renters.map((r) => [r.id, r.name]))

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">Estado de deuda</h1>
      </header>

      <section>
        <DebtFilters
          value={filters}
          landlords={landlords}
          renters={renters}
          onChange={handleFilterChange}
        />
      </section>

      <section>
        {debtQuery.isLoading ? <Spinner label="Cargando estado de deuda..." /> : null}
        {debtQuery.isError ? <ErrorState error={debtQuery.error} /> : null}
        {debtQuery.data ? (
          <DebtTable
            entries={debtQuery.data.data}
            propertyLabels={propertyLabels}
            landlordLabels={landlordLabels}
            renterLabels={renterLabels}
          />
        ) : null}
      </section>
    </div>
  )
}
