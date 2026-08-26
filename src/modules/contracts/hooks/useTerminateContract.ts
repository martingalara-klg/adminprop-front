// src/modules/contracts/hooks/useTerminateContract.ts
//
// RF-03 + CA-03-08: `active → terminated` con motivo.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi, type ContractTerminateRequest } from '@/api/contracts.api'

export function useTerminateContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      contractId,
      payload,
    }: {
      contractId: string
      payload: ContractTerminateRequest
    }) => contractsApi.terminate(contractId, payload),
    retry: 0,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['contracts', 'detail', variables.contractId] })
    },
  })
}
