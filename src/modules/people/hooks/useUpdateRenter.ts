// src/modules/people/hooks/useUpdateRenter.ts
//
// RF-03: edición de datos de contacto del inquilino.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { peopleApi, type RenterUpdate } from '@/api/people.api'

export function useUpdateRenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ renterId, payload }: { renterId: string; payload: RenterUpdate }) =>
      peopleApi.updateRenter(renterId, payload),
    retry: 0,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['people', 'renters', 'list'] })
      queryClient.invalidateQueries({
        queryKey: ['people', 'renters', 'detail', variables.renterId],
      })
    },
  })
}
