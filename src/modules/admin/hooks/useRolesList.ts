// src/modules/admin/hooks/useRolesList.ts
//
// RF-03: los 3 roles de sistema. Solo lectura en MVP (sin endpoint de
// escritura) — ver AdminRolesPage.
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin.api'

export function useRolesList() {
  return useQuery({
    queryKey: ['admin', 'roles', 'list'],
    queryFn: ({ signal }) => adminApi.listRoles({ signal }),
    staleTime: 5 * 60_000,
  })
}
