// src/modules/maintenance/pages/MaintenanceListPage.tsx
//
// CA-06-01: primera pantalla que el encargado usa a diario — listado
// con la dirección de la propiedad, filtrable por estado/propiedad.
// Gate por `work-order:read` (todos los roles con acceso al módulo lo
// tienen — owner/admin/maintenance). El alta sólo la ofrece a quien
// tiene `work-order:create` (owner/admin — RN-A01, el encargado NO crea
// pedidos).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Button, Spinner, ErrorState, EmptyState, ForbiddenState } from '@/shared/components'
import type { WorkOrderListFilters } from '@/api/maintenance.api'

import { WorkOrdersFilters } from '../components/WorkOrdersFilters'
import { WorkOrdersTable } from '../components/WorkOrdersTable'
import { useWorkOrdersList } from '../hooks/useWorkOrdersList'
import { usePropertyOptions } from '../hooks/usePropertyOptions'

export function MaintenanceListPage() {
  const canReadWorkOrders = usePermission('work-order:read')
  const canCreateWorkOrders = usePermission('work-order:create')

  const [filters, setFilters] = useState<WorkOrderListFilters>({})

  const workOrdersQuery = useWorkOrdersList(filters, canReadWorkOrders)
  const propertiesQuery = usePropertyOptions(canReadWorkOrders && canCreateWorkOrders)

  if (!canReadWorkOrders) {
    return (
      <ForbiddenState message="No tenés permiso para ver mantenimiento. Consultá con el owner de la organización." />
    )
  }

  function handleFilterChange(patch: Partial<WorkOrderListFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const properties = propertiesQuery.data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mantenimiento — Pedidos de reparación</h1>
        {canCreateWorkOrders ? (
          <Button asChild>
            <Link to="/maintenance/new">Nuevo pedido</Link>
          </Button>
        ) : null}
      </header>

      <section>
        <WorkOrdersFilters value={filters} properties={properties} onChange={handleFilterChange} />
      </section>

      <section>
        {workOrdersQuery.isLoading ? <Spinner label="Cargando pedidos..." /> : null}
        {workOrdersQuery.isError ? <ErrorState error={workOrdersQuery.error} /> : null}
        {workOrdersQuery.data && workOrdersQuery.data.data.length === 0 ? (
          <EmptyState
            title="No hay pedidos de reparación"
            description="Todavía no se cargó ningún pedido para los filtros aplicados."
          />
        ) : null}
        {workOrdersQuery.data && workOrdersQuery.data.data.length > 0 ? (
          <WorkOrdersTable workOrders={workOrdersQuery.data.data} />
        ) : null}
      </section>
    </div>
  )
}
