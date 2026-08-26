// src/modules/settlements/hooks/useCreateChargeEntry.ts
//
// RF-05: carga del importe mensual de un concepto recurrente.
// `409 CHARGE_ENTRY_ALREADY_EXISTS` si ya existe (el componente lo
// discrimina, ver ChargeVerificationChecklist).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chargesApi, type ChargeEntryCreate } from '@/api/charges.api'

export function useCreateChargeEntry(period: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      recurringChargeId,
      payload,
    }: {
      recurringChargeId: string
      payload: ChargeEntryCreate
    }) => chargesApi.createChargeEntry(recurringChargeId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements', 'charge-entries', period] })
    },
  })
}
