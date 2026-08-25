// src/modules/admin/hooks/useDeactivateUser.ts
//
// RF-02 + CA-07-02: desactiva (soft) un miembro. `422 LAST_OWNER_REQUIRED`
// si es el único owner activo.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin.api'

export function useDeactivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => adminApi.deactivateUser(userId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
