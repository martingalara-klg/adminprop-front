// src/modules/settlements/hooks/useRegenerateSettlement.ts
//
// RF-03 + RN-L03: recalcula con datos corregidos (202, mismo polling de
// useSettlementDetail sobre el mismo id). `regenerated_count` viaja en
// el detalle (SettlementDetail), no en esta respuesta.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settlementsApi, type SettlementRegenerateRequest } from '@/api/settlements.api'

export function useRegenerateSettlement(settlementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SettlementRegenerateRequest) =>
      settlementsApi.regenerate(settlementId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements', 'detail', settlementId] })
      queryClient.invalidateQueries({ queryKey: ['settlements', 'list'] })
    },
  })
}
