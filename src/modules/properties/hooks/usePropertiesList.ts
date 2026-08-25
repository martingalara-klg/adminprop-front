// src/modules/properties/hooks/usePropertiesList.ts
import { useQuery } from '@tanstack/react-query'
import { propertiesApi, type PropertyListFilters } from '@/api/properties.api'

export function usePropertiesList(filters: PropertyListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['properties', 'list', filters],
    queryFn: ({ signal }) => propertiesApi.list(filters, { signal }),
    staleTime: 5 * 60_000, // sdd_04 §1.4 — listados: 5 min
    enabled,
  })
}
