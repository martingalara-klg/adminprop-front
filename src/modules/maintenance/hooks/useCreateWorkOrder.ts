// src/modules/maintenance/hooks/useCreateWorkOrder.ts
//
// RF-01/CA-06-01: alta del pedido (owner/admin). Invalida el listado y
// el historial de la propiedad (Módulo 1 RF-03) — la ficha de la
// propiedad muestra el nuevo pedido en su historial.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi, type WorkOrderCreate } from '@/api/maintenance.api'

export function useCreateWorkOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: WorkOrderCreate) => maintenanceApi.create(payload),
    retry: 0,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'list'] })
      queryClient.invalidateQueries({
        queryKey: ['properties', 'work-orders', variables.property_id],
      })
    },
  })
}
