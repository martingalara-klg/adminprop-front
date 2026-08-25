// src/modules/maintenance/hooks/useWorkOrderDetail.ts
//
// RF-02: ficha del pedido — cotizaciones + adjuntos en la misma
// respuesta (evita N+1 desde el frontend).
import { useQuery } from '@tanstack/react-query'
import { maintenanceApi } from '@/api/maintenance.api'

export function useWorkOrderDetail(workOrderId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['work-orders', 'detail', workOrderId],
    queryFn: ({ signal }) => maintenanceApi.get(workOrderId!, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!workOrderId,
  })
}
