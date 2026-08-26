// src/modules/contracts/hooks/useApplyAdjustment.ts
//
// RF-04 paso 4, CA-03-05: `pending → applied`. Sin optimistic update —
// es una operación financiera (state-management.md: "Nunca en
// financieras").
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi, type AdjustmentApplyRequest } from '@/api/contracts.api'

export function useApplyAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      adjustmentId,
      payload,
    }: {
      adjustmentId: string
      payload: AdjustmentApplyRequest
    }) => contractsApi.applyAdjustment(adjustmentId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}
