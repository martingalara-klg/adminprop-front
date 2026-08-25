// src/modules/maintenance/hooks/useWorkOrdersList.ts
//
// RF-01/CA-06-01: listado de pedidos — maintenance ve TODOS los de la
// org (sdd_03 §12), owner/admin también.
import { useQuery } from '@tanstack/react-query'
import { maintenanceApi, type WorkOrderListFilters } from '@/api/maintenance.api'

export function useWorkOrdersList(filters: WorkOrderListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['work-orders', 'list', filters],
    queryFn: ({ signal }) => maintenanceApi.list(filters, { signal }),
    staleTime: 60_000,
    enabled,
  })
}
