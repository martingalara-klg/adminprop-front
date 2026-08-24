// src/superadmin/modules/organizations/hooks/useOrganizationsList.ts
//
// RF-01 dashboard: listado con filtros de status y búsqueda por nombre/slug.
import { useQuery } from '@tanstack/react-query'
import { organizationsApi, type ListOrganizationsFilters } from '@/api/organizations.api'

export function useOrganizationsList(filters: ListOrganizationsFilters = {}) {
  return useQuery({
    queryKey: ['superadmin', 'organizations', 'list', filters],
    queryFn: ({ signal }) => organizationsApi.list(filters, { signal }),
    staleTime: 30_000,
    retry: false,
  })
}
