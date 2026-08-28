// src/modules/properties/hooks/useDeleteNeighborhood.ts
//
// RF-05 + CA-01-07: baja lógica del barrio; `409 ENTITY_HAS_DEPENDENCIES`
// si tiene propiedades asociadas (se maneja en el componente, mismo
// patrón que useDeleteProperty).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { neighborhoodsApi } from '@/api/neighborhoods.api'

export function useDeleteNeighborhood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (neighborhoodId: string) => neighborhoodsApi.remove(neighborhoodId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neighborhoods'] })
    },
  })
}
