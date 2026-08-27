// src/modules/properties/hooks/useCreateNeighborhood.ts
//
// RF-05 + CA-01-07: alta de barrio. `name` único por organización
// (case-insensitive) → 409 CONFLICT (se maneja en el componente).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { neighborhoodsApi, type NeighborhoodCreate } from '@/api/neighborhoods.api'

export function useCreateNeighborhood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: NeighborhoodCreate) => neighborhoodsApi.create(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neighborhoods'] })
    },
  })
}
