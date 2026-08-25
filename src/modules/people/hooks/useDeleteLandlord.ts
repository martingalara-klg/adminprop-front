// src/modules/people/hooks/useDeleteLandlord.ts
//
// RF-01 + CA-02-06: soft delete; `409 ENTITY_HAS_DEPENDENCIES` con
// propiedades activas (se maneja en el componente).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

export function useDeleteLandlord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (landlordId: string) => peopleApi.deleteLandlord(landlordId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', 'landlords'] })
    },
  })
}
