// src/modules/properties/hooks/useNeighborhoodsList.ts
//
// RF-05: catálogo de barrios de la organización, sin paginación (issue
// #99 back / #49 front). Reutilizado por el ABM (NeighborhoodsPage) y por
// el select del form de propiedad (PropertyForm/PropertyEditForm).
import { useQuery } from '@tanstack/react-query'
import { neighborhoodsApi } from '@/api/neighborhoods.api'

export function useNeighborhoodsList(enabled = true) {
  return useQuery({
    queryKey: ['neighborhoods', 'list'],
    queryFn: ({ signal }) => neighborhoodsApi.list({ signal }),
    staleTime: 5 * 60_000, // sdd_04 §1.4 — catálogos: 5 min
    enabled,
  })
}
