// src/modules/people/hooks/useDeleteRenter.ts
//
// RF-03 + CA-02-06: soft delete; `409 ENTITY_HAS_DEPENDENCIES` con
// contrato vigente (se maneja en el componente).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

export function useDeleteRenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (renterId: string) => peopleApi.deleteRenter(renterId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', 'renters'] })
    },
  })
}
