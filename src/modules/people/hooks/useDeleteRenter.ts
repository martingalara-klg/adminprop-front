// src/modules/people/hooks/useDeleteRenter.ts
//
// RF-03 + CA-02-06: soft delete; `422 ENTITY_HAS_ACTIVE_CONTRACT` con
// contrato vigente (issue #86/back#124 — reemplaza el 409
// ENTITY_HAS_DEPENDENCIES de este caso; se maneja en el componente).
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
