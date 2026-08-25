// src/modules/maintenance/hooks/useCancelWorkOrder.ts
//
// RF-05/CA-06-07: owner/admin cancelan un pedido open/in_progress con
// motivo. 422 WORK_ORDER_ALREADY_SETTLED si ya liquidado (lo maneja la
// page vía onError).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi, type WorkOrderCancelRequest } from '@/api/maintenance.api'

export function useCancelWorkOrder(workOrderId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: WorkOrderCancelRequest) => maintenanceApi.cancel(workOrderId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'detail', workOrderId] })
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'list'] })
    },
  })
}
