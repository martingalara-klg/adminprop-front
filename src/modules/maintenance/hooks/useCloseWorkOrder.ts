// src/modules/maintenance/hooks/useCloseWorkOrder.ts
//
// RF-04/CA-06-04: el encargado (o admin) marca el trabajo terminado.
// 409 WORK_ORDER_ALREADY_CLOSED si ya estaba cerrado (lo maneja la page
// vía onError). Invalida también el historial de la propiedad (Módulo 1)
// porque `final_cost`/`closed_at` cambian ahí.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi, type WorkOrderCloseRequest } from '@/api/maintenance.api'

export function useCloseWorkOrder(workOrderId: string, propertyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: WorkOrderCloseRequest) => maintenanceApi.close(workOrderId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'detail', workOrderId] })
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['properties', 'work-orders', propertyId] })
    },
  })
}
