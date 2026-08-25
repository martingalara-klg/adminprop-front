// src/modules/admin/hooks/useInvitationsList.ts
import { useQuery } from '@tanstack/react-query'
import { adminApi, type ListPageFilters } from '@/api/admin.api'

export function useInvitationsList(filters: ListPageFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'invitations', 'list', filters],
    queryFn: ({ signal }) => adminApi.listInvitations(filters, { signal }),
    staleTime: 5 * 60_000, // sdd_04 §1.4 — listados: 5 min
    enabled,
  })
}
