// src/modules/people/hooks/useCreateRenter.ts
//
// RF-03: alta de inquilino.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { peopleApi, type RenterCreate } from '@/api/people.api'

export function useCreateRenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RenterCreate) => peopleApi.createRenter(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', 'renters'] })
    },
  })
}
