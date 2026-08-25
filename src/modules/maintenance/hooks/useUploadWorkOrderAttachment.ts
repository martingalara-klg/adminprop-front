// src/modules/maintenance/hooks/useUploadWorkOrderAttachment.ts
//
// RF-01/RF-04: fotos del pedido (alta o cierre) — mismo endpoint (RN-05).
// Invalida el detalle para refrescar `attachments[]`.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '@/api/maintenance.api'

export function useUploadWorkOrderAttachment(workOrderId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => maintenanceApi.uploadWorkOrderAttachment(workOrderId, file),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'detail', workOrderId] })
    },
  })
}
