// src/modules/maintenance/hooks/useAddQuote.ts
//
// RF-02/CA-06-02: el encargado (o admin) sube una cotización. No
// invalida `['work-orders', 'detail', workOrderId]` acá: la page sube
// las fotos de la cotización DESPUÉS de este mutate (necesita el id de
// la cotización recién creada) y recién ahí refetchea el detalle una
// sola vez (ver useCloseWorkOrder — mismo motivo).
import { useMutation } from '@tanstack/react-query'
import { maintenanceApi, type WorkOrderQuoteCreate } from '@/api/maintenance.api'

export function useAddQuote(workOrderId: string) {
  return useMutation({
    mutationFn: (payload: WorkOrderQuoteCreate) => maintenanceApi.addQuote(workOrderId, payload),
    retry: 0,
  })
}
