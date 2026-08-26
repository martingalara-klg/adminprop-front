// src/modules/settlements/hooks/useGenerateSettlement.ts
//
// Wizard paso confirmation: POST /settlements/generate → 202. El
// componente arranca el polling (useSettlementDetail) con el
// `settlement_id` devuelto acá — sin optimistic update (operación
// financiera, docs/skills/state-management.md §"Optimistic updates").
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settlementsApi, type SettlementGenerateRequest } from '@/api/settlements.api'

export function useGenerateSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SettlementGenerateRequest) => settlementsApi.generate(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements', 'list'] })
    },
  })
}
