// src/modules/maintenance/hooks/useApproveQuote.ts
//
// RF-03/CA-06-03: owner/admin aprueban una cotización — open →
// in_progress, las demás quedan discarded. 409 QUOTE_ALREADY_APPROVED
// si el pedido ya tiene una aprobada (lo maneja la page vía onError).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '@/api/maintenance.api'

export function useApproveQuote(workOrderId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (quoteId: string) => maintenanceApi.approveQuote(quoteId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'detail', workOrderId] })
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'list'] })
    },
  })
}
