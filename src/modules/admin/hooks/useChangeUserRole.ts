// src/modules/admin/hooks/useChangeUserRole.ts
//
// RF-02 + CA-07-02: `422 LAST_OWNER_REQUIRED` si es el único owner activo.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type ChangeUserRoleRequest } from '@/api/admin.api'

export function useChangeUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: ChangeUserRoleRequest }) =>
      adminApi.changeUserRole(userId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
