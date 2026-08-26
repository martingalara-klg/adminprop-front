// src/modules/settlements/hooks/useUpdateChargeEntry.ts
//
// RN-D04: corrección auditada del importe/notas de un cargo ya cargado.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chargesApi, type ChargeEntryUpdate } from '@/api/charges.api'

export function useUpdateChargeEntry(period: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      chargeEntryId,
      payload,
    }: {
      chargeEntryId: string
      payload: ChargeEntryUpdate
    }) => chargesApi.updateChargeEntry(chargeEntryId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements', 'charge-entries', period] })
    },
  })
}
