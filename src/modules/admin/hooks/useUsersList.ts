// src/modules/admin/hooks/useUsersList.ts
import { useQuery } from '@tanstack/react-query'
import { adminApi, type ListPageFilters } from '@/api/admin.api'

export function useUsersList(filters: ListPageFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'users', 'list', filters],
    queryFn: ({ signal }) => adminApi.listUsers(filters, { signal }),
    staleTime: 5 * 60_000, // sdd_04 §1.4 — listados: 5 min
  })
}
