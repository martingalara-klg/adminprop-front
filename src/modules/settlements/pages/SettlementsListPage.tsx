// src/modules/settlements/pages/SettlementsListPage.tsx
//
// RF-01: listado de liquidaciones con filtros (period/landlord_id/
// status). Accesos a "Cargos del mes" y "Nueva liquidación" (gateados
// por sus propios permisos — charge:manage / settlement:generate).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Button, Spinner, ErrorState, EmptyState, ForbiddenState } from '@/shared/components'
import type { SettlementListFilters } from '@/api/settlements.api'

import { SettlementsFilters } from '../components/SettlementsFilters'
import { SettlementsTable } from '../components/SettlementsTable'
import { useSettlementsList } from '../hooks/useSettlementsList'
import { useLandlordOptions } from '../hooks/useLandlordOptions'

export function SettlementsListPage() {
  const canReadSettlements = usePermission('settlement:read')
  const canManageCharges = usePermission('charge:manage')
  const canGenerate = usePermission('settlement:generate')

  const [filters, setFilters] = useState<SettlementListFilters>({})

  const settlementsQuery = useSettlementsList(filters, canReadSettlements)
  const landlordsQuery = useLandlordOptions(canReadSettlements)

  if (!canReadSettlements) {
    return (
      <ForbiddenState message="No tenés permiso para ver liquidaciones. Consultá con el owner de la organización." />
    )
  }

  function handleFilterChange(patch: Partial<SettlementListFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const landlords = landlordsQuery.data?.data ?? []
  const landlordLabels = Object.fromEntries(landlords.map((l) => [l.id, l.name]))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Liquidaciones</h1>
        <div className="flex gap-2">
          {canManageCharges ? (
            <Link to="/settlements/charges">
              <Button type="button" variant="outline">
                Cargos del mes
              </Button>
            </Link>
          ) : null}
          {canGenerate ? (
            <Link to="/settlements/new">
              <Button type="button">Nueva liquidación</Button>
            </Link>
          ) : null}
        </div>
      </header>

      <section>
        <SettlementsFilters value={filters} landlords={landlords} onChange={handleFilterChange} />
      </section>

      <section>
        {settlementsQuery.isLoading ? <Spinner label="Cargando liquidaciones..." /> : null}
        {settlementsQuery.isError ? <ErrorState error={settlementsQuery.error} /> : null}
        {settlementsQuery.data && settlementsQuery.data.data.length === 0 ? (
          <EmptyState
            title="Sin liquidaciones"
            description="No hay liquidaciones generadas con estos filtros."
          />
        ) : null}
        {settlementsQuery.data && settlementsQuery.data.data.length > 0 ? (
          <SettlementsTable
            settlements={settlementsQuery.data.data}
            landlordLabels={landlordLabels}
          />
        ) : null}
      </section>
    </div>
  )
}
