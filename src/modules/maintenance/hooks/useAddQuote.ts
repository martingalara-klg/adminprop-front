// src/modules/maintenance/hooks/useAddQuote.ts
//
// RF-02/CA-06-02: el encargado (o admin) sube una cotización.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi, type WorkOrderQuoteCreate } from '@/api/maintenance.api'

export function useAddQuote(workOrderId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: WorkOrderQuoteCreate) => maintenanceApi.addQuote(workOrderId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'detail', workOrderId] })
    },
  })
}
