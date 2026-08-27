// src/modules/properties/hooks/useUpdateNeighborhood.ts
//
// RF-05 + CA-01-07: rename del barrio. Mismo criterio de unicidad que el
// alta → 409 CONFLICT si el nuevo nombre ya existe (se maneja en el componente).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { neighborhoodsApi, type NeighborhoodUpdate } from '@/api/neighborhoods.api'

export function useUpdateNeighborhood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      neighborhoodId,
      payload,
    }: {
      neighborhoodId: string
      payload: NeighborhoodUpdate
    }) => neighborhoodsApi.update(neighborhoodId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neighborhoods'] })
    },
  })
}
