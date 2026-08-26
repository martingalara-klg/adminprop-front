// src/modules/settlements/hooks/useIssueSettlement.ts
//
// RF-03: draft → issued.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settlementsApi } from '@/api/settlements.api'

export function useIssueSettlement(settlementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => settlementsApi.issue(settlementId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements', 'detail', settlementId] })
      queryClient.invalidateQueries({ queryKey: ['settlements', 'list'] })
    },
  })
}
