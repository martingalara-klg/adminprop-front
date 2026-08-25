// src/modules/maintenance/hooks/useUploadQuoteAttachment.ts
//
// RF-02/CA-06-02: fotos de la cotización.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '@/api/maintenance.api'

export function useUploadQuoteAttachment(workOrderId: string, quoteId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => maintenanceApi.uploadQuoteAttachment(quoteId, file),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'detail', workOrderId] })
    },
  })
}
