// src/modules/people/hooks/useLandlordsList.ts
import { useQuery } from '@tanstack/react-query'
import { peopleApi, type ListPageFilters } from '@/api/people.api'

export function useLandlordsList(filters: ListPageFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['people', 'landlords', 'list', filters],
    queryFn: ({ signal }) => peopleApi.listLandlords(filters, { signal }),
    staleTime: 5 * 60_000, // sdd_04 §1.4 — listados: 5 min
    enabled,
  })
}
