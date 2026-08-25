// src/modules/contracts/hooks/useCreateContract.ts
//
// RF-02 + CA-03-01/02/03: alta de contrato.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi, type ContractCreate } from '@/api/contracts.api'

export function useCreateContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ContractCreate) => contractsApi.create(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}
