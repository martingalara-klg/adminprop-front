// src/modules/people/hooks/useRentersList.ts
import { useQuery } from '@tanstack/react-query'
import { peopleApi, type ListPageFilters } from '@/api/people.api'

export function useRentersList(filters: ListPageFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['people', 'renters', 'list', filters],
    queryFn: ({ signal }) => peopleApi.listRenters(filters, { signal }),
    staleTime: 5 * 60_000,
    enabled,
  })
}
